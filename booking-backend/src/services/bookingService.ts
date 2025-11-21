import { createHash } from 'crypto';
import { BookingRepository } from '../repositories/bookingRepository';
import { RoomRepository } from '../repositories/roomRepository';
import { BlackoutRepository } from '../repositories/blackoutRepository';
import { BookingAuditRepository } from '../repositories/bookingAuditRepository';
import { MsGraphBookingService } from './msGraphBookingService';
import { ApplicationError, ValidationError } from '../common/errors';
import { BookingStatus } from '../common/types';
import { logger } from '../common/logger';

export interface CreateBookingInput {
  roomId: number;
  userId: number;
  startTs: Date;
  endTs: Date;
  title?: string | null;
  attendees?: string[];
  idempotencyKey?: string | null;
}

export class BookingService {
  constructor(
    private readonly bookingRepository = new BookingRepository(),
    private readonly roomRepository = new RoomRepository(),
    private readonly blackoutRepository = new BlackoutRepository(),
    private readonly auditRepository = new BookingAuditRepository(),
    private readonly graphService = new MsGraphBookingService(),
  ) {}

  async createBooking(input: CreateBookingInput): Promise<{ booking: Awaited<ReturnType<BookingRepository['findById']>>; isNew: boolean }> {
    const normalizedStart = new Date(input.startTs);
    const normalizedEnd = new Date(input.endTs);
    if (Number.isNaN(normalizedStart.getTime()) || Number.isNaN(normalizedEnd.getTime())) {
      throw new ValidationError('Invalid start or end time provided');
    }

    const effectiveKey = this.resolveIdempotencyKey({
      ...input,
      startTs: normalizedStart,
      endTs: normalizedEnd,
    });

    // Check idempotency first (including auto-generated keys)
    const existing = await this.bookingRepository.findByIdempotencyKey(effectiveKey, input.userId);
    if (existing) {
      logger.info('Idempotent booking request', { idempotencyKey: effectiveKey, bookingId: existing.id });
      return { booking: existing, isNew: false };
    }

    // Validate time range
    if (normalizedEnd <= normalizedStart) {
      throw new ValidationError('End time must be after start time');
    }

    // Check room exists and is active
    const room = await this.roomRepository.findByIdOrThrow(input.roomId);
    if (!room.active) {
      throw new ApplicationError('ROOM_INACTIVE', 'Room is not available for booking', 400);
    }

    // Check capacity
    const attendeeCount = (input.attendees?.length || 0) + 1; // +1 for the booker
    if (attendeeCount > room.capacity) {
      throw new ValidationError(`Booking exceeds room capacity of ${room.capacity}`, {
        capacity: room.capacity,
        attendeeCount,
      });
    }

    // Check blackouts
    const blackouts = await this.blackoutRepository.checkOverlap(input.roomId, normalizedStart, normalizedEnd);
    if (blackouts.length > 0) {
      throw new ApplicationError(
        'BLACKOUT_VIOLATION',
        'Booking overlaps with blackout window',
        409,
        { blackouts: blackouts.map((b) => ({ id: b.id, start: b.startTs, end: b.endTs })) },
      );
    }

    // Create booking (conflict check happens inside repository with transaction)
    try {
      const booking = await this.bookingRepository.create({
        roomId: input.roomId,
        userId: input.userId,
        startTs: normalizedStart,
        endTs: normalizedEnd,
        status: 'CONFIRMED',
        title: input.title || null,
        attendees: input.attendees || [],
        idempotencyKey: effectiveKey,
      });

      // Create audit entry
      await this.auditRepository.create({
        bookingId: booking.id,
        action: 'CREATED',
        actorId: input.userId,
        notes: `Booking created for room ${room.name}`,
      });

      // Enqueue MS Graph sync
      try {
        await this.graphService.enqueueBookingSync(booking.id, 'create');
      } catch (error) {
        logger.error('Failed to enqueue Graph sync', { bookingId: booking.id }, { error });
        // Don't fail the booking creation if sync fails
      }

      logger.info('Booking created', { bookingId: booking.id, roomId: input.roomId, userId: input.userId });

      return { booking, isNew: true };
    } catch (error) {
      if (this.isIdempotencyViolation(error)) {
        const duplicate = await this.bookingRepository.findByIdempotencyKey(effectiveKey, input.userId);
        if (duplicate) {
          logger.info('Duplicate booking detected via idempotency key', {
            bookingId: duplicate.id,
            idempotencyKey: effectiveKey,
          });
          return { booking: duplicate, isNew: false };
        }
      }
      throw error;
    }
  }

  async cancelBooking(bookingId: number, userId: number, isAdmin: boolean): Promise<Awaited<ReturnType<BookingRepository['findById']>>> {
    const booking = await this.bookingRepository.findByIdOrThrow(bookingId);

    // Check authorization
    if (!isAdmin && booking.userId !== userId) {
      throw new ApplicationError('FORBIDDEN', 'You can only cancel your own bookings', 403);
    }

    // Check if booking can be cancelled (e.g., before start time)
    const now = new Date();
    if (booking.startTs <= now) {
      throw new ApplicationError('CANCEL_TOO_LATE', 'Cannot cancel booking that has already started', 400);
    }

    // Cancel booking
    const cancelled = await this.bookingRepository.cancel(bookingId);

    // Create audit entry
    await this.auditRepository.create({
      bookingId: bookingId,
      action: 'CANCELLED',
      actorId: userId,
      notes: `Booking cancelled${isAdmin ? ' by admin' : ''}`,
    });

    // Enqueue MS Graph sync for deletion
    try {
      await this.graphService.enqueueBookingSync(bookingId, 'delete');
    } catch (error) {
      logger.error('Failed to enqueue Graph sync', { bookingId }, { error });
      // Don't fail the cancellation if sync fails
    }

    logger.info('Booking cancelled', { bookingId, userId });

    return cancelled;
  }

  async getBooking(bookingId: number, userId: number, isAdmin: boolean): Promise<Awaited<ReturnType<BookingRepository['findById']>>> {
    const booking = await this.bookingRepository.findByIdOrThrow(bookingId);

    // Check authorization
    if (!isAdmin && booking.userId !== userId) {
      throw new ApplicationError('FORBIDDEN', 'You can only view your own bookings', 403);
    }

    return booking;
  }

  async listBookings(filters: {
    userId?: number;
    roomId?: number;
    startDate?: string;
    endDate?: string;
    status?: BookingStatus;
  }): Promise<Awaited<ReturnType<BookingRepository['search']>>> {
    return this.bookingRepository.search(filters);
  }

  private resolveIdempotencyKey(params: {
    roomId: number;
    userId: number;
    startTs: Date;
    endTs: Date;
    title?: string | null;
    attendees?: string[];
    idempotencyKey?: string | null;
  }): string {
    if (params.idempotencyKey && params.idempotencyKey.trim().length > 0) {
      return params.idempotencyKey.trim();
    }

    const payload = [
      params.userId,
      params.roomId,
      params.startTs.toISOString(),
      params.endTs.toISOString(),
      (params.title || '').trim(),
      ...(params.attendees || []).map((attendee) => attendee.trim()).sort(),
    ].join('|');

    return `auto-${createHash('sha256').update(payload).digest('hex')}`;
  }

  private isIdempotencyViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const code = (error as { code?: string }).code;
    const detail = (error as { detail?: string }).detail ?? '';

    if (code !== '23505') {
      return false;
    }

    return detail.includes('idempotency_key') || detail.includes('idx_bookings_idempotency_key');
  }
}


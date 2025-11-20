import { PoolClient } from 'pg';
import { query, withTransaction } from '../common/db';
import { NotFoundError, ApplicationError } from '../common/errors';
import { BookingStatus } from '../common/types';

export interface Booking {
  id: number;
  roomId: number;
  userId: number;
  startTs: Date;
  endTs: Date;
  status: BookingStatus;
  title: string | null;
  attendees: string[];
  idempotencyKey: string | null;
  externalEventId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BookingRow {
  id: number;
  room_id: number;
  user_id: number;
  start_ts: Date;
  end_ts: Date;
  status: string;
  title: string | null;
  attendees: unknown;
  idempotency_key: string | null;
  external_event_id: string | null;
  created_at: Date;
  updated_at: Date;
}

const mapBooking = (row: BookingRow): Booking => ({
  id: row.id,
  roomId: row.room_id,
  userId: row.user_id,
  startTs: row.start_ts,
  endTs: row.end_ts,
  status: row.status as BookingStatus,
  title: row.title,
  attendees: Array.isArray(row.attendees) ? row.attendees : typeof row.attendees === 'string' ? JSON.parse(row.attendees) : [],
  idempotencyKey: row.idempotency_key,
  externalEventId: row.external_event_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface BookingSearchFilters {
  userId?: number;
  roomId?: number;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  status?: BookingStatus;
}

export class BookingRepository {
  async findById(id: number): Promise<Booking | null> {
    const result = await query<BookingRow>(
      `
      SELECT id, room_id, user_id, start_ts, end_ts, status, title, attendees, idempotency_key, external_event_id, created_at, updated_at
      FROM bookings
      WHERE id = $1
      `,
      [id],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapBooking(result.rows[0]);
  }

  async findByIdOrThrow(id: number): Promise<Booking> {
    const booking = await this.findById(id);
    if (!booking) {
      throw new NotFoundError('Booking not found', { bookingId: id });
    }
    return booking;
  }

  async findByIdempotencyKey(idempotencyKey: string, userId: number): Promise<Booking | null> {
    const result = await query<BookingRow>(
      `
      SELECT id, room_id, user_id, start_ts, end_ts, status, title, attendees, idempotency_key, external_event_id, created_at, updated_at
      FROM bookings
      WHERE idempotency_key = $1 AND user_id = $2
      LIMIT 1
      `,
      [idempotencyKey, userId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapBooking(result.rows[0]);
  }

  /**
   * Check for conflicting bookings using SELECT FOR UPDATE to prevent race conditions.
   * This must be called within a transaction.
   */
  async checkConflicts(
    client: PoolClient,
    roomId: number,
    startTs: Date,
    endTs: Date,
    excludeBookingId?: number,
  ): Promise<Booking[]> {
    const conditions: string[] = [
      'room_id = $1',
      'status = $2',
      'start_ts < $4 AND end_ts > $3', // Overlap condition
    ];
    const params: unknown[] = [roomId, 'CONFIRMED', startTs, endTs];

    if (excludeBookingId) {
      conditions.push('id != $5');
      params.push(excludeBookingId);
    }

    const result = await client.query<BookingRow>(
      `
      SELECT id, room_id, user_id, start_ts, end_ts, status, title, attendees, idempotency_key, external_event_id, created_at, updated_at
      FROM bookings
      WHERE ${conditions.join(' AND ')}
      FOR UPDATE
      `,
      params,
    );

    return result.rows.map(mapBooking);
  }

  async search(filters: BookingSearchFilters = {}): Promise<Booking[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.userId !== undefined) {
      conditions.push(`user_id = $${paramIndex}`);
      params.push(filters.userId);
      paramIndex++;
    }

    if (filters.roomId !== undefined) {
      conditions.push(`room_id = $${paramIndex}`);
      params.push(filters.roomId);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.startDate) {
      conditions.push(`start_ts >= $${paramIndex}::timestamptz`);
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      conditions.push(`end_ts <= $${paramIndex}::timestamptz`);
      params.push(filters.endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query<BookingRow>(
      `
      SELECT id, room_id, user_id, start_ts, end_ts, status, title, attendees, idempotency_key, external_event_id, created_at, updated_at
      FROM bookings
      ${whereClause}
      ORDER BY start_ts DESC
      `,
      params,
    );

    return result.rows.map(mapBooking);
  }

  /**
   * Get availability for a room within a time range.
   * Returns time slots that are available (not booked and not blacked out).
   */
  async getAvailability(roomId: number, startTs: Date, endTs: Date): Promise<Array<{ start: Date; end: Date; available: boolean }>> {
    // This is a simplified version - in production, you might want to return
    // granular time slots (e.g., 30-minute intervals)
    const result = await query<{ start_ts: Date; end_ts: Date }>(
      `
      SELECT start_ts, end_ts
      FROM bookings
      WHERE room_id = $1
        AND status = 'CONFIRMED'
        AND start_ts < $3
        AND end_ts > $2
      ORDER BY start_ts ASC
      `,
      [roomId, startTs, endTs],
    );

    // For now, return the booked slots
    // A full implementation would calculate available slots between bookings
    return result.rows.map((row) => ({
      start: row.start_ts,
      end: row.end_ts,
      available: false,
    }));
  }

  async create(booking: {
    roomId: number;
    userId: number;
    startTs: Date;
    endTs: Date;
    status?: BookingStatus;
    title?: string | null;
    attendees?: string[];
    idempotencyKey?: string | null;
    externalEventId?: string | null;
  }): Promise<Booking> {
    return withTransaction(async (client) => {
      // Check for conflicts with row-level lock
      const conflicts = await this.checkConflicts(client, booking.roomId, booking.startTs, booking.endTs);

      if (conflicts.length > 0) {
        throw new ApplicationError(
          'BOOKING_CONFLICT',
          'Booking conflicts with existing booking',
          409,
          { conflicts: conflicts.map((c) => ({ id: c.id, start: c.startTs, end: c.endTs })) },
        );
      }

      const result = await client.query<BookingRow>(
        `
        INSERT INTO bookings (room_id, user_id, start_ts, end_ts, status, title, attendees, idempotency_key, external_event_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
        RETURNING id, room_id, user_id, start_ts, end_ts, status, title, attendees, idempotency_key, external_event_id, created_at, updated_at
        `,
        [
          booking.roomId,
          booking.userId,
          booking.startTs,
          booking.endTs,
          booking.status || 'CONFIRMED',
          booking.title || null,
          JSON.stringify(booking.attendees || []),
          booking.idempotencyKey || null,
          booking.externalEventId || null,
        ],
      );

      return mapBooking(result.rows[0]);
    });
  }

  async update(id: number, updates: {
    status?: BookingStatus;
    title?: string | null;
    attendees?: string[];
    externalEventId?: string | null;
  }): Promise<Booking> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex}`);
      params.push(updates.status);
      paramIndex++;
    }

    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex}`);
      params.push(updates.title);
      paramIndex++;
    }

    if (updates.attendees !== undefined) {
      fields.push(`attendees = $${paramIndex}::jsonb`);
      params.push(JSON.stringify(updates.attendees));
      paramIndex++;
    }

    if (updates.externalEventId !== undefined) {
      fields.push(`external_event_id = $${paramIndex}`);
      params.push(updates.externalEventId);
      paramIndex++;
    }

    if (fields.length === 0) {
      return this.findByIdOrThrow(id);
    }

    params.push(id);
    const result = await query<BookingRow>(
      `
      UPDATE bookings
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, room_id, user_id, start_ts, end_ts, status, title, attendees, idempotency_key, external_event_id, created_at, updated_at
      `,
      params,
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Booking not found', { bookingId: id });
    }

    return mapBooking(result.rows[0]);
  }

  async cancel(id: number): Promise<Booking> {
    return this.update(id, { status: 'CANCELLED' });
  }
}


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
  // Room information (from JOIN)
  room_name?: string | null;
  room_capacity?: number | null;
  room_location?: string | null;
}

const mapBooking = (row: BookingRow): Booking & { roomName?: string | null; roomCapacity?: number | null; roomLocation?: string | null } => ({
  id: typeof row.id === 'number' ? row.id : Number(row.id),
  roomId: typeof row.room_id === 'number' ? row.room_id : Number(row.room_id),
  userId: typeof row.user_id === 'number' ? row.user_id : Number(row.user_id),
  startTs: row.start_ts,
  endTs: row.end_ts,
  status: row.status as BookingStatus,
  title: row.title,
  attendees: Array.isArray(row.attendees) ? row.attendees : typeof row.attendees === 'string' ? JSON.parse(row.attendees) : [],
  idempotencyKey: row.idempotency_key,
  externalEventId: row.external_event_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  // Include room information if available
  roomName: row.room_name || null,
  roomCapacity: row.room_capacity || null,
  roomLocation: row.room_location || null,
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
      SELECT 
        b.id, 
        b.room_id, 
        b.user_id, 
        b.start_ts, 
        b.end_ts, 
        b.status, 
        b.title, 
        b.attendees, 
        b.idempotency_key, 
        b.external_event_id, 
        b.created_at, 
        b.updated_at,
        r.name AS room_name,
        r.capacity AS room_capacity,
        r.location AS room_location
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.id = $1
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
      'room_id = $1::bigint',
      'status = $2::varchar',
      'start_ts < $4::timestamptz AND end_ts > $3::timestamptz', // Overlap condition
    ];
    const params: unknown[] = [roomId, 'CONFIRMED', startTs.toISOString(), endTs.toISOString()];

    if (excludeBookingId) {
      conditions.push('id != $5::bigint');
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
      conditions.push(`user_id = $${paramIndex}::bigint`);
      params.push(filters.userId);
      paramIndex++;
    }

    if (filters.roomId !== undefined) {
      conditions.push(`room_id = $${paramIndex}::bigint`);
      params.push(filters.roomId);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex}::varchar`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.startDate) {
      conditions.push(`start_ts >= $${paramIndex}::timestamptz`);
      // filters.startDate is already a string from query params
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      conditions.push(`end_ts <= $${paramIndex}::timestamptz`);
      // filters.endDate is already a string from query params
      params.push(filters.endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query<BookingRow>(
      `
      SELECT 
        b.id, 
        b.room_id, 
        b.user_id, 
        b.start_ts, 
        b.end_ts, 
        b.status, 
        b.title, 
        b.attendees, 
        b.idempotency_key, 
        b.external_event_id, 
        b.created_at, 
        b.updated_at,
        r.name AS room_name,
        r.capacity AS room_capacity,
        r.location AS room_location
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      ${whereClause}
      ORDER BY b.start_ts DESC
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
      WHERE room_id = $1::bigint
        AND status = 'CONFIRMED'::varchar
        AND start_ts < $3::timestamptz
        AND end_ts > $2::timestamptz
      ORDER BY start_ts ASC
      `,
      [roomId, startTs.toISOString(), endTs.toISOString()],
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
          { 
            conflicts: conflicts.map((c) => ({ 
              id: typeof c.id === 'number' ? c.id : Number(c.id), 
              start: c.startTs, 
              end: c.endTs 
            })) 
          },
        );
      }

      // Ensure Date objects are valid before converting to ISO strings
      if (!(booking.startTs instanceof Date) || isNaN(booking.startTs.getTime())) {
        throw new Error(`Invalid startTs: ${booking.startTs}`);
      }
      if (!(booking.endTs instanceof Date) || isNaN(booking.endTs.getTime())) {
        throw new Error(`Invalid endTs: ${booking.endTs}`);
      }
      // Convert userId to number if needed (database might return string)
      const userId = typeof booking.userId === 'number' ? booking.userId : Number(booking.userId);
      if (isNaN(userId) || !Number.isFinite(userId) || userId <= 0) {
        throw new Error(`Invalid userId: ${booking.userId}`);
      }
      // Convert roomId to number if needed
      const roomId = typeof booking.roomId === 'number' ? booking.roomId : Number(booking.roomId);
      if (isNaN(roomId) || !Number.isFinite(roomId) || roomId <= 0) {
        throw new Error(`Invalid roomId: ${booking.roomId}`);
      }

      // Insert booking first
      const insertResult = await client.query<{ id: number }>(
        `
        INSERT INTO bookings (room_id, user_id, start_ts, end_ts, status, title, attendees, idempotency_key, external_event_id)
        VALUES ($1::bigint, $2::bigint, $3::timestamptz, $4::timestamptz, $5::varchar, $6::varchar, $7::jsonb, $8::varchar, $9::varchar)
        RETURNING id
        `,
        [
          roomId,
          userId,
          booking.startTs.toISOString(),
          booking.endTs.toISOString(),
          booking.status || 'CONFIRMED',
          booking.title || null,
          JSON.stringify(booking.attendees || []),
          booking.idempotencyKey || null,
          booking.externalEventId || null,
        ],
      );

      const newBookingId = insertResult.rows[0].id;

      // Fetch the booking with room information
      const bookingWithRoom = await client.query<BookingRow>(
        `
        SELECT 
          b.id, 
          b.room_id, 
          b.user_id, 
          b.start_ts, 
          b.end_ts, 
          b.status, 
          b.title, 
          b.attendees, 
          b.idempotency_key, 
          b.external_event_id, 
          b.created_at, 
          b.updated_at,
          r.name AS room_name,
          r.capacity AS room_capacity,
          r.location AS room_location
        FROM bookings b
        LEFT JOIN rooms r ON b.room_id = r.id
        WHERE b.id = $1
        `,
        [newBookingId],
      );

      return mapBooking(bookingWithRoom.rows[0]);
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
    
    // Update the booking
    const updateResult = await query<{ id: number }>(
      `
      UPDATE bookings
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id
      `,
      params,
    );

    if (updateResult.rowCount === 0) {
      throw new NotFoundError('Booking not found', { bookingId: id });
    }

    // Fetch the updated booking with room information
    const bookingWithRoom = await query<BookingRow>(
      `
      SELECT 
        b.id, 
        b.room_id, 
        b.user_id, 
        b.start_ts, 
        b.end_ts, 
        b.status, 
        b.title, 
        b.attendees, 
        b.idempotency_key, 
        b.external_event_id, 
        b.created_at, 
        b.updated_at,
        r.name AS room_name,
        r.capacity AS room_capacity,
        r.location AS room_location
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.id = $1
      `,
      [id],
    );

    return mapBooking(bookingWithRoom.rows[0]);
  }

  async cancel(id: number): Promise<Booking> {
    return this.update(id, { status: 'CANCELLED' });
  }
}


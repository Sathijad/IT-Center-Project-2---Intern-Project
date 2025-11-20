import { query } from '../common/db';

export interface BookingAudit {
  id: number;
  bookingId: number;
  action: string;
  actorId: number | null;
  notes: string | null;
  createdAt: Date;
}

interface BookingAuditRow {
  id: number;
  booking_id: number;
  action: string;
  actor_id: number | null;
  notes: string | null;
  created_at: Date;
}

const mapAudit = (row: BookingAuditRow): BookingAudit => ({
  id: row.id,
  bookingId: row.booking_id,
  action: row.action,
  actorId: row.actor_id,
  notes: row.notes,
  createdAt: row.created_at,
});

export class BookingAuditRepository {
  async create(audit: {
    bookingId: number;
    action: string;
    actorId?: number | null;
    notes?: string | null;
  }): Promise<BookingAudit> {
    const result = await query<BookingAuditRow>(
      `
      INSERT INTO booking_audit (booking_id, action, actor_id, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING id, booking_id, action, actor_id, notes, created_at
      `,
      [audit.bookingId, audit.action, audit.actorId || null, audit.notes || null],
    );

    return mapAudit(result.rows[0]);
  }

  async findByBookingId(bookingId: number): Promise<BookingAudit[]> {
    const result = await query<BookingAuditRow>(
      `
      SELECT id, booking_id, action, actor_id, notes, created_at
      FROM booking_audit
      WHERE booking_id = $1
      ORDER BY created_at DESC
      `,
      [bookingId],
    );

    return result.rows.map(mapAudit);
  }
}


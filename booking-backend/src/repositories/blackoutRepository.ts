import { query } from '../common/db';
import { NotFoundError } from '../common/errors';

export interface BlackoutWindow {
  id: number;
  roomId: number;
  startTs: Date;
  endTs: Date;
  reason: string | null;
  createdBy: number | null;
  createdAt: Date;
}

interface BlackoutRow {
  id: number;
  room_id: number;
  start_ts: Date;
  end_ts: Date;
  reason: string | null;
  created_by: number | null;
  created_at: Date;
}

const mapBlackout = (row: BlackoutRow): BlackoutWindow => ({
  id: row.id,
  roomId: row.room_id,
  startTs: row.start_ts,
  endTs: row.end_ts,
  reason: row.reason,
  createdBy: row.created_by,
  createdAt: row.created_at,
});

export class BlackoutRepository {
  async findById(id: number): Promise<BlackoutWindow | null> {
    const result = await query<BlackoutRow>(
      `
      SELECT id, room_id, start_ts, end_ts, reason, created_by, created_at
      FROM blackout_windows
      WHERE id = $1
      `,
      [id],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapBlackout(result.rows[0]);
  }

  async findByIdOrThrow(id: number): Promise<BlackoutWindow> {
    const blackout = await this.findById(id);
    if (!blackout) {
      throw new NotFoundError('Blackout window not found', { blackoutId: id });
    }
    return blackout;
  }

  async findByRoom(roomId: number, startTs?: Date, endTs?: Date): Promise<BlackoutWindow[]> {
    const conditions: string[] = ['room_id = $1'];
    const params: unknown[] = [roomId];
    let paramIndex = 2;

    if (startTs) {
      conditions.push(`end_ts > $${paramIndex}::timestamptz`);
      params.push(startTs);
      paramIndex++;
    }

    if (endTs) {
      conditions.push(`start_ts < $${paramIndex}::timestamptz`);
      params.push(endTs);
      paramIndex++;
    }

    const result = await query<BlackoutRow>(
      `
      SELECT id, room_id, start_ts, end_ts, reason, created_by, created_at
      FROM blackout_windows
      WHERE ${conditions.join(' AND ')}
      ORDER BY start_ts ASC
      `,
      params,
    );

    return result.rows.map(mapBlackout);
  }

  async checkOverlap(roomId: number, startTs: Date, endTs: Date, excludeId?: number): Promise<BlackoutWindow[]> {
    const conditions: string[] = [
      'room_id = $1',
      'start_ts < $4 AND end_ts > $3', // Overlap condition
    ];
    const params: unknown[] = [roomId, startTs, endTs];

    if (excludeId) {
      conditions.push('id != $5');
      params.push(excludeId);
    }

    const result = await query<BlackoutRow>(
      `
      SELECT id, room_id, start_ts, end_ts, reason, created_by, created_at
      FROM blackout_windows
      WHERE ${conditions.join(' AND ')}
      `,
      params,
    );

    return result.rows.map(mapBlackout);
  }

  async create(blackout: {
    roomId: number;
    startTs: Date;
    endTs: Date;
    reason?: string | null;
    createdBy?: number | null;
  }): Promise<BlackoutWindow> {
    const result = await query<BlackoutRow>(
      `
      INSERT INTO blackout_windows (room_id, start_ts, end_ts, reason, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, room_id, start_ts, end_ts, reason, created_by, created_at
      `,
      [
        blackout.roomId,
        blackout.startTs,
        blackout.endTs,
        blackout.reason || null,
        blackout.createdBy || null,
      ],
    );

    return mapBlackout(result.rows[0]);
  }

  async update(id: number, updates: {
    startTs?: Date;
    endTs?: Date;
    reason?: string | null;
  }): Promise<BlackoutWindow> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updates.startTs !== undefined) {
      fields.push(`start_ts = $${paramIndex}::timestamptz`);
      params.push(updates.startTs);
      paramIndex++;
    }

    if (updates.endTs !== undefined) {
      fields.push(`end_ts = $${paramIndex}::timestamptz`);
      params.push(updates.endTs);
      paramIndex++;
    }

    if (updates.reason !== undefined) {
      fields.push(`reason = $${paramIndex}`);
      params.push(updates.reason);
      paramIndex++;
    }

    if (fields.length === 0) {
      return this.findByIdOrThrow(id);
    }

    params.push(id);
    const result = await query<BlackoutRow>(
      `
      UPDATE blackout_windows
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, room_id, start_ts, end_ts, reason, created_by, created_at
      `,
      params,
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Blackout window not found', { blackoutId: id });
    }

    return mapBlackout(result.rows[0]);
  }

  async delete(id: number): Promise<void> {
    const result = await query(
      `
      DELETE FROM blackout_windows
      WHERE id = $1
      `,
      [id],
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Blackout window not found', { blackoutId: id });
    }
  }
}


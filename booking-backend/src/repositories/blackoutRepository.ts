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
  id: typeof row.id === 'number' ? row.id : Number(row.id),
  roomId: typeof row.room_id === 'number' ? row.room_id : Number(row.room_id),
  startTs: row.start_ts,
  endTs: row.end_ts,
  reason: row.reason,
  createdBy: row.created_by !== null && row.created_by !== undefined 
    ? (typeof row.created_by === 'number' ? row.created_by : Number(row.created_by))
    : null,
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
    const conditions: string[] = ['room_id = $1::bigint'];
    const params: unknown[] = [roomId];
    let paramIndex = 2;

    if (startTs) {
      conditions.push(`end_ts > $${paramIndex}::timestamptz`);
      params.push(startTs.toISOString());
      paramIndex++;
    }

    if (endTs) {
      conditions.push(`start_ts < $${paramIndex}::timestamptz`);
      params.push(endTs.toISOString());
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

  async findAll(): Promise<BlackoutWindow[]> {
    const result = await query<BlackoutRow>(
      `
      SELECT id, room_id, start_ts, end_ts, reason, created_by, created_at
      FROM blackout_windows
      ORDER BY start_ts DESC
      `,
    );

    return result.rows.map(mapBlackout);
  }

  async checkOverlap(roomId: number, startTs: Date, endTs: Date, excludeId?: number): Promise<BlackoutWindow[]> {
    const conditions: string[] = [
      'room_id = $1::bigint',
      'start_ts < $3::timestamptz AND end_ts > $2::timestamptz', // Overlap condition - fixed parameter order
    ];
    const params: unknown[] = [roomId, startTs.toISOString(), endTs.toISOString()];

    if (excludeId) {
      conditions.push('id != $4::bigint');
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
    // Ensure Date objects are valid before converting to ISO strings
    if (!(blackout.startTs instanceof Date) || isNaN(blackout.startTs.getTime())) {
      throw new Error(`Invalid startTs: ${blackout.startTs}`);
    }
    if (!(blackout.endTs instanceof Date) || isNaN(blackout.endTs.getTime())) {
      throw new Error(`Invalid endTs: ${blackout.endTs}`);
    }
    // Convert roomId to number if needed (database might return string)
    const roomId = typeof blackout.roomId === 'number' ? blackout.roomId : Number(blackout.roomId);
    if (isNaN(roomId) || !Number.isFinite(roomId) || roomId <= 0) {
      throw new Error(`Invalid roomId: ${blackout.roomId}`);
    }
    // Convert createdBy to number if needed
    const createdBy = blackout.createdBy !== null && blackout.createdBy !== undefined
      ? (typeof blackout.createdBy === 'number' ? blackout.createdBy : Number(blackout.createdBy))
      : null;
    if (createdBy !== null && (isNaN(createdBy) || !Number.isFinite(createdBy) || createdBy <= 0)) {
      throw new Error(`Invalid createdBy: ${blackout.createdBy}`);
    }

    const result = await query<BlackoutRow>(
      `
      INSERT INTO blackout_windows (room_id, start_ts, end_ts, reason, created_by)
      VALUES ($1::bigint, $2::timestamptz, $3::timestamptz, $4::text, $5::bigint)
      RETURNING id, room_id, start_ts, end_ts, reason, created_by, created_at
      `,
      [
        roomId,
        blackout.startTs.toISOString(),
        blackout.endTs.toISOString(),
        blackout.reason || null,
        createdBy,
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
      params.push(updates.startTs.toISOString());
      paramIndex++;
    }

    if (updates.endTs !== undefined) {
      fields.push(`end_ts = $${paramIndex}::timestamptz`);
      params.push(updates.endTs.toISOString());
      paramIndex++;
    }

    if (updates.reason !== undefined) {
      fields.push(`reason = $${paramIndex}::text`);
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
      WHERE id = $${paramIndex}::bigint
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


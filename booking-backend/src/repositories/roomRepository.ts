import { query } from '../common/db';
import { NotFoundError } from '../common/errors';

export interface Room {
  id: number;
  name: string;
  capacity: number;
  amenities: string[];
  location: string | null;
  active: boolean;
  ownerTeamId: number | null;
  externalCalendarId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RoomRow {
  id: number;
  name: string;
  capacity: number;
  amenities: unknown;
  location: string | null;
  active: boolean;
  owner_team_id: number | null;
  external_calendar_id: string | null;
  created_at: Date;
  updated_at: Date;
}

const mapRoom = (row: RoomRow): Room => ({
  id: row.id,
  name: row.name,
  capacity: row.capacity,
  amenities: Array.isArray(row.amenities) ? row.amenities : typeof row.amenities === 'string' ? JSON.parse(row.amenities) : [],
  location: row.location,
  active: row.active,
  ownerTeamId: row.owner_team_id,
  externalCalendarId: row.external_calendar_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface RoomSearchFilters {
  date?: string; // ISO date string
  capacity?: number;
  amenities?: string[]; // Array of amenity names
  active?: boolean;
  location?: string;
}

export class RoomRepository {
  async findById(id: number): Promise<Room | null> {
    const result = await query<RoomRow>(
      `
      SELECT id, name, capacity, amenities, location, active, owner_team_id, external_calendar_id, created_at, updated_at
      FROM rooms
      WHERE id = $1
      `,
      [id],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapRoom(result.rows[0]);
  }

  async findByIdOrThrow(id: number): Promise<Room> {
    const room = await this.findById(id);
    if (!room) {
      throw new NotFoundError('Room not found', { roomId: id });
    }
    return room;
  }

  async search(filters: RoomSearchFilters = {}): Promise<Room[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.active !== undefined) {
      conditions.push(`active = $${paramIndex}`);
      params.push(filters.active);
      paramIndex++;
    } else {
      // Default to only active rooms
      conditions.push('active = TRUE');
    }

    if (filters.capacity !== undefined) {
      conditions.push(`capacity >= $${paramIndex}`);
      params.push(filters.capacity);
      paramIndex++;
    }

    if (filters.location) {
      conditions.push(`location ILIKE $${paramIndex}`);
      params.push(`%${filters.location}%`);
      paramIndex++;
    }

    if (filters.amenities && filters.amenities.length > 0) {
      // Use JSONB containment operator (@>)
      conditions.push(`amenities @> $${paramIndex}::jsonb`);
      params.push(JSON.stringify(filters.amenities));
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : 'WHERE active = TRUE';

    const result = await query<RoomRow>(
      `
      SELECT id, name, capacity, amenities, location, active, owner_team_id, external_calendar_id, created_at, updated_at
      FROM rooms
      ${whereClause}
      ORDER BY name ASC
      `,
      params,
    );

    return result.rows.map(mapRoom);
  }

  async create(room: {
    name: string;
    capacity: number;
    amenities?: string[];
    location?: string | null;
    active?: boolean;
    ownerTeamId?: number | null;
  }): Promise<Room> {
    const result = await query<RoomRow>(
      `
      INSERT INTO rooms (name, capacity, amenities, location, active, owner_team_id)
      VALUES ($1, $2, $3::jsonb, $4, $5, $6)
      RETURNING id, name, capacity, amenities, location, active, owner_team_id, external_calendar_id, created_at, updated_at
      `,
      [
        room.name,
        room.capacity,
        JSON.stringify(room.amenities || []),
        room.location || null,
        room.active ?? true,
        room.ownerTeamId || null,
      ],
    );

    return mapRoom(result.rows[0]);
  }

  async update(id: number, updates: {
    name?: string;
    capacity?: number;
    amenities?: string[];
    location?: string | null;
    active?: boolean;
    ownerTeamId?: number | null;
  }): Promise<Room> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex}`);
      params.push(updates.name);
      paramIndex++;
    }

    if (updates.capacity !== undefined) {
      fields.push(`capacity = $${paramIndex}`);
      params.push(updates.capacity);
      paramIndex++;
    }

    if (updates.amenities !== undefined) {
      fields.push(`amenities = $${paramIndex}::jsonb`);
      params.push(JSON.stringify(updates.amenities));
      paramIndex++;
    }

    if (updates.location !== undefined) {
      fields.push(`location = $${paramIndex}`);
      params.push(updates.location);
      paramIndex++;
    }

    if (updates.active !== undefined) {
      fields.push(`active = $${paramIndex}`);
      params.push(updates.active);
      paramIndex++;
    }

    if (updates.ownerTeamId !== undefined) {
      fields.push(`owner_team_id = $${paramIndex}`);
      params.push(updates.ownerTeamId);
      paramIndex++;
    }

    if (fields.length === 0) {
      return this.findByIdOrThrow(id);
    }

    params.push(id);
    const result = await query<RoomRow>(
      `
      UPDATE rooms
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, name, capacity, amenities, location, active, owner_team_id, external_calendar_id, created_at, updated_at
      `,
      params,
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Room not found', { roomId: id });
    }

    return mapRoom(result.rows[0]);
  }
}


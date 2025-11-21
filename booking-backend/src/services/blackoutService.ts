import { BlackoutRepository } from '../repositories/blackoutRepository';
import { RoomRepository } from '../repositories/roomRepository';
import { ValidationError } from '../common/errors';

export interface CreateBlackoutInput {
  roomId: number;
  startTs: Date;
  endTs: Date;
  reason?: string | null;
  createdBy: number;
}

export class BlackoutService {
  constructor(
    private readonly blackoutRepository = new BlackoutRepository(),
    private readonly roomRepository = new RoomRepository(),
  ) {}

  async createBlackout(input: CreateBlackoutInput): Promise<Awaited<ReturnType<BlackoutRepository['findById']>>> {
    // Validate time range
    if (input.endTs <= input.startTs) {
      throw new ValidationError('End time must be after start time');
    }

    // Check room exists
    await this.roomRepository.findByIdOrThrow(input.roomId);

    // Check for overlapping blackouts
    const overlaps = await this.blackoutRepository.checkOverlap(input.roomId, input.startTs, input.endTs);
    if (overlaps.length > 0) {
      throw new ValidationError('Blackout window overlaps with existing blackout', {
        overlaps: overlaps.map((o) => ({ id: o.id, start: o.startTs, end: o.endTs })),
      });
    }

    return this.blackoutRepository.create({
      roomId: input.roomId,
      startTs: input.startTs,
      endTs: input.endTs,
      reason: input.reason || null,
      createdBy: input.createdBy,
    });
  }

  async updateBlackout(
    id: number,
    updates: {
      startTs?: Date;
      endTs?: Date;
      reason?: string | null;
    },
  ): Promise<Awaited<ReturnType<BlackoutRepository['findById']>>> {
    const blackout = await this.blackoutRepository.findByIdOrThrow(id);

    // Validate time range if both are being updated
    if (updates.startTs !== undefined && updates.endTs !== undefined) {
      if (updates.endTs <= updates.startTs) {
        throw new ValidationError('End time must be after start time');
      }
    } else if (updates.startTs !== undefined) {
      if (blackout.endTs <= updates.startTs) {
        throw new ValidationError('End time must be after start time');
      }
    } else if (updates.endTs !== undefined) {
      if (updates.endTs <= blackout.startTs) {
        throw new ValidationError('End time must be after start time');
      }
    }

    // Check for overlaps if time is being changed
    if (updates.startTs !== undefined || updates.endTs !== undefined) {
      const startTs = updates.startTs ?? blackout.startTs;
      const endTs = updates.endTs ?? blackout.endTs;
      const overlaps = await this.blackoutRepository.checkOverlap(blackout.roomId, startTs, endTs, id);
      if (overlaps.length > 0) {
        throw new ValidationError('Blackout window overlaps with existing blackout', {
          overlaps: overlaps.map((o) => ({ id: o.id, start: o.startTs, end: o.endTs })),
        });
      }
    }

    return this.blackoutRepository.update(id, updates);
  }

  async deleteBlackout(id: number): Promise<void> {
    await this.blackoutRepository.findByIdOrThrow(id);
    await this.blackoutRepository.delete(id);
  }

  async getBlackout(id: number): Promise<Awaited<ReturnType<BlackoutRepository['findById']>>> {
    return this.blackoutRepository.findByIdOrThrow(id);
  }

  async listBlackouts(roomId?: number): Promise<Awaited<ReturnType<BlackoutRepository['findByRoom']>>> {
    if (roomId) {
      return this.blackoutRepository.findByRoom(roomId);
    }
    return this.blackoutRepository.findAll();
  }
}


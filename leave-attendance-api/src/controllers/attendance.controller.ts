import { Response, NextFunction } from 'express';
import { AttendanceService } from '../services/attendance.service';
import { AuthenticatedRequest, ClockInDto, ClockOutDto } from '../types';
import { sendErrorResponse } from '../lib/errors';

export class AttendanceController {
  private service: AttendanceService;

  constructor() {
    this.service = new AttendanceService();
  }

  async clockIn(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as ClockInDto;
      const log = await this.service.clockIn(req.user!.userId, dto);
      res.status(201).json({ data: log });
    } catch (error) {
      sendErrorResponse(res, error as Error);
    }
  }

  async clockOut(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as ClockOutDto;
      const log = await this.service.clockOut(req.user!.userId, dto);
      res.json({ data: log });
    } catch (error) {
      sendErrorResponse(res, error as Error);
    }
  }

  async getAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: {
        userId?: number;
        fromDate?: Date;
        toDate?: Date;
        page?: number;
        size?: number;
      } = {};

      // EMPLOYEE can only see own attendance unless admin
      if (!req.user!.isAdmin) {
        filters.userId = req.user!.userId;
      } else if (req.query.user_id) {
        filters.userId = parseInt(req.query.user_id as string, 10);
      }

      if (req.query.from) {
        filters.fromDate = new Date(req.query.from as string);
      }

      if (req.query.to) {
        filters.toDate = new Date(req.query.to as string);
      }

      filters.page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      filters.size = req.query.size ? parseInt(req.query.size as string, 10) : 20;

      const result = await this.service.getAttendanceLogs(filters);
      const totalPages = Math.ceil(result.total / filters.size!);

      res.json({
        data: result.data,
        pagination: {
          page: filters.page!,
          size: filters.size!,
          total: result.total,
          totalPages,
        },
      });
    } catch (error) {
      sendErrorResponse(res, error as Error);
    }
  }

  async getTodayStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const today = await this.service.getTodayAttendance(req.user!.userId);
      res.json({ data: today });
    } catch (error) {
      sendErrorResponse(res, error as Error);
    }
  }
}


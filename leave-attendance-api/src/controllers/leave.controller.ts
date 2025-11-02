import { Response, NextFunction } from 'express';
import { LeaveService } from '../services/leave.service';
import { AuthenticatedRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto } from '../types';
import { sendErrorResponse, NotFoundError, ForbiddenError } from '../lib/errors';

export class LeaveController {
  private service: LeaveService;

  constructor() {
    this.service = new LeaveService();
  }

  async getBalance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.query.user_id 
        ? parseInt(req.query.user_id as string, 10)
        : req.user!.userId;

      // Admin can view any user's balance, EMPLOYEE only own
      if (!req.user!.isAdmin && userId !== req.user!.userId) {
        return sendErrorResponse(res, new ForbiddenError('Cannot view another user\'s balance'));
      }

      const balances = await this.service.getLeaveBalance(userId);
      res.json({ data: balances });
    } catch (error) {
      sendErrorResponse(res, error as Error);
    }
  }

  async getRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: {
        userId?: number;
        status?: string;
        fromDate?: Date;
        toDate?: Date;
        page?: number;
        size?: number;
      } = {};

      // EMPLOYEE can only see own requests unless admin
      if (!req.user!.isAdmin) {
        filters.userId = req.user!.userId;
      } else if (req.query.user_id) {
        filters.userId = parseInt(req.query.user_id as string, 10);
      }

      if (req.query.status) {
        filters.status = req.query.status as string;
      }

      if (req.query.from) {
        filters.fromDate = new Date(req.query.from as string);
      }

      if (req.query.to) {
        filters.toDate = new Date(req.query.to as string);
      }

      filters.page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      filters.size = req.query.size ? parseInt(req.query.size as string, 10) : 20;

      const result = await this.service.getLeaveRequests(filters);

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

  async createRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as CreateLeaveRequestDto;
      const request = await this.service.createLeaveRequest(req.user!.userId, dto);
      res.status(201).json({ data: request });
    } catch (error) {
      sendErrorResponse(res, error as Error);
    }
  }

  async updateRequestStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return sendErrorResponse(res, new NotFoundError('Invalid leave request ID'));
      }

      const dto = req.body as UpdateLeaveRequestDto;
      const updated = await this.service.updateLeaveRequestStatus(
        id,
        dto,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.json({ data: updated });
    } catch (error) {
      sendErrorResponse(res, error as Error);
    }
  }

  async cancelRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return sendErrorResponse(res, new NotFoundError('Invalid leave request ID'));
      }

      const cancelled = await this.service.cancelLeaveRequest(
        id,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.json({ data: cancelled });
    } catch (error) {
      sendErrorResponse(res, error as Error);
    }
  }
}


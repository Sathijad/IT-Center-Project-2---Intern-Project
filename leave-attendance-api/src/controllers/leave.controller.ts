import { Request, Response, NextFunction } from 'express';
import { LeaveService } from '../services/leave.service';
import { CreateLeaveRequestDto, UpdateLeaveRequestDto } from '../types';
import { sendErrorResponse, NotFoundError, ForbiddenError, ValidationError, UnauthorizedError } from '../lib/errors';

export class LeaveController {
  private service: LeaveService;

  constructor() {
    this.service = new LeaveService();
  }

  async getBalance(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.userId) {
        return sendErrorResponse(res, new UnauthorizedError('User not authenticated'));
      }

      const userId = req.query.user_id 
        ? parseInt(req.query.user_id as string, 10)
        : req.user.userId;

      // Admin can view any user's balance, EMPLOYEE only own
      if (!req.user.isAdmin && userId !== req.user.userId) {
        return sendErrorResponse(res, new ForbiddenError('Cannot view another user\'s balance'));
      }

      const balances = await this.service.getLeaveBalance(userId);
      res.json({ data: balances });
    } catch (error) {
      console.error('Error in getBalance:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      sendErrorResponse(res, error as Error);
    }
  }

  async getRequests(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.userId) {
        return sendErrorResponse(res, new UnauthorizedError('User not authenticated'));
      }

      const filters: {
        userId?: number;
        status?: string;
        fromDate?: Date;
        toDate?: Date;
        page?: number;
        size?: number;
      } = {};

      // EMPLOYEE can only see own requests unless admin
      if (!req.user.isAdmin) {
        filters.userId = req.user.userId;
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
      console.error('Error in getRequests:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      sendErrorResponse(res, error as Error);
    }
  }

  async createRequest(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.userId) {
        return sendErrorResponse(res, new UnauthorizedError('User not authenticated'));
      }

      const dto = req.body as CreateLeaveRequestDto;

      // Validate request body structure
      if (!dto) {
        return sendErrorResponse(res, new ValidationError('Request body is required'));
      }

      if (!dto.policyId) {
        return sendErrorResponse(res, new ValidationError('policyId is required'));
      }

      if (!dto.startDate) {
        return sendErrorResponse(res, new ValidationError('startDate is required'));
      }

      if (!dto.endDate) {
        return sendErrorResponse(res, new ValidationError('endDate is required'));
      }

      // Validate halfDay value if provided
      if (dto.halfDay && dto.halfDay !== 'AM' && dto.halfDay !== 'PM') {
        return sendErrorResponse(res, new ValidationError('halfDay must be either "AM" or "PM"'));
      }

      // Validate policyId is a number
      if (typeof dto.policyId !== 'number' || isNaN(dto.policyId)) {
        return sendErrorResponse(res, new ValidationError('policyId must be a valid number'));
      }

      const request = await this.service.createLeaveRequest(req.user.userId, dto);
      res.status(201).json({ data: request });
    } catch (error) {
      console.error('Error in createRequest:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      sendErrorResponse(res, error as Error);
    }
  }

  async updateRequestStatus(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.userId) {
        return sendErrorResponse(res, new UnauthorizedError('User not authenticated'));
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return sendErrorResponse(res, new NotFoundError('Invalid leave request ID'));
      }

      const dto = req.body as UpdateLeaveRequestDto;
      const updated = await this.service.updateLeaveRequestStatus(
        id,
        dto,
        req.user.userId,
        req.user.isAdmin
      );
      res.json({ data: updated });
    } catch (error) {
      console.error('Error in updateRequestStatus:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      sendErrorResponse(res, error as Error);
    }
  }

  async cancelRequest(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.userId) {
        return sendErrorResponse(res, new UnauthorizedError('User not authenticated'));
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return sendErrorResponse(res, new NotFoundError('Invalid leave request ID'));
      }

      const cancelled = await this.service.cancelLeaveRequest(
        id,
        req.user.userId,
        req.user.isAdmin
      );
      res.json({ data: cancelled });
    } catch (error) {
      console.error('Error in cancelRequest:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      sendErrorResponse(res, error as Error);
    }
  }
}


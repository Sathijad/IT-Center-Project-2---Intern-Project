import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, clockInSchema, clockOutSchema, paginationSchema } from '../utils/validation.js';
import { AttendanceService } from '../services/attendanceService.js';

export const attendanceRouter = express.Router();
const attendanceService = new AttendanceService();

// Get attendance logs
attendanceRouter.get('/',
  authenticate,
  validate(paginationSchema),
  async (req, res, next) => {
    try {
      if (!req.user.userId) {
        return res.status(400).json({
          code: 'INVALID_USER',
          message: 'User not found in database',
          traceId: req.traceId
        });
      }

      // For admins, if user_id is provided, use it; if not provided, don't filter by user (get all users)
      // For non-admins, always use their own userId
      const filters = {
        startDate: req.query.start_date,
        endDate: req.query.end_date,
        page: req.query.page,
        size: req.query.size,
        sort: req.query.sort
      };

      if (req.user.roles?.includes('ADMIN')) {
        // Admin can filter by specific user or see all users
        if (req.query.user_id) {
          filters.userId = parseInt(req.query.user_id);
        }
      } else {
        // Non-admin always sees only their own attendance
        filters.userId = req.user.userId;
      }

      const result = await attendanceService.getAttendanceLogs(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Clock in
attendanceRouter.post('/clock-in',
  authenticate,
  authorize('EMPLOYEE', 'ADMIN'),
  validate(clockInSchema),
  async (req, res) => {
    const geoLocation = {
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      accuracy: req.body.accuracy
    };

    const log = await attendanceService.clockIn(req.user.userId, geoLocation);
    res.status(201).json(log);
  }
);

// Clock out
attendanceRouter.post('/clock-out',
  authenticate,
  authorize('EMPLOYEE', 'ADMIN'),
  validate(clockOutSchema),
  async (req, res) => {
    // Only create geoLocation object if both latitude and longitude are provided and valid
    // Handle empty object case explicitly
    let geoLocation = null;
    
    if (req.body && 
        typeof req.body === 'object' && 
        req.body.latitude != null && 
        req.body.longitude != null &&
        typeof req.body.latitude === 'number' && 
        typeof req.body.longitude === 'number') {
      geoLocation = {
        latitude: req.body.latitude,
        longitude: req.body.longitude
      };
    }

    const log = await attendanceService.clockOut(req.user.userId, geoLocation);
    res.json(log);
  }
);


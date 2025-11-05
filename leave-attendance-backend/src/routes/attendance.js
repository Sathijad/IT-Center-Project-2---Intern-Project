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
  async (req, res) => {
    const filters = {
      userId: req.query.user_id && req.user.roles?.includes('ADMIN')
        ? parseInt(req.query.user_id)
        : req.user.userId,
      startDate: req.query.start_date,
      endDate: req.query.end_date,
      page: req.query.page,
      size: req.query.size,
      sort: req.query.sort
    };

    const result = await attendanceService.getAttendanceLogs(filters);
    res.json(result);
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
    const geoLocation = req.body.latitude && req.body.longitude
      ? {
          latitude: req.body.latitude,
          longitude: req.body.longitude
        }
      : null;

    const log = await attendanceService.clockOut(req.user.userId, geoLocation);
    res.json(log);
  }
);


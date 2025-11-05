import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { healthRouter } from './routes/health.js';
import { leaveRouter } from './routes/leave.js';
import { attendanceRouter } from './routes/attendance.js';
import { integrationsRouter } from './routes/integrations.js';
import { reportsRouter } from './routes/reports.js';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/healthz', healthRouter);
app.use('/api/v1/leave', leaveRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/integrations', integrationsRouter);
app.use('/api/v1/reports', reportsRouter);

// Error handling (must be last)
app.use(errorHandler);

export default app;


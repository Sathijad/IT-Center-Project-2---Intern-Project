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

const configuredOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];

const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  origin(origin, callback) {
    if (!origin) {
      // Allow requests like mobile apps or curl (no origin header)
      return callback(null, true);
    }

    const normalizedOrigin = origin.trim();

    if (configuredOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    if (normalizedOrigin.startsWith('http://localhost') || normalizedOrigin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }

    return callback(new Error(`CORS: Origin not allowed - ${origin}`));
  }
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
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


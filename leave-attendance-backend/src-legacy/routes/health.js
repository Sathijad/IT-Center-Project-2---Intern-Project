import express from 'express';
import { db } from '../config/database.js';

export const healthRouter = express.Router();

healthRouter.get('/', async (req, res) => {
  try {
    // Simple health check - verify database connection
    await db.query('SELECT 1');
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString()
    });
  }
});


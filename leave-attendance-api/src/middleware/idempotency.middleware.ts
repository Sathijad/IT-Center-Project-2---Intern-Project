import { Request, Response, NextFunction } from 'express';
import { query, queryOne } from '../lib/db';
import { ConflictError, sendErrorResponse } from '../lib/errors';

// Simple in-memory store for idempotency keys (24h TTL)
// In production, use Redis or database table
interface IdempotencyRecord {
  key: string;
  response: unknown;
  expiresAt: number;
}

const idempotencyStore = new Map<string, IdempotencyRecord>();

// Cleanup expired keys every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (record.expiresAt < now) {
      idempotencyStore.delete(key);
    }
  }
}, 3600000); // 1 hour

export function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only apply to POST/PATCH/PUT methods
  if (!['POST', 'PATCH', 'PUT'].includes(req.method)) {
    next();
    return;
  }

  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    next();
    return;
  }

  const record = idempotencyStore.get(idempotencyKey);

  if (record && record.expiresAt > Date.now()) {
    // Return cached response
    res.status(200).json(record.response);
    return;
  }

  // Store original json method
  const originalJson = res.json.bind(res);
  
  // Override json to capture response
  res.json = function (body: unknown): Response {
    // Store successful response (2xx) for 24 hours
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyStore.set(idempotencyKey, {
        key: idempotencyKey,
        response: body,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });
    }
    return originalJson(body);
  };

  next();
}


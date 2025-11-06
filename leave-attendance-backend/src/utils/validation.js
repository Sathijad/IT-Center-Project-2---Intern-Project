import { z } from 'zod';

export const createLeaveRequestSchema = z.object({
  policy_id: z.number().int().positive(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(1000).optional()
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  { message: 'end_date must be >= start_date', path: ['end_date'] }
);

export const updateLeaveRequestSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'CANCEL']),
  notes: z.string().max(500).optional()
});

export const clockInSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional()
});

export const clockOutSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
}).passthrough(); // Allow empty object or object with optional coordinates

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('0'),
  size: z.string().regex(/^\d+$/).transform(Number).default('20'),
  sort: z.string().default('created_at,desc')
});

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      // For clock-out, handle empty body gracefully
      let bodyToValidate = req.body || {};
      
      // If body is empty object, keep it as is for clock-out
      if (Object.keys(bodyToValidate).length === 0 && schema === clockOutSchema) {
        req.body = {};
        return next();
      }
      
      const result = schema.parse({
        ...bodyToValidate,
        ...req.query,
        ...req.params
      });
      
      // Merge validated data back, but preserve original body structure
      req.body = { ...req.body, ...result };
      req.query = { ...req.query, ...result };
      req.params = { ...req.params, ...result };
      
      next();
    } catch (error) {
      next(error);
    }
  };
};


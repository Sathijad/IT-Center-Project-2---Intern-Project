import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from './errors';

const parseWithSchema = <T>(schema: ZodSchema<T>, payload: unknown): T => {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError('Validation failed', { issues: error.issues });
    }

    throw error;
  }
};

export const parseBody = <T>(schema: ZodSchema<T>, body: string | null | undefined): T => {
  if (!body) {
    throw new ValidationError('Request body is required');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw new ValidationError('Invalid JSON body');
  }

  return parseWithSchema(schema, parsed);
};

export const parseQuery = <T>(
  schema: ZodSchema<T>,
  queryParams: Record<string, string | undefined> | undefined,
): T => {
  return parseWithSchema(schema, queryParams ?? {});
};

export const parsePathParameters = <T>(
  schema: ZodSchema<T>,
  params: Record<string, string | undefined> | undefined,
): T => {
  return parseWithSchema(schema, params ?? {});
};


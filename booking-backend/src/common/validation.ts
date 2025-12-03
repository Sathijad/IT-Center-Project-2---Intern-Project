import { ZodType, ZodError } from 'zod';
import { ValidationError } from './errors';

const parseWithSchema = <TInput, TOutput>(schema: ZodType<TOutput, any, TInput>, payload: TInput): TOutput => {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError('Validation failed', { issues: error.issues });
    }

    throw error;
  }
};

export const parseBody = <T>(schema: ZodType<T>, body: string | null | undefined): T => {
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
  schema: ZodType<T, any, any>,
  queryParams: Record<string, string | undefined> | undefined,
): T => {
  return parseWithSchema(schema, queryParams ?? {});
};

export const parsePathParameters = <T>(
  schema: ZodType<T, any, any>,
  params: Record<string, string | undefined> | undefined,
): T => {
  return parseWithSchema(schema, params ?? {});
};


import { z } from 'zod';
import { parseBody, parsePathParameters, parseQuery } from './validation';
import { ValidationError } from './errors';

describe('validation helpers', () => {
  const schema = z.object({
    id: z.string().uuid(),
    page: z.coerce.number().int().min(1).default(1),
  });

  describe('parseBody', () => {
    it('parses and validates a valid JSON body', () => {
      const body = JSON.stringify({
        id: '123e4567-e89b-12d3-a456-426614174000',
        page: 2,
      });

      const result = parseBody(schema, body);
      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        page: 2,
      });
    });

    it('throws ValidationError when body is missing', () => {
      expect(() => parseBody(schema, null)).toThrow(ValidationError);
      try {
        parseBody(schema, undefined);
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        if (err instanceof ValidationError) {
          expect(err.message).toBe('Request body is required');
        }
      }
    });

    it('throws ValidationError when body is not valid JSON', () => {
      expect(() => parseBody(schema, '{invalid-json')).toThrow(ValidationError);
      try {
        parseBody(schema, '{invalid-json');
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        if (err instanceof ValidationError) {
          expect(err.message).toBe('Invalid JSON body');
        }
      }
    });

    it('throws ValidationError when schema validation fails', () => {
      const body = JSON.stringify({
        id: 'not-a-uuid',
      });

      expect(() => parseBody(schema, body)).toThrow(ValidationError);
    });
  });

  describe('parseQuery', () => {
    it('parses and validates query parameters, applying defaults', () => {
      const result = parseQuery(schema, {
        id: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        page: 1,
      });
    });

    it('throws ValidationError when query params are invalid', () => {
      expect(() =>
        parseQuery(schema, {
          id: 'not-a-uuid',
          page: '0',
        }),
      ).toThrow(ValidationError);
    });
  });

  describe('parsePathParameters', () => {
    it('parses and validates path parameters', () => {
      const result = parsePathParameters(schema, {
        id: '123e4567-e89b-12d3-a456-426614174000',
        page: '3',
      });

      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        page: 3,
      });
    });

    it('throws ValidationError when path parameters are invalid', () => {
      expect(() =>
        parsePathParameters(schema, {
          id: 'invalid',
        }),
      ).toThrow(ValidationError);
    });
  });
});



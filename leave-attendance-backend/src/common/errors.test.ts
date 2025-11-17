import {
  ApplicationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  toApplicationError,
} from './errors';

describe('Error classes', () => {
  describe('ApplicationError', () => {
    it('creates error with code, message, and status code', () => {
      const error = new ApplicationError('TEST_ERROR', 'Test message', 400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(400);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApplicationError);
    });

    it('defaults status code to 400', () => {
      const error = new ApplicationError('TEST_ERROR', 'Test message');
      expect(error.statusCode).toBe(400);
    });

    it('includes optional details', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ApplicationError('TEST_ERROR', 'Test', 400, details);
      expect(error.details).toEqual(details);
    });

    it('allows undefined details', () => {
      const error = new ApplicationError('TEST_ERROR', 'Test', 400);
      expect(error.details).toBeUndefined();
    });
  });

  describe('UnauthorizedError', () => {
    it('creates error with UNAUTHORIZED code and 401 status', () => {
      const error = new UnauthorizedError();
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });

    it('uses custom message when provided', () => {
      const error = new UnauthorizedError('Custom unauthorized message');
      expect(error.message).toBe('Custom unauthorized message');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('ForbiddenError', () => {
    it('creates error with FORBIDDEN code and 403 status', () => {
      const error = new ForbiddenError();
      expect(error.code).toBe('FORBIDDEN');
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
    });

    it('uses custom message when provided', () => {
      const error = new ForbiddenError('Access denied');
      expect(error.message).toBe('Access denied');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('creates error with NOT_FOUND code and 404 status', () => {
      const error = new NotFoundError();
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not Found');
    });

    it('uses custom message when provided', () => {
      const error = new NotFoundError('Resource not found');
      expect(error.message).toBe('Resource not found');
    });

    it('includes optional details', () => {
      const details = { resourceId: 123 };
      const error = new NotFoundError('Not found', details);
      expect(error.details).toEqual(details);
    });
  });

  describe('ValidationError', () => {
    it('creates error with VALIDATION_ERROR code and 422 status', () => {
      const error = new ValidationError();
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe('Validation failed');
    });

    it('uses custom message when provided', () => {
      const error = new ValidationError('Invalid input format');
      expect(error.message).toBe('Invalid input format');
    });

    it('includes optional details', () => {
      const details = { issues: [{ field: 'email', message: 'Invalid' }] };
      const error = new ValidationError('Validation failed', details);
      expect(error.details).toEqual(details);
    });
  });

  describe('toApplicationError', () => {
    it('returns ApplicationError instance as-is', () => {
      const original = new ApplicationError('TEST', 'Message', 400);
      const result = toApplicationError(original);
      expect(result).toBe(original);
    });

    it('converts Error instance to ApplicationError', () => {
      const original = new Error('Something went wrong');
      const result = toApplicationError(original);

      expect(result).toBeInstanceOf(ApplicationError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('Something went wrong');
      expect(result.statusCode).toBe(500);
    });

    it('handles Error without message', () => {
      const original = new Error();
      const result = toApplicationError(original);

      expect(result).toBeInstanceOf(ApplicationError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('Internal server error');
      expect(result.statusCode).toBe(500);
    });

    it('converts unknown non-Error value to ApplicationError', () => {
      const result = toApplicationError('string error');

      expect(result).toBeInstanceOf(ApplicationError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('Internal server error');
      expect(result.statusCode).toBe(500);
    });

    it('handles null', () => {
      const result = toApplicationError(null);

      expect(result).toBeInstanceOf(ApplicationError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('Internal server error');
    });

    it('handles undefined', () => {
      const result = toApplicationError(undefined);

      expect(result).toBeInstanceOf(ApplicationError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('Internal server error');
    });

    it('handles number', () => {
      const result = toApplicationError(123);

      expect(result).toBeInstanceOf(ApplicationError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('preserves specialized error types', () => {
      const forbidden = new ForbiddenError('Access denied');
      const result = toApplicationError(forbidden);

      expect(result).toBe(forbidden);
      expect(result.code).toBe('FORBIDDEN');
      expect(result.statusCode).toBe(403);
    });
  });
});


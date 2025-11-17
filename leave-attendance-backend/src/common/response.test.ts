describe('response utilities', () => {
  let originalAllowedOrigins: string | undefined;

  beforeEach(() => {
    originalAllowedOrigins = process.env.ALLOWED_ORIGINS;
    // Clear module cache to allow fresh imports with new env vars
    jest.resetModules();
  });

  afterEach(() => {
    if (originalAllowedOrigins) {
      process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
    } else {
      delete process.env.ALLOWED_ORIGINS;
    }
    jest.resetModules();
  });

  describe('successResponse', () => {
    beforeEach(() => {
      delete process.env.ALLOWED_ORIGINS;
      jest.resetModules();
    });

    it('creates success response with status code and payload', () => {
      const { successResponse: sr } = require('./response');
      const payload = { id: 1, name: 'Test' };
      const result = sr(200, payload);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body!)).toEqual(payload);
      expect(result.headers).toHaveProperty('Content-Type', 'application/json');
    });

    it('includes CORS headers', () => {
      const { successResponse: sr } = require('./response');
      const result = sr(201, {});
      const headers = result.headers!;

      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');
      expect(headers['Access-Control-Allow-Methods']).toContain('GET');
    });

    it('uses wildcard origin when no allowed origins configured', () => {
      const { successResponse: sr } = require('./response');
      const result = sr(200, {});
      expect(result.headers!['Access-Control-Allow-Origin']).toBe('*');
    });

    it('uses first allowed origin when request origin is not provided', () => {
      process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com';
      jest.resetModules();
      const { successResponse: freshSuccessResponse } = require('./response');
      const result = freshSuccessResponse(200, {});

      expect(result.headers!['Access-Control-Allow-Origin']).toBe('https://app.example.com');
    });

    it('uses request origin when it matches allowed origins', () => {
      process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com';
      jest.resetModules();
      const { successResponse: freshSuccessResponse } = require('./response');
      const result = freshSuccessResponse(200, {}, 'https://admin.example.com');

      expect(result.headers!['Access-Control-Allow-Origin']).toBe('https://admin.example.com');
    });

    it('uses first allowed origin when request origin does not match', () => {
      process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com';
      jest.resetModules();
      const { successResponse: freshSuccessResponse } = require('./response');
      const result = freshSuccessResponse(200, {}, 'https://evil.com');

      expect(result.headers!['Access-Control-Allow-Origin']).toBe('https://app.example.com');
    });

    it('uses request origin when no allowed origins configured but origin provided', () => {
      const { successResponse: sr } = require('./response');
      const result = sr(200, {}, 'https://custom.com');

      expect(result.headers!['Access-Control-Allow-Origin']).toBe('https://custom.com');
    });

    it('includes extra headers when provided', () => {
      const { successResponse: sr } = require('./response');
      const result = sr(200, {}, undefined, {
        'X-Custom-Header': 'custom-value',
      });

      expect(result.headers!['X-Custom-Header']).toBe('custom-value');
    });

    it('handles empty allowed origins list', () => {
      process.env.ALLOWED_ORIGINS = '';
      jest.resetModules();
      const { successResponse: sr } = require('./response');
      const result = sr(200, {}, 'https://any.com');

      expect(result.headers!['Access-Control-Allow-Origin']).toBe('https://any.com');
    });

    it('trims whitespace from allowed origins', () => {
      process.env.ALLOWED_ORIGINS = ' https://app.com , https://admin.com ';
      jest.resetModules();
      const { successResponse: sr } = require('./response');
      const result = sr(200, {}, 'https://app.com');

      expect(result.headers!['Access-Control-Allow-Origin']).toBe('https://app.com');
    });
  });

  describe('errorResponse', () => {
    beforeEach(() => {
      delete process.env.ALLOWED_ORIGINS;
      jest.resetModules();
    });

    it('creates error response with status code and error body', () => {
      const { errorResponse: er } = require('./response');
      const error = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { field: 'email' },
      };
      const result = er(400, error);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body!)).toEqual(error);
      expect(result.headers).toHaveProperty('Content-Type', 'application/json');
    });

    it('includes CORS headers', () => {
      const { errorResponse: er } = require('./response');
      const error = { code: 'ERROR', message: 'Test' };
      const result = er(500, error);

      expect(result.headers!['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('uses wildcard origin when no allowed origins configured', () => {
      const { errorResponse: er } = require('./response');
      const error = { code: 'ERROR', message: 'Test' };
      const result = er(400, error);

      expect(result.headers!['Access-Control-Allow-Origin']).toBe('*');
    });

    it('uses first allowed origin when request origin is not provided', () => {
      process.env.ALLOWED_ORIGINS = 'https://app.example.com';
      jest.resetModules();
      const { errorResponse: freshErrorResponse } = require('./response');
      const error = { code: 'ERROR', message: 'Test' };
      const result = freshErrorResponse(400, error);

      expect(result.headers!['Access-Control-Allow-Origin']).toBe('https://app.example.com');
    });

    it('uses request origin when it matches allowed origins', () => {
      process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com';
      jest.resetModules();
      const { errorResponse: freshErrorResponse } = require('./response');
      const error = { code: 'ERROR', message: 'Test' };
      const result = freshErrorResponse(403, error, 'https://admin.example.com');

      expect(result.headers!['Access-Control-Allow-Origin']).toBe('https://admin.example.com');
    });

    it('includes extra headers when provided', () => {
      const { errorResponse: er } = require('./response');
      const error = { code: 'ERROR', message: 'Test' };
      const result = er(500, error, undefined, {
        'X-Request-ID': 'req-123',
      });

      expect(result.headers!['X-Request-ID']).toBe('req-123');
    });

    it('handles error without details', () => {
      const { errorResponse: er } = require('./response');
      const error = { code: 'ERROR', message: 'Simple error' };
      const result = er(400, error);

      expect(JSON.parse(result.body!)).toEqual(error);
    });

    it('handles error with null details', () => {
      const { errorResponse: er } = require('./response');
      const error = { code: 'ERROR', message: 'Error', details: null };
      const result = er(400, error);

      expect(JSON.parse(result.body!)).toEqual(error);
    });
  });
});


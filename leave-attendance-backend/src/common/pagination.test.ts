import { normalizePagination, buildPaginationResult, parseSort } from './pagination';
import { ValidationError } from './errors';

describe('pagination utilities', () => {
  describe('normalizePagination', () => {
    beforeEach(() => {
      delete process.env.MAX_PAGE_SIZE;
    });

    it('returns defaults when no input provided', () => {
      const result = normalizePagination({});
      expect(result).toEqual({
        page: 1,
        size: 25,
        sort: 'created_at,desc',
      });
    });

    it('parses valid page and size', () => {
      const result = normalizePagination({
        page: '2',
        size: '50',
      });
      expect(result).toEqual({
        page: 2,
        size: 50,
        sort: 'created_at,desc',
      });
    });

    it('uses provided sort value', () => {
      const result = normalizePagination({
        sort: 'name,asc',
      });
      expect(result.sort).toBe('name,asc');
    });

    it('throws ValidationError when page is not a number', () => {
      expect(() => normalizePagination({ page: 'abc' })).toThrow(ValidationError);
    });

    it('throws ValidationError when page is less than 1', () => {
      expect(() => normalizePagination({ page: '0' })).toThrow(ValidationError);
      expect(() => normalizePagination({ page: '-1' })).toThrow(ValidationError);
    });

    it('throws ValidationError when size is less than 1', () => {
      expect(() => normalizePagination({ size: '0' })).toThrow(ValidationError);
      expect(() => normalizePagination({ size: '-5' })).toThrow(ValidationError);
    });

    it('throws ValidationError when size exceeds MAX_PAGE_SIZE', () => {
      const originalMaxSize = process.env.MAX_PAGE_SIZE;
      try {
        process.env.MAX_PAGE_SIZE = '100';
        jest.resetModules();
        const { normalizePagination: freshNormalize } = require('./pagination');
        const { ValidationError: FreshValidationError } = require('./errors');
        expect(() => freshNormalize({ size: '101' })).toThrow(FreshValidationError);
      } finally {
        if (originalMaxSize) {
          process.env.MAX_PAGE_SIZE = originalMaxSize;
        } else {
          delete process.env.MAX_PAGE_SIZE;
        }
        jest.resetModules();
      }
    });

    it('uses MAX_PAGE_SIZE from env when set', () => {
      const originalMaxSize = process.env.MAX_PAGE_SIZE;
      try {
        process.env.MAX_PAGE_SIZE = '50';
        jest.resetModules();
        const { normalizePagination: freshNormalize } = require('./pagination');
        const { ValidationError: FreshValidationError } = require('./errors');
        expect(() => freshNormalize({ size: '51' })).toThrow(FreshValidationError);
        expect(() => freshNormalize({ size: '50' })).not.toThrow();
      } finally {
        if (originalMaxSize) {
          process.env.MAX_PAGE_SIZE = originalMaxSize;
        } else {
          delete process.env.MAX_PAGE_SIZE;
        }
        jest.resetModules();
      }
    });

    it('defaults MAX_PAGE_SIZE to 100 when not set', () => {
      const originalMaxSize = process.env.MAX_PAGE_SIZE;
      try {
        delete process.env.MAX_PAGE_SIZE;
        jest.resetModules();
        const { normalizePagination: freshNormalize } = require('./pagination');
        const { ValidationError: FreshValidationError } = require('./errors');
        expect(() => freshNormalize({ size: '101' })).toThrow(FreshValidationError);
        expect(() => freshNormalize({ size: '100' })).not.toThrow();
      } finally {
        if (originalMaxSize) {
          process.env.MAX_PAGE_SIZE = originalMaxSize;
        } else {
          delete process.env.MAX_PAGE_SIZE;
        }
        jest.resetModules();
      }
    });

    it('handles page as string "1"', () => {
      const result = normalizePagination({ page: '1' });
      expect(result.page).toBe(1);
    });

    it('handles size as string "25"', () => {
      const result = normalizePagination({ size: '25' });
      expect(result.size).toBe(25);
    });
  });

  describe('buildPaginationResult', () => {
    it('builds paginated result with all fields', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 2, size: 10, sort: 'name,asc' };
      const total = 25;

      const result = buildPaginationResult(items, pagination, total);

      expect(result).toEqual({
        items,
        page: 2,
        size: 10,
        total: 25,
      });
    });

    it('uses page from pagination input', () => {
      const result = buildPaginationResult([], { page: 5, size: 20 }, 100);
      expect(result.page).toBe(5);
    });

    it('uses size from pagination input', () => {
      const result = buildPaginationResult([], { page: 1, size: 50 }, 100);
      expect(result.size).toBe(50);
    });

    it('defaults page to 1 when not provided', () => {
      const result = buildPaginationResult([], { size: 10 } as any, 100);
      expect(result.page).toBe(1);
    });

    it('defaults size to items length when not provided', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = buildPaginationResult(items, { page: 1 } as any, 100);
      expect(result.size).toBe(3);
    });
  });

  describe('parseSort', () => {
    const allowedFields = ['created_at', 'name', 'email'] as const;

    it('parses valid sort string with ASC direction', () => {
      const result = parseSort('name,asc', allowedFields);
      expect(result).toEqual({
        field: 'name',
        direction: 'ASC',
      });
    });

    it('parses valid sort string with DESC direction', () => {
      const result = parseSort('email,desc', allowedFields);
      expect(result).toEqual({
        field: 'email',
        direction: 'DESC',
      });
    });

    it('defaults to first allowed field when field is invalid', () => {
      const result = parseSort('invalid_field,asc', allowedFields);
      expect(result).toEqual({
        field: 'created_at',
        direction: 'ASC',
      });
    });

    it('defaults to DESC when direction is invalid', () => {
      const result = parseSort('name,invalid', allowedFields);
      expect(result).toEqual({
        field: 'name',
        direction: 'DESC',
      });
    });

    it('uses default sort when input is undefined', () => {
      const result = parseSort(undefined, allowedFields, 'email,asc');
      expect(result).toEqual({
        field: 'email',
        direction: 'ASC',
      });
    });

    it('uses default sort when input is undefined and default is DESC', () => {
      const result = parseSort(undefined, allowedFields);
      expect(result).toEqual({
        field: 'created_at',
        direction: 'DESC',
      });
    });

    it('handles case-insensitive direction', () => {
      expect(parseSort('name,asc', allowedFields).direction).toBe('ASC');
      expect(parseSort('name,ASC', allowedFields).direction).toBe('ASC');
      expect(parseSort('name,AsC', allowedFields).direction).toBe('ASC');
      expect(parseSort('name,desc', allowedFields).direction).toBe('DESC');
      expect(parseSort('name,DESC', allowedFields).direction).toBe('DESC');
    });

    it('handles missing direction (defaults to DESC)', () => {
      const result = parseSort('name,', allowedFields);
      expect(result).toEqual({
        field: 'name',
        direction: 'DESC',
      });
    });

    it('handles sort string without comma', () => {
      const result = parseSort('name', allowedFields);
      expect(result).toEqual({
        field: 'name',
        direction: 'DESC',
      });
    });
  });
});


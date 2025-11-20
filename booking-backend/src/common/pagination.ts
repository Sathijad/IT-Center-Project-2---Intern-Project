import { PaginationInput, PaginatedResult } from './types';
import { ValidationError } from './errors';

const MAX_PAGE_SIZE = Number(process.env.MAX_PAGE_SIZE || 100);

export interface PaginationQueryParams {
  page?: string;
  size?: string;
  sort?: string;
}

export const normalizePagination = (input: PaginationQueryParams): PaginationInput => {
  const page = input.page ? Number(input.page) : 1;
  const size = input.size ? Number(input.size) : 25;
  const sort = input.sort ?? 'created_at,desc';

  if (!Number.isFinite(page) || page < 1) {
    throw new ValidationError('`page` must be a positive integer');
  }

  if (!Number.isFinite(size) || size < 1 || size > MAX_PAGE_SIZE) {
    throw new ValidationError(`\`size\` must be between 1 and ${MAX_PAGE_SIZE}`);
  }

  return { page, size, sort };
};

export const buildPaginationResult = <T>(
  items: T[],
  pagination: PaginationInput,
  total: number,
): PaginatedResult<T> => ({
  items,
  page: pagination.page ?? 1,
  size: pagination.size ?? items.length,
  total,
});

export const parseSort = (
  sort: string | undefined,
  allowedFields: readonly string[],
  defaultSort = 'created_at,desc',
): { field: string; direction: 'ASC' | 'DESC' } => {
  const value = sort ?? defaultSort;
  const [rawField, rawDirection] = value.split(',');
  const field = allowedFields.includes(rawField) ? rawField : allowedFields[0];
  const direction = rawDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return { field, direction };
};


import { PaginationInput, PaginatedResult } from './types';
export interface PaginationQueryParams {
    page?: string;
    size?: string;
    sort?: string;
}
export declare const normalizePagination: (input: PaginationQueryParams) => PaginationInput;
export declare const buildPaginationResult: <T>(items: T[], pagination: PaginationInput, total: number) => PaginatedResult<T>;
export declare const parseSort: (sort: string | undefined, allowedFields: readonly string[], defaultSort?: string) => {
    field: string;
    direction: "ASC" | "DESC";
};

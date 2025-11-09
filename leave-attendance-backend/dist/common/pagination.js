"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSort = exports.buildPaginationResult = exports.normalizePagination = void 0;
const errors_1 = require("./errors");
const MAX_PAGE_SIZE = Number(process.env.MAX_PAGE_SIZE || 100);
const normalizePagination = (input) => {
    const page = input.page ? Number(input.page) : 1;
    const size = input.size ? Number(input.size) : 25;
    const sort = input.sort ?? 'created_at,desc';
    if (!Number.isFinite(page) || page < 1) {
        throw new errors_1.ValidationError('`page` must be a positive integer');
    }
    if (!Number.isFinite(size) || size < 1 || size > MAX_PAGE_SIZE) {
        throw new errors_1.ValidationError(`\`size\` must be between 1 and ${MAX_PAGE_SIZE}`);
    }
    return { page, size, sort };
};
exports.normalizePagination = normalizePagination;
const buildPaginationResult = (items, pagination, total) => ({
    items,
    page: pagination.page ?? 1,
    size: pagination.size ?? items.length,
    total,
});
exports.buildPaginationResult = buildPaginationResult;
const parseSort = (sort, allowedFields, defaultSort = 'created_at,desc') => {
    const value = sort ?? defaultSort;
    const [rawField, rawDirection] = value.split(',');
    const field = allowedFields.includes(rawField) ? rawField : allowedFields[0];
    const direction = rawDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    return { field, direction };
};
exports.parseSort = parseSort;
//# sourceMappingURL=pagination.js.map
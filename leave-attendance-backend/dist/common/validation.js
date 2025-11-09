"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePathParameters = exports.parseQuery = exports.parseBody = void 0;
const zod_1 = require("zod");
const errors_1 = require("./errors");
const parseWithSchema = (schema, payload) => {
    try {
        return schema.parse(payload);
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            throw new errors_1.ValidationError('Validation failed', { issues: error.issues });
        }
        throw error;
    }
};
const parseBody = (schema, body) => {
    if (!body) {
        throw new errors_1.ValidationError('Request body is required');
    }
    let parsed;
    try {
        parsed = JSON.parse(body);
    }
    catch (error) {
        throw new errors_1.ValidationError('Invalid JSON body');
    }
    return parseWithSchema(schema, parsed);
};
exports.parseBody = parseBody;
const parseQuery = (schema, queryParams) => {
    return parseWithSchema(schema, queryParams ?? {});
};
exports.parseQuery = parseQuery;
const parsePathParameters = (schema, params) => {
    return parseWithSchema(schema, params ?? {});
};
exports.parsePathParameters = parsePathParameters;
//# sourceMappingURL=validation.js.map
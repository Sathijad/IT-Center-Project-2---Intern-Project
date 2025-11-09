"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const formatMessage = (level, message, context, meta) => {
    const base = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...context,
    };
    if (meta !== undefined) {
        return JSON.stringify({ ...base, meta });
    }
    return JSON.stringify(base);
};
exports.logger = {
    debug(message, context, meta) {
        console.debug(formatMessage('debug', message, context, meta));
    },
    info(message, context, meta) {
        console.info(formatMessage('info', message, context, meta));
    },
    warn(message, context, meta) {
        console.warn(formatMessage('warn', message, context, meta));
    },
    error(message, context, meta) {
        console.error(formatMessage('error', message, context, meta));
    },
};
//# sourceMappingURL=logger.js.map
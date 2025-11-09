"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const msGraphService_1 = require("../../services/msGraphService");
const logger_1 = require("../../common/logger");
const errors_1 = require("../../common/errors");
const service = new msGraphService_1.MsGraphService();
const handler = async (event) => {
    for (const record of event.Records) {
        try {
            const message = JSON.parse(record.body);
            if (!message.requestId) {
                throw new errors_1.ApplicationError('INVALID_MESSAGE', 'Message missing requestId', 400);
            }
            await service.syncLeaveRequest(message.requestId);
            logger_1.logger.info('Calendar sync processed', { requestId: message.requestId.toString() });
        }
        catch (error) {
            logger_1.logger.error('Failed to process calendar sync message', { messageId: record.messageId }, { error });
            throw error;
        }
    }
};
exports.handler = handler;
//# sourceMappingURL=msgraphSyncWorker.js.map
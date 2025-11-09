"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsGraphService = void 0;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const leaveRepository_1 = require("../repositories/leaveRepository");
const errors_1 = require("../common/errors");
const logger_1 = require("../common/logger");
const isFifoQueue = (queueUrl) => queueUrl.endsWith('.fifo');
const isCalendarSyncEnabled = () => process.env.CALENDAR_SYNC_ENABLED?.toLowerCase() === 'true';
class MsGraphService {
    leaveRepository;
    sqsClient = new client_sqs_1.SQSClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
    constructor(leaveRepository = new leaveRepository_1.LeaveRepository()) {
        this.leaveRepository = leaveRepository;
    }
    async enqueueCalendarSync(requestId) {
        if (!isCalendarSyncEnabled()) {
            logger_1.logger.info('Calendar sync disabled, skipping enqueue', { requestId });
            return;
        }
        const queueUrl = process.env.CALENDAR_SYNC_QUEUE_URL;
        if (!queueUrl) {
            throw new errors_1.ApplicationError('QUEUE_NOT_CONFIGURED', 'Calendar sync queue URL is not configured', 500);
        }
        const message = { requestId, attempt: 1 };
        const command = new client_sqs_1.SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify(message),
            ...(isFifoQueue(queueUrl)
                ? {
                    MessageGroupId: `leave-${requestId}`,
                    MessageDeduplicationId: `leave-${requestId}-${Date.now().toString()}`,
                }
                : {}),
        });
        await this.sqsClient.send(command);
        logger_1.logger.info('Enqueued calendar sync', { requestId });
    }
    async syncLeaveRequest(requestId) {
        if (!isCalendarSyncEnabled()) {
            logger_1.logger.info('Calendar sync disabled, skipping sync', { requestId });
            return;
        }
        const leaveRequest = await this.leaveRepository.getLeaveRequestById(requestId);
        if (!leaveRequest || leaveRequest.status !== 'APPROVED') {
            throw new errors_1.ApplicationError('LEAVE_NOT_APPROVED', 'Leave request is not approved', 409);
        }
        const tenantId = process.env.GRAPH_TENANT;
        const clientId = process.env.GRAPH_CLIENT_ID;
        const clientSecret = process.env.GRAPH_CLIENT_SECRET;
        const scope = process.env.GRAPH_SCOPE || 'https://graph.microsoft.com/.default';
        if (!tenantId || !clientId || !clientSecret) {
            throw new errors_1.ApplicationError('GRAPH_CONFIG_MISSING', 'Microsoft Graph credentials not configured', 500);
        }
        const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                scope,
                grant_type: 'client_credentials',
            }),
        });
        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            throw new errors_1.ApplicationError('GRAPH_TOKEN_ERROR', errorText, tokenResponse.status);
        }
        const tokenData = (await tokenResponse.json());
        const accessToken = tokenData.access_token;
        if (!accessToken) {
            throw new errors_1.ApplicationError('GRAPH_TOKEN_ERROR', 'Access token missing from response', 500);
        }
        const eventResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${leaveRequest.userEmail}/calendar/events`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subject: `Leave: ${leaveRequest.policyName}`,
                body: {
                    contentType: 'HTML',
                    content: leaveRequest.reason ?? 'Leave request',
                },
                start: {
                    dateTime: `${leaveRequest.startDate}T00:00:00`,
                    timeZone: 'UTC',
                },
                end: {
                    dateTime: `${leaveRequest.endDate}T23:59:59`,
                    timeZone: 'UTC',
                },
                isAllDay: !leaveRequest.halfDay,
            }),
        });
        if (!eventResponse.ok) {
            const errorText = await eventResponse.text();
            throw new errors_1.ApplicationError('GRAPH_EVENT_ERROR', errorText, eventResponse.status);
        }
        const event = (await eventResponse.json());
        await this.leaveRepository.updateGraphEventId(requestId, event.id);
        logger_1.logger.info('Leave request synced to Microsoft Graph', { requestId, eventId: event.id });
    }
}
exports.MsGraphService = MsGraphService;
//# sourceMappingURL=msGraphService.js.map
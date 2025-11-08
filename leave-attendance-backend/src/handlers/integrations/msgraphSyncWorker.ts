import { MsGraphService } from '../../services/msGraphService';
import { logger } from '../../common/logger';
import { ApplicationError } from '../../common/errors';

const service = new MsGraphService();

interface CalendarSyncMessage {
  requestId: number;
  attempt?: number;
}

interface SQSEventRecord {
  messageId: string;
  body: string;
}

interface SQSEvent {
  Records: SQSEventRecord[];
}

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body) as CalendarSyncMessage;
      if (!message.requestId) {
        throw new ApplicationError('INVALID_MESSAGE', 'Message missing requestId', 400);
      }

      await service.syncLeaveRequest(message.requestId);
      logger.info('Calendar sync processed', { requestId: message.requestId.toString() });
    } catch (error) {
      logger.error('Failed to process calendar sync message', { messageId: record.messageId }, { error });
      throw error;
    }
  }
};


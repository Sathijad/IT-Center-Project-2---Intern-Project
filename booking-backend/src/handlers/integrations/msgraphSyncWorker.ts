import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { MsGraphBookingService } from '../../services/msGraphBookingService';
import { logger } from '../../common/logger';

interface BookingSyncMessage {
  bookingId: number;
  action: 'create' | 'update' | 'delete';
  attempt?: number;
}

const graphService = new MsGraphBookingService();

const processRecord = async (record: SQSRecord): Promise<void> => {
  const messageBody = JSON.parse(record.body) as BookingSyncMessage;
  const { bookingId, action, attempt = 1 } = messageBody;

  logger.info('Processing booking sync', { bookingId, action, attempt, messageId: record.messageId });

  try {
    await graphService.syncBooking(bookingId, action);
    logger.info('Booking sync completed', { bookingId, action });
  } catch (error) {
    logger.error('Booking sync failed', { bookingId, action, attempt }, { error });
    // Re-throw to trigger SQS retry/DLQ
    throw error;
  }
};

export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
  logger.info('Booking sync worker invoked', {
    requestId: context.awsRequestId,
    recordCount: event.Records.length,
  });

  const results = await Promise.allSettled(event.Records.map(processRecord));

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    logger.error('Some booking syncs failed', {
      total: results.length,
      failed: failures.length,
    });
    // Throw to trigger SQS retry
    throw new Error(`${failures.length} of ${results.length} sync jobs failed`);
  }

  logger.info('All booking syncs completed successfully', { count: results.length });
};


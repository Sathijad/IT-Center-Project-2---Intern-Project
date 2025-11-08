import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

export const integrationsRouter = express.Router();
const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });

// Queue calendar sync
integrationsRouter.post('/msgraph/sync',
  authenticate,
  authorize('ADMIN'),
  async (req, res) => {
    const { request_id } = req.body;

    if (!request_id) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'request_id is required',
        traceId: req.traceId
      });
    }

    // Queue message to SQS
    const queueUrl = process.env.CALENDAR_SYNC_QUEUE_URL;
    if (!queueUrl) {
      return res.status(503).json({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Calendar sync queue not configured',
        traceId: req.traceId
      });
    }

    try {
      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({
          request_id,
          timestamp: new Date().toISOString()
        })
      });

      await sqsClient.send(command);

      res.status(202).json({
        message: 'Calendar sync queued successfully',
        request_id
      });
    } catch (error) {
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Failed to queue calendar sync',
        traceId: req.traceId
      });
    }
  }
);


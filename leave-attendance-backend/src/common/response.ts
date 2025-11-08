import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { StandardErrorBody } from './types';

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const baseHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type,Idempotency-Key,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
};

const resolveOrigin = (requestOrigin?: string): string => {
  if (!requestOrigin) {
    return allowedOrigins[0] || '*';
  }

  if (allowedOrigins.length === 0) {
    return requestOrigin;
  }

  return allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
};

export const successResponse = <T>(
  statusCode: number,
  payload: T,
  requestOrigin?: string,
  extraHeaders?: Record<string, string>,
): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: {
    ...baseHeaders,
    'Access-Control-Allow-Origin': resolveOrigin(requestOrigin),
    ...extraHeaders,
  },
  body: JSON.stringify(payload),
});

export const errorResponse = (
  statusCode: number,
  error: StandardErrorBody,
  requestOrigin?: string,
  extraHeaders?: Record<string, string>,
): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: {
    ...baseHeaders,
    'Access-Control-Allow-Origin': resolveOrigin(requestOrigin),
    ...extraHeaders,
  },
  body: JSON.stringify(error),
});


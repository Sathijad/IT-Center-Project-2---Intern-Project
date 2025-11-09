import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { StandardErrorBody } from './types';
export declare const successResponse: <T>(statusCode: number, payload: T, requestOrigin?: string, extraHeaders?: Record<string, string>) => APIGatewayProxyStructuredResultV2;
export declare const errorResponse: (statusCode: number, error: StandardErrorBody, requestOrigin?: string, extraHeaders?: Record<string, string>) => APIGatewayProxyStructuredResultV2;

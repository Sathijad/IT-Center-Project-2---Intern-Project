// Mock dependencies BEFORE imports
const mockAuthenticateRequest = jest.fn();
const mockSuccessResponse = jest.fn();
const mockErrorResponse = jest.fn();
const mockToApplicationError = jest.fn((error: any) => ({
  statusCode: error.statusCode || 500,
  code: error.code || 'INTERNAL_ERROR',
  message: error.message || 'Internal server error',
  details: error.details,
}));

jest.mock('../../common/auth', () => ({
  authenticateRequest: mockAuthenticateRequest,
}));

jest.mock('../../common/response', () => ({
  successResponse: mockSuccessResponse,
  errorResponse: mockErrorResponse,
}));

jest.mock('../../common/errors', () => ({
  toApplicationError: mockToApplicationError,
}));

const mockParseBody = jest.fn();

jest.mock('../../common/validation', () => ({
  parseBody: mockParseBody,
}));

// Create a shared mock service instance that will be used by all tests
const mockServiceInstance = {
  clockIn: jest.fn(),
};

jest.mock('../../services/attendanceService', () => {
  return {
    AttendanceService: jest.fn().mockImplementation(() => mockServiceInstance),
  };
});

jest.mock('../../common/handler', () => {
  return {
    createHandler: jest.fn((fn: any) => {
      return async (event: any, context: any) => {
        const user = await mockAuthenticateRequest(event);
        try {
          const result = await fn({ event, user, context });
          if (result && typeof result === 'object' && 'statusCode' in result) {
            return result;
          }
          return mockSuccessResponse(200, result, event.headers?.origin || event.headers?.Origin);
        } catch (error) {
          const appError = mockToApplicationError(error);
          return mockErrorResponse(
            appError.statusCode,
            {
              code: appError.code,
              message: appError.message,
              details: appError.details,
              requestId: context.awsRequestId,
            },
            event.headers?.origin || event.headers?.Origin,
          );
        }
      };
    }),
  };
});

import { handler } from './clockIn';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';

describe('clockIn handler', () => {
  // Use the shared mock instance
  const mockUser = {
    userId: 100,
    email: 'user@example.com',
    roles: ['EMPLOYEE'],
    displayName: 'Test User',
    teamId: 10,
    sub: 'test-sub',
  };

  const createEvent = (body?: Record<string, any>): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'POST /attendance/clock-in',
    rawPath: '/attendance/clock-in',
    rawQueryString: '',
    headers: { origin: 'https://app.example.com' },
    body: body ? JSON.stringify(body) : undefined,
    requestContext: {
      accountId: '123456789',
      apiId: 'test-api',
      domainName: 'test.example.com',
      domainPrefix: 'test',
      http: {
        method: 'POST',
        path: '/attendance/clock-in',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: 'test-request-id',
      routeKey: 'POST /attendance/clock-in',
      stage: 'test',
      time: '01/Jan/2024:00:00:00 +0000',
      timeEpoch: 1704067200000,
    },
    isBase64Encoded: false,
  });

  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:region:account:function:test',
    memoryLimitInMB: '128',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/test',
    logStreamName: '2024/01/01/[$LATEST]test',
    getRemainingTimeInMillis: () => 30000,
    done: jest.fn(),
    fail: jest.fn(),
    succeed: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSuccessResponse.mockReturnValue({
      statusCode: 201,
      headers: {},
      body: JSON.stringify({}),
    });
    
    mockAuthenticateRequest.mockResolvedValue(mockUser);
    // Default parseBody mock - can be overridden in individual tests
    mockParseBody.mockImplementation((schema: any, body: string) => {
      return JSON.parse(body || '{}');
    });
  });

  it('clocks in successfully with coordinates', async () => {
    const mockLog = {
      logId: 123,
      userId: 100,
      clockIn: '2025-03-10T09:00:00Z',
      clockOut: null,
      latitude: -37.8136,
      longitude: 144.9631,
    };

    mockServiceInstance.clockIn.mockResolvedValue(mockLog as any);

    const event = createEvent({
      latitude: -37.8136,
      longitude: 144.9631,
      source: 'mobile',
    });
    const result = await handler(event, mockContext);

    expect(mockServiceInstance.clockIn).toHaveBeenCalledWith(
      mockUser,
      expect.objectContaining({
        latitude: -37.8136,
        longitude: 144.9631,
        source: 'mobile',
      }),
    );
    expect(mockSuccessResponse).toHaveBeenCalledWith(201, mockLog, 'https://app.example.com');
    expect(result.statusCode).toBe(201);
  });

  it('clocks in with timestamp', async () => {
    const mockLog = { logId: 123, clockIn: '2025-03-10T09:00:00Z' };
    mockServiceInstance.clockIn.mockResolvedValue(mockLog as any);

    const event = createEvent({ timestamp: '2025-03-10T09:00:00Z' });
    await handler(event, mockContext);

    expect(mockServiceInstance.clockIn).toHaveBeenCalledWith(
      mockUser,
      expect.objectContaining({
        timestamp: '2025-03-10T09:00:00Z',
      }),
    );
  });

  it('handles empty body', async () => {
    const mockLog = { logId: 123, clockIn: new Date().toISOString() };
    mockServiceInstance.clockIn.mockResolvedValue(mockLog as any);

    const event = createEvent();
    await handler(event, mockContext);

    expect(mockServiceInstance.clockIn).toHaveBeenCalledWith(mockUser, {});
  });
});

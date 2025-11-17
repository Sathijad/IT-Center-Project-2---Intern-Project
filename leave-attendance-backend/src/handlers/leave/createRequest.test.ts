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

// Create a shared mock service instance that will be used by all tests
const mockServiceInstance = {
  createRequest: jest.fn(),
};

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

jest.mock('../../services/leaveService', () => {
  return {
    LeaveService: jest.fn().mockImplementation(() => mockServiceInstance),
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

import { handler } from './createRequest';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';

describe('createRequest handler', () => {
  // Use the shared mock instance
  const mockEvent: APIGatewayProxyEventV2 = {
    version: '2.0',
    routeKey: 'POST /leave/requests',
    rawPath: '/leave/requests',
    rawQueryString: '',
    headers: {
      origin: 'https://app.example.com',
      'content-type': 'application/json',
    },
    requestContext: {
      accountId: '123456789',
      apiId: 'test-api',
      domainName: 'test.example.com',
      domainPrefix: 'test',
      http: {
        method: 'POST',
        path: '/leave/requests',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: 'test-request-id',
      routeKey: 'POST /leave/requests',
      stage: 'test',
      time: '01/Jan/2024:00:00:00 +0000',
      timeEpoch: 1704067200000,
    },
    body: JSON.stringify({
      policy_id: 1,
      start_date: '2025-03-10',
      end_date: '2025-03-12',
      reason: 'Vacation',
    }),
    isBase64Encoded: false,
  };

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

  const mockUser = {
    userId: 100,
    email: 'user@example.com',
    roles: ['EMPLOYEE'],
    displayName: 'Test User',
    teamId: 10,
    sub: 'test-sub',
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

  it('creates leave request successfully', async () => {
    const mockRequest = {
      requestId: 123,
      userId: 100,
      policyId: 1,
      startDate: '2025-03-10',
      endDate: '2025-03-12',
      status: 'PENDING',
      daysRequested: 3,
    };

    mockServiceInstance.createRequest.mockResolvedValue(mockRequest as any);

    const result = await handler(mockEvent, mockContext);

    expect(mockAuthenticateRequest).toHaveBeenCalledWith(mockEvent);
    expect(mockServiceInstance.createRequest).toHaveBeenCalledWith(
      mockUser,
      expect.objectContaining({
        policyId: 1,
        startDate: '2025-03-10',
        endDate: '2025-03-12',
        reason: 'Vacation',
      }),
    );
    expect(mockSuccessResponse).toHaveBeenCalledWith(201, mockRequest, 'https://app.example.com');
    expect(result.statusCode).toBe(201);
  });

  it('handles idempotency key from headers', async () => {
    const eventWithIdempotency = {
      ...mockEvent,
      headers: {
        ...mockEvent.headers,
        'idempotency-key': 'test-key-123',
      },
    };

    mockServiceInstance.createRequest.mockResolvedValue({ requestId: 123 } as any);

    await handler(eventWithIdempotency, mockContext);

    expect(mockServiceInstance.createRequest).toHaveBeenCalledWith(
      mockUser,
      expect.objectContaining({
        idempotencyKey: 'test-key-123',
      }),
    );
  });

  it('handles case-insensitive idempotency key header', async () => {
    const eventWithIdempotency = {
      ...mockEvent,
      headers: {
        ...mockEvent.headers,
        'Idempotency-Key': 'test-key-456',
      },
    };

    mockServiceInstance.createRequest.mockResolvedValue({ requestId: 123 } as any);

    await handler(eventWithIdempotency, mockContext);

    expect(mockServiceInstance.createRequest).toHaveBeenCalledWith(
      mockUser,
      expect.objectContaining({
        idempotencyKey: 'test-key-456',
      }),
    );
  });

  it('handles half_day flag', async () => {
    const eventWithHalfDay = {
      ...mockEvent,
      body: JSON.stringify({
        policy_id: 1,
        start_date: '2025-03-10',
        end_date: '2025-03-10',
        half_day: true,
      }),
    };

    mockServiceInstance.createRequest.mockResolvedValue({ requestId: 123 } as any);

    await handler(eventWithHalfDay, mockContext);

    expect(mockServiceInstance.createRequest).toHaveBeenCalledWith(
      mockUser,
      expect.objectContaining({
        halfDay: true,
      }),
    );
  });
});


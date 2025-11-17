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
  ForbiddenError: class ForbiddenError extends Error {
    statusCode = 403;
    code = 'FORBIDDEN';
  },
}));

const mockParseQuery = jest.fn();

jest.mock('../../common/validation', () => ({
  parseQuery: mockParseQuery,
}));

// Create a shared mock service instance that will be used by all tests
const mockServiceInstance = {
  getBalances: jest.fn(),
};

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

import { handler } from './getBalance';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';

describe('getBalance handler', () => {
  // Use the shared mock instance
  const mockEmployee = {
    userId: 100,
    email: 'user@example.com',
    roles: ['EMPLOYEE'],
    displayName: 'Test User',
    teamId: 10,
    sub: 'test-sub',
  };

  const mockAdmin = {
    userId: 200,
    email: 'admin@example.com',
    roles: ['ADMIN'],
    displayName: 'Admin User',
    teamId: 10,
    sub: 'admin-sub',
  };

  const createEvent = (queryParams?: Record<string, string>): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'GET /leave/balance',
    rawPath: '/leave/balance',
    rawQueryString: queryParams ? new URLSearchParams(queryParams).toString() : '',
    headers: { origin: 'https://app.example.com' },
    queryStringParameters: queryParams,
    requestContext: {
      accountId: '123456789',
      apiId: 'test-api',
      domainName: 'test.example.com',
      domainPrefix: 'test',
      http: {
        method: 'GET',
        path: '/leave/balance',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: 'test-request-id',
      routeKey: 'GET /leave/balance',
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
      statusCode: 200,
      headers: {},
      body: JSON.stringify({}),
    });
    
    // Default parseQuery mock - returns empty object, can be overridden in tests
    mockParseQuery.mockReturnValue({});
  });

  it('returns balances for current user', async () => {
    const mockBalances = [
      { policyId: 1, policyName: 'Annual Leave', balanceDays: 15, year: 2025 },
    ];

    mockParseQuery.mockReturnValue({});
    mockAuthenticateRequest.mockResolvedValue(mockEmployee);
    mockServiceInstance.getBalances.mockResolvedValue(mockBalances as any);

    const event = createEvent();
    const result = await handler(event, mockContext);

    expect(mockServiceInstance.getBalances).toHaveBeenCalledWith(100, undefined);
    expect(mockSuccessResponse).toHaveBeenCalledWith(
      200,
      expect.objectContaining({
        userId: 100,
        balances: mockBalances,
      }),
      'https://app.example.com',
    );
    expect(result.statusCode).toBe(200);
  });

  it('allows admin to view other user balances', async () => {
    const mockBalances = [
      { policyId: 1, policyName: 'Annual Leave', balanceDays: 10, year: 2025 },
    ];

    mockParseQuery.mockReturnValue({ user_id: '999', year: '2025' });
    mockAuthenticateRequest.mockResolvedValue(mockAdmin);
    mockServiceInstance.getBalances.mockResolvedValue(mockBalances as any);

    const event = createEvent({ user_id: '999', year: '2025' });
    await handler(event, mockContext);

    expect(mockServiceInstance.getBalances).toHaveBeenCalledWith(999, 2025);
  });

  it('throws ForbiddenError when employee tries to view other user balance', async () => {
    mockParseQuery.mockReturnValue({ user_id: '999' });
    mockAuthenticateRequest.mockResolvedValue(mockEmployee);
    mockToApplicationError.mockReturnValue({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Forbidden',
      details: undefined,
    });
    mockErrorResponse.mockReturnValue({
      statusCode: 403,
      headers: {},
      body: JSON.stringify({}),
    });

    const event = createEvent({ user_id: '999' });
    const result = await handler(event, mockContext);

    expect(mockServiceInstance.getBalances).not.toHaveBeenCalled();
    expect(result.statusCode).toBe(403);
  });

  it('uses current year when year not provided', async () => {
    const currentYear = new Date().getUTCFullYear();
    mockParseQuery.mockReturnValue({});
    mockAuthenticateRequest.mockResolvedValue(mockEmployee);
    mockServiceInstance.getBalances.mockResolvedValue([]);

    const event = createEvent();
    await handler(event, mockContext);

    expect(mockServiceInstance.getBalances).toHaveBeenCalledWith(100, undefined);
  });
});

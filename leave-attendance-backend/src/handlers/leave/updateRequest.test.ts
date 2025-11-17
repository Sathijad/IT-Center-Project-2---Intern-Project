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
const mockParsePathParameters = jest.fn();

jest.mock('../../common/validation', () => ({
  parseBody: mockParseBody,
  parsePathParameters: mockParsePathParameters,
}));

// Create a shared mock service instance that will be used by all tests
const mockServiceInstance = {
  updateRequest: jest.fn(),
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

import { handler } from './updateRequest';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';

describe('updateRequest handler', () => {
  // Use the shared mock instance
  const mockUser = {
    userId: 100,
    email: 'user@example.com',
    roles: ['ADMIN'],
    displayName: 'Admin User',
    teamId: 10,
    sub: 'admin-sub',
  };

  const createEvent = (body?: Record<string, any>): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'PUT /leave/requests/{requestId}',
    rawPath: '/leave/requests/123',
    rawQueryString: '',
    headers: { origin: 'https://app.example.com' },
    pathParameters: { requestId: '123' },
    body: body ? JSON.stringify(body) : undefined,
    requestContext: {
      accountId: '123456789',
      apiId: 'test-api',
      domainName: 'test.example.com',
      domainPrefix: 'test',
      http: {
        method: 'PUT',
        path: '/leave/requests/123',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: 'test-request-id',
      routeKey: 'PUT /leave/requests/{requestId}',
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
    
    mockAuthenticateRequest.mockResolvedValue(mockUser);
    mockParsePathParameters.mockReturnValue({ id: '123' });
    mockParseBody.mockReturnValue({ action: 'APPROVE', notes: undefined });
  });

  it('approves leave request successfully', async () => {
    const mockUpdated = {
      requestId: 123,
      status: 'APPROVED',
      userId: 100,
    };

    mockParsePathParameters.mockReturnValue({ id: '123' });
    mockParseBody.mockReturnValue({ action: 'APPROVE', notes: 'Approved' });
    mockServiceInstance.updateRequest.mockResolvedValue(mockUpdated as any);

    const event = createEvent({ action: 'APPROVE', notes: 'Approved' });
    const result = await handler(event, mockContext);

    expect(mockServiceInstance.updateRequest).toHaveBeenCalledWith(
      mockUser,
      expect.objectContaining({
        requestId: 123,
        action: 'APPROVE',
        notes: 'Approved',
      }),
    );
    expect(mockSuccessResponse).toHaveBeenCalledWith(200, mockUpdated, 'https://app.example.com');
    expect(result.statusCode).toBe(200);
  });

  it('rejects leave request', async () => {
    const mockUpdated = {
      requestId: 123,
      status: 'REJECTED',
      userId: 100,
    };

    mockParsePathParameters.mockReturnValue({ id: '123' });
    mockParseBody.mockReturnValue({ action: 'REJECT', notes: 'Not enough balance' });
    mockServiceInstance.updateRequest.mockResolvedValue(mockUpdated as any);

    const event = createEvent({ action: 'REJECT', notes: 'Not enough balance' });
    await handler(event, mockContext);

    expect(mockServiceInstance.updateRequest).toHaveBeenCalledWith(
      mockUser,
      expect.objectContaining({
        action: 'REJECT',
        notes: 'Not enough balance',
      }),
    );
  });

  it('cancels leave request', async () => {
    const mockUpdated = {
      requestId: 123,
      status: 'CANCELLED',
      userId: 100,
    };

    mockParsePathParameters.mockReturnValue({ id: '123' });
    mockParseBody.mockReturnValue({ action: 'CANCEL', notes: undefined });
    mockServiceInstance.updateRequest.mockResolvedValue(mockUpdated as any);

    const event = createEvent({ action: 'CANCEL' });
    await handler(event, mockContext);

    expect(mockServiceInstance.updateRequest).toHaveBeenCalledWith(
      mockUser,
      expect.objectContaining({
        action: 'CANCEL',
      }),
    );
  });

  it('parses request ID from path parameters', async () => {
    const mockUpdated = { requestId: 999, status: 'APPROVED' };
    mockParsePathParameters.mockReturnValue({ id: '999' });
    mockParseBody.mockReturnValue({ action: 'APPROVE', notes: undefined });
    mockServiceInstance.updateRequest.mockResolvedValue(mockUpdated as any);

    const event = createEvent({ action: 'APPROVE' });
    event.pathParameters = { requestId: '999' };
    await handler(event, mockContext);

    expect(mockParsePathParameters).toHaveBeenCalledWith(expect.anything(), { requestId: '999' });
    expect(mockServiceInstance.updateRequest).toHaveBeenCalledWith(
      mockUser,
      expect.objectContaining({
        requestId: 999,
      }),
    );
  });
});

// Test data constants
export const TEST_DATA = {
  // Pre-seeded test user token (for bypassing Cognito in CI)
  // In real scenarios, this would be obtained from a test auth flow
  testUserToken: process.env.TEST_USER_TOKEN || 'mock-jwt-token-for-testing',
  
  // Test user credentials
  testUser: {
    email: 'admin@itcenter.com',
    name: 'Test Admin',
    roles: ['ADMIN']
  },
  
  // Mock JWT payload (this token would need to be valid in your backend)
  mockTokenPayload: {
    sub: 'test-user-id',
    email: 'admin@itcenter.com',
    'cognito:groups': ['ADMIN'],
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // Expires in 1 hour
  }
};

// Generate a mock token from the payload
export const generateMockToken = (): string => {
  // In production, you'd use a real JWT library
  // For testing, you can use a pre-generated valid token
  return TEST_DATA.testUserToken;
};


/**
 * Authentication helper for k6 tests
 * Handles JWT token retrieval and management
 */

import http from 'k6/http';
import { check } from 'k6';

/**
 * Authenticate and get JWT token
 * This assumes you have an authentication endpoint
 * Adjust based on your actual auth setup
 */
export function authenticate(baseUrl, username, password) {
  const loginUrl = `${baseUrl}/api/v1/auth/login`;
  
  const payload = JSON.stringify({
    username: username,
    password: password,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = http.post(loginUrl, payload, params);
  
  const success = check(response, {
    'authentication status is 200': (r) => r.status === 200,
    'response has token': (r) => r.json('token') !== undefined,
  });
  
  if (success) {
    return response.json('token');
  }
  
  // Fallback: return token from environment or use mock
  return __ENV.AUTH_TOKEN || null;
}

/**
 * Get auth token from environment or authenticate
 */
export function getAuthToken(baseUrl) {
  // If token is provided in environment, use it
  if (__ENV.AUTH_TOKEN) {
    return __ENV.AUTH_TOKEN;
  }
  
  // Try to authenticate, but return mock token if it fails
  try {
    const username = __ENV.TEST_USERNAME || 'testuser@example.com';
    const password = __ENV.TEST_PASSWORD || 'testpassword';
    const token = authenticate(baseUrl, username, password);
    if (token) {
      return token;
    }
  } catch (e) {
    // Authentication failed, return mock token for testing
  }
  
  // Return mock token if authentication is not available
  return 'mock-token-for-testing';
}

/**
 * Create HTTP options with authentication
 */
export function createAuthHeaders(token) {
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
}


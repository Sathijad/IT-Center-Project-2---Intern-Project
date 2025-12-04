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
  
  // Otherwise, try to authenticate
  const username = __ENV.TEST_USERNAME || 'testuser@example.com';
  const password = __ENV.TEST_PASSWORD || 'testpassword';
  
  return authenticate(baseUrl, username, password);
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


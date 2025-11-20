import { logger } from '../common/logger';

interface AuthUserResponse {
  id: number;
  email: string;
  displayName: string | null;
  locale: string;
  roles: string[];
  createdAt: string;
  lastLogin: string | null;
}

interface AuthServiceConfig {
  baseUrl: string;
  timeout?: number;
}

export class AuthService {
  private baseUrl: string;
  private timeout: number;

  constructor(config: AuthServiceConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout || 5000;
  }

  /**
   * Fetches user details from auth-backend by cognito_sub
   * @param cognitoSub The Cognito subject identifier
   * @param authToken Optional JWT token for authentication
   * @returns User profile or null if not found
   */
  async getUserByCognitoSub(cognitoSub: string, authToken?: string): Promise<AuthUserResponse | null> {
    try {
      const url = `${this.baseUrl}/api/v1/internal/users/by-cognito-sub/${encodeURIComponent(cognitoSub)}`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          logger.warn('User not found in auth-backend', { cognitoSub, status: response.status });
          return null;
        }
        throw new Error(`Auth service returned ${response.status}: ${response.statusText}`);
      }

      const userData: AuthUserResponse = await response.json();
      logger.debug('Fetched user from auth-backend', { cognitoSub, email: userData.email });
      return userData;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('Auth service request timeout', undefined, { err: error, cognitoSub });
      } else {
        logger.error('Error fetching user from auth-backend', undefined, { err: error, cognitoSub });
      }
      return null;
    }
  }
}

// Singleton instance
let authServiceInstance: AuthService | null = null;

export const getAuthService = (): AuthService => {
  if (!authServiceInstance) {
    const baseUrl = process.env.AUTH_SERVICE_URL || process.env.AUTH_BACKEND_URL;
    if (!baseUrl) {
      logger.warn('AUTH_SERVICE_URL not configured, auth service calls will fail');
      // Create a dummy instance that will fail gracefully
      authServiceInstance = new AuthService({
        baseUrl: 'http://localhost:8080', // Fallback, but will log warnings
        timeout: Number(process.env.AUTH_SERVICE_TIMEOUT_MS || 5000),
      });
    } else {
      authServiceInstance = new AuthService({
        baseUrl,
        timeout: Number(process.env.AUTH_SERVICE_TIMEOUT_MS || 5000),
      });
    }
  }
  return authServiceInstance;
};


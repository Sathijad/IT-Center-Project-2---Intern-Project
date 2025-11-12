export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface AuthenticatedUser {
  userId: number;
  email: string;
  roles: UserRole[];
  displayName?: string | null;
  teamId?: number | null;
  sub: string;
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface PaginationInput {
  page?: number;
  size?: number;
  sort?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

export interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface StandardErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  requestId?: string;
}


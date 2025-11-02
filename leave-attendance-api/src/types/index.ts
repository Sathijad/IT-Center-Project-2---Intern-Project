// User context from JWT token
export interface UserContext {
  userId: number; // app_users.id (BIGINT)
  cognitoSub: string;
  email: string;
  roles: string[]; // ['ADMIN', 'EMPLOYEE']
  isAdmin: boolean;
}

// Express request with user context
export interface AuthenticatedRequest extends Express.Request {
  user?: UserContext;
}

// Database entity types
export interface LeavePolicy {
  id: number;
  type: string;
  maxDays: number;
  carryForward: boolean;
  accrualRate: number;
  accrualPeriod: string;
  minNoticeDays: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveRequest {
  id: number;
  userId: number;
  policyId: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  startDate: Date;
  endDate: Date;
  halfDay: 'AM' | 'PM' | null;
  reason: string | null;
  approvedBy: number | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalance {
  id: number;
  userId: number;
  policyId: number;
  balanceDays: number;
  updatedAt: Date;
}

export interface AttendanceLog {
  id: number;
  userId: number;
  clockIn: Date;
  clockOut: Date | null;
  durationMinutes: number | null;
  latitude: number | null;
  longitude: number | null;
  source: string;
  createdAt: Date;
}

export interface LeaveAudit {
  id: number;
  requestId: number;
  action: string;
  actorId: number;
  notes: string | null;
  createdAt: Date;
}

// API Request/Response types
export interface CreateLeaveRequestDto {
  policyId: number;
  startDate: string; // ISO date string
  endDate: string;
  halfDay?: 'AM' | 'PM';
  reason?: string;
}

export interface UpdateLeaveRequestDto {
  status: 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
}

export interface ClockInDto {
  latitude?: number;
  longitude?: number;
  source?: string;
}

export interface ClockOutDto {
  source?: string;
}

export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
}


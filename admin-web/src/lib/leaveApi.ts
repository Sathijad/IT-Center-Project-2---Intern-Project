import axios from 'axios'
import { config } from '../config/env'

// Phase 2 API client for leave endpoints (port 3000)
const leaveApi = axios.create({
  baseURL: config.LEAVE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token interceptor
leaveApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors
leaveApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login on 401 (unauthorized), not on 500 errors
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('id_token')
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export interface LeaveRequest {
  requestId: number
  userId: number
  userName: string | null
  userEmail: string
  userTeamId: number | null
  policyId: number
  policyName: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  startDate: string
  endDate: string
  halfDay: boolean
  reason: string | null
  createdAt: string
  updatedAt: string
  daysRequested: number
  graphEventId: string | null
}

export interface LeaveBalance {
  balanceId: number
  policyId: number
  policyName: string
  balanceDays: number
  year: number
}

export interface CreateLeaveRequest {
  policy_id: number
  start_date: string
  end_date: string
  reason?: string
}

export interface UpdateLeaveRequest {
  action: 'APPROVE' | 'REJECT' | 'CANCEL'
  notes?: string
}

export interface LeavePolicy {
  policy_id: number
  name: string
  description?: string
  annual_limit: number
  carry_forward: number
  is_active: boolean
}

export interface LeavePaginatedResponse<T> {
  items: T[]
  page: number
  size: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

const normalisePage = (page?: number) => {
  const value = Number.isFinite(page) ? Number(page) : 1
  return value < 1 ? 1 : value
}

const parseNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return fallback
}

const normaliseDate = (value: unknown): string => {
  if (typeof value === 'string' && value) return value
  if (value instanceof Date) return value.toISOString()
  return new Date(0).toISOString()
}

const toLeaveBalance = (item: any): LeaveBalance => ({
  balanceId: parseNumber(item?.balanceId ?? item?.balance_id),
  policyId: parseNumber(item?.policyId ?? item?.policy_id),
  policyName: item?.policyName ?? item?.policy_name ?? '',
  balanceDays: parseNumber(item?.balanceDays ?? item?.balance_days),
  year: parseNumber(item?.year, new Date().getUTCFullYear()),
})

const calculateDays = (start: string, end: string, halfDay: boolean): number => {
  if (!start || !end) return halfDay ? 0.5 : 0
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return halfDay ? 0.5 : 0
  }
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  return diff >= 0 ? diff + 1 : halfDay ? 0.5 : 0
}

const toLeaveRequest = (item: any): LeaveRequest => {
  const startDate = normaliseDate(item?.startDate ?? item?.start_date)
  const endDate = normaliseDate(item?.endDate ?? item?.end_date)
  const halfDay = Boolean(item?.halfDay ?? item?.half_day ?? false)
  const calculatedDays = calculateDays(startDate, endDate, halfDay)

  const rawDays =
    item?.daysRequested ??
    item?.days_requested ??
    item?.days ??
    (halfDay ? 0.5 : calculatedDays)

  const daysRequested = parseNumber(rawDays, calculatedDays)

  return {
    requestId: parseNumber(item?.requestId ?? item?.request_id),
    userId: parseNumber(item?.userId ?? item?.user_id),
    userName: item?.userName ?? item?.user_name ?? null,
    userEmail: item?.userEmail ?? item?.user_email ?? '',
    userTeamId:
      item?.userTeamId !== undefined
        ? parseNumber(item.userTeamId)
        : item?.user_team_id !== undefined
          ? parseNumber(item.user_team_id)
          : null,
    policyId: parseNumber(item?.policyId ?? item?.policy_id),
    policyName: item?.policyName ?? item?.policy_name ?? '',
    status: (item?.status ?? 'PENDING') as LeaveRequest['status'],
    startDate,
    endDate,
    halfDay,
    reason: item?.reason ?? null,
    createdAt: normaliseDate(item?.createdAt ?? item?.created_at),
    updatedAt: normaliseDate(item?.updatedAt ?? item?.updated_at),
    daysRequested,
    graphEventId: item?.graphEventId ?? item?.graph_event_id ?? null,
  }
}

const toPaginatedLeaveResponse = (raw: any): LeavePaginatedResponse<LeaveRequest> => {
  const itemsSource = Array.isArray(raw?.items)
    ? raw.items
    : Array.isArray(raw?.content)
      ? raw.content
      : []

  const sizeFromRaw =
    parseNumber(raw?.size, 0) ||
    parseNumber(raw?.pageable?.pageSize, 0) ||
    (itemsSource.length > 0 ? itemsSource.length : 0)

  const total = parseNumber(raw?.total ?? raw?.totalElements, itemsSource.length)

  const pageRaw =
    raw?.page ??
    (typeof raw?.number === 'number' ? raw.number + 1 : undefined) ??
    (typeof raw?.pageNumber === 'number' ? raw.pageNumber + 1 : undefined) ??
    1

  const page = pageRaw > 0 ? pageRaw : 1
  const size = sizeFromRaw > 0 ? sizeFromRaw : (itemsSource.length || 1)
  const totalPagesRaw =
    parseNumber(raw?.totalPages, 0) ||
    (size > 0 ? Math.ceil(total / size) : total > 0 ? 1 : 0)
  const totalPages = totalPagesRaw > 0 ? totalPagesRaw : total > 0 ? 1 : 0

  const hasNext =
    typeof raw?.hasNextPage === 'boolean'
      ? raw.hasNextPage
      : typeof raw?.last === 'boolean'
        ? !raw.last
        : page < (totalPages || 1)

  const hasPrevious =
    typeof raw?.hasPreviousPage === 'boolean'
      ? raw.hasPreviousPage
      : typeof raw?.first === 'boolean'
        ? !raw.first
        : page > 1

  return {
    items: itemsSource.map(toLeaveRequest),
    page,
    size,
    total,
    totalPages: totalPages || 1,
    hasNextPage: hasNext,
    hasPreviousPage: hasPrevious,
  }
}

export async function getLeaveBalance(userId?: number) {
  const params = userId ? { user_id: userId } : {}
  const response = await leaveApi.get('/api/v1/leave/balance', { params })
  const raw = response.data ?? {}
  const balancesSource = Array.isArray(raw?.balances) ? raw.balances : []

  return {
    userId: raw?.userId ?? raw?.user_id ?? userId ?? null,
    year: raw?.year ?? new Date().getUTCFullYear(),
    balances: balancesSource.map(toLeaveBalance),
  }
}

export async function getLeaveRequests(params: {
  user_id?: number
  status?: string
  start_date?: string
  end_date?: string
  page?: number
  size?: number
  sort?: string
}): Promise<LeavePaginatedResponse<LeaveRequest>> {
  const requestedPage = normalisePage(params?.page ?? 1)
  const size = params?.size ?? 20

  const queryParams = {
    ...(params.user_id !== undefined ? { user_id: params.user_id } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.start_date ? { from: params.start_date } : {}),
    ...(params.end_date ? { to: params.end_date } : {}),
    page: requestedPage,
    size,
    sort: params.sort ?? 'created_at,desc',
  }

  const response = await leaveApi.get('/api/v1/leave/requests', { params: queryParams })
  return toPaginatedLeaveResponse(response.data)
}

export async function getLeaveRequestById(id: number) {
  const response = await leaveApi.get(`/api/v1/leave/requests/${id}`)
  return toLeaveRequest(response.data)
}

export async function createLeaveRequest(data: CreateLeaveRequest) {
  const response = await leaveApi.post('/api/v1/leave/requests', data)
  return toLeaveRequest(response.data)
}

export async function updateLeaveRequest(id: number, data: UpdateLeaveRequest) {
  const response = await leaveApi.patch(`/api/v1/leave/requests/${id}`, data)
  return toLeaveRequest(response.data)
}


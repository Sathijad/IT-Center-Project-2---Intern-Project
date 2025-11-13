import axios from 'axios'
import { config } from '../config/env'

// Phase 2 API client for attendance endpoints (port 3000)
const attendanceApi = axios.create({
  baseURL: config.LEAVE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token interceptor
attendanceApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors
attendanceApi.interceptors.response.use(
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

export interface AttendanceLog {
  logId: number
  userId: number
  userName: string | null
  userEmail?: string | null
  userTeamId?: number | null
  clockIn: string
  clockOut?: string | null
  durationMinutes?: number | null
  latitude?: number | null
  longitude?: number | null
  source?: string | null
  createdAt: string
}

export interface ClockInRequest {
  latitude: number
  longitude: number
  accuracy?: number
}

export interface AttendancePaginatedResponse<T> {
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

const toAttendanceLog = (item: any): AttendanceLog => ({
  logId: parseNumber(item?.logId ?? item?.log_id),
  userId: parseNumber(item?.userId ?? item?.user_id),
  userName: item?.userName ?? item?.user_name ?? null,
  userEmail: item?.userEmail ?? item?.user_email ?? null,
  userTeamId:
    item?.userTeamId !== undefined
      ? parseNumber(item.userTeamId)
      : item?.user_team_id !== undefined
        ? parseNumber(item.user_team_id)
        : undefined,
  clockIn: normaliseDate(item?.clockIn ?? item?.clock_in),
  clockOut:
    item?.clockOut ?? item?.clock_out
      ? normaliseDate(item?.clockOut ?? item?.clock_out)
      : null,
  durationMinutes:
    item?.durationMinutes !== undefined
      ? parseNumber(item.durationMinutes)
      : item?.duration_minutes !== undefined
        ? parseNumber(item.duration_minutes)
        : null,
  latitude:
    item?.latitude !== undefined
      ? parseNumber(item.latitude)
      : item?.geo_location?.latitude !== undefined
        ? parseNumber(item.geo_location.latitude)
        : undefined,
  longitude:
    item?.longitude !== undefined
      ? parseNumber(item.longitude)
      : item?.geo_location?.longitude !== undefined
        ? parseNumber(item.geo_location.longitude)
        : undefined,
  source: item?.source ?? null,
  createdAt: normaliseDate(item?.createdAt ?? item?.created_at),
})

const toPaginatedAttendanceResponse = (raw: any): AttendancePaginatedResponse<AttendanceLog> => {
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
    items: itemsSource.map(toAttendanceLog),
    page,
    size,
    total,
    totalPages: totalPages || 1,
    hasNextPage: hasNext,
    hasPreviousPage: hasPrevious,
  }
}

export async function getAttendanceLogs(params: {
  user_id?: number
  start_date?: string
  end_date?: string
  page?: number
  size?: number
  sort?: string
}): Promise<AttendancePaginatedResponse<AttendanceLog>> {
  const requestedPage = normalisePage(params?.page ?? 1)
  const size = params?.size ?? 20

  const queryParams = {
    ...(params.user_id !== undefined ? { user_id: params.user_id } : {}),
    ...(params.start_date ? { from: params.start_date } : {}),
    ...(params.end_date ? { to: params.end_date } : {}),
    page: requestedPage,
    size,
    sort: params.sort ?? 'clock_in,desc',
  }

  const response = await attendanceApi.get('/api/v1/attendance', { params: queryParams })
  return toPaginatedAttendanceResponse(response.data)
}

export async function clockIn(data: ClockInRequest) {
  const response = await attendanceApi.post('/api/v1/attendance/clock-in', data)
  return response.data
}

export async function clockOut(data?: { latitude?: number; longitude?: number }) {
  // Only send location data if both latitude and longitude are provided
  // If no location, send empty object (backend will handle it as null)
  const requestBody = (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') 
    ? { latitude: data.latitude, longitude: data.longitude }
    : {}
  const response = await attendanceApi.post('/api/v1/attendance/clock-out', requestBody)
  return response.data
}


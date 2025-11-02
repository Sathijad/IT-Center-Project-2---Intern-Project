import axios from 'axios'
import { config } from '../config/env'

const api = axios.create({
  baseURL: config.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('id_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Phase 2 API client for leave & attendance (port 8082)
const leaveApi = axios.create({
  baseURL: import.meta.env.VITE_LEAVE_API_BASE_URL || 'http://localhost:8082',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token interceptor for leave API
leaveApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors for leave API
leaveApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('id_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
export { leaveApi }

// Phase 1 API functions
export async function deleteUser(id: number) {
  return api.delete(`/api/v1/admin/users/${id}`)
}

// Phase 2 API functions - Leave
export async function getLeaveBalance(userId?: number) {
  const params = userId ? { user_id: userId } : {}
  return leaveApi.get('/api/v1/leave/balance', { params })
}

export async function getLeaveRequests(params: {
  user_id?: number
  status?: string
  from?: string
  to?: string
  page?: number
  size?: number
}) {
  return leaveApi.get('/api/v1/leave/requests', { params })
}

export async function createLeaveRequest(data: {
  policyId: number
  startDate: string
  endDate: string
  halfDay?: 'AM' | 'PM'
  reason?: string
}) {
  return leaveApi.post('/api/v1/leave/requests', data)
}

export async function updateLeaveRequestStatus(
  id: number,
  status: 'APPROVED' | 'REJECTED',
  rejectionReason?: string
) {
  return leaveApi.patch(`/api/v1/leave/requests/${id}`, { status, rejectionReason })
}

export async function cancelLeaveRequest(id: number) {
  return leaveApi.patch(`/api/v1/leave/requests/${id}/cancel`)
}

// Phase 2 API functions - Attendance
export async function clockIn(data?: { latitude?: number; longitude?: number; source?: string }) {
  return leaveApi.post('/api/v1/attendance/clock-in', data || {})
}

export async function clockOut(data?: { source?: string }) {
  return leaveApi.post('/api/v1/attendance/clock-out', data || {})
}

export async function getAttendanceLogs(params: {
  user_id?: number
  from?: string
  to?: string
  page?: number
  size?: number
}) {
  return leaveApi.get('/api/v1/attendance', { params })
}

export async function getTodayAttendance() {
  return leaveApi.get('/api/v1/attendance/today')
}

// Phase 2 API functions - Reports
export async function getLeaveSummary(params?: { from?: string; to?: string }) {
  return leaveApi.get('/api/v1/reports/leave-summary', { params })
}


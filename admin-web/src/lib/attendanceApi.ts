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
  log_id: number
  user_id: number
  user_name: string
  clock_in: string
  clock_out?: string
  duration_minutes?: number
  geo_location?: {
    latitude: number
    longitude: number
    accuracy?: number
  }
  created_at: string
}

export interface ClockInRequest {
  latitude: number
  longitude: number
  accuracy?: number
}

export async function getAttendanceLogs(params: {
  user_id?: number
  start_date?: string
  end_date?: string
  page?: number
  size?: number
  sort?: string
}) {
  const response = await attendanceApi.get('/api/v1/attendance', { params })
  return response.data
}

export async function clockIn(data: ClockInRequest) {
  const response = await attendanceApi.post('/api/v1/attendance/clock-in', data)
  return response.data
}

export async function clockOut(data?: { latitude?: number; longitude?: number }) {
  const response = await attendanceApi.post('/api/v1/attendance/clock-out', data || {})
  return response.data
}


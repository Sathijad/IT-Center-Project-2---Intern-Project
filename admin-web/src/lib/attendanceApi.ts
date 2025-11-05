import api from './api'

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
  const response = await api.get('/api/v1/attendance', { params })
  return response.data
}

export async function clockIn(data: ClockInRequest) {
  const response = await api.post('/api/v1/attendance/clock-in', data)
  return response.data
}

export async function clockOut(data?: { latitude?: number; longitude?: number }) {
  const response = await api.post('/api/v1/attendance/clock-out', data || {})
  return response.data
}


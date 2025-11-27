import axios from 'axios'
import { config } from '../config/env'

// Create separate axios instance for schedules API (Phase 4 backend)
const schedulesApi = axios.create({
  baseURL: config.SCHEDULES_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token interceptor for schedules API
schedulesApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors
schedulesApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Log error details for debugging
    if (!error.response) {
      // Network error or CORS error
      console.error('Network/CORS error:', error.message)
      if (error.code === 'ERR_NETWORK' || error.message?.includes('CORS')) {
        console.error('CORS or network issue. Check if backend is running and CORS is configured.')
      }
    } else {
      console.error('API error:', error.response.status, error.response.data)
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('id_token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
    
    if (error.response?.status === 403) {
      console.error('Forbidden: User may not have required role (ADMIN)')
    }
    
    return Promise.reject(error)
  }
)

const api = schedulesApi

export type Recurrence = {
  recurrenceId?: string
  pattern?: string
  interval?: number
  byDay?: string
  byMonthDay?: string
  until?: string
}

export type Schedule = {
  scheduleId: string
  userId: number
  teamId?: number
  title: string
  description?: string
  startTime: string
  endTime: string
  status: string
  calendarEventId?: string
  recurrence?: Recurrence
}

export type Task = {
  taskId: string
  title: string
  description?: string
  assigneeId: number
  scheduleId?: string
  priority: string
  status: string
  dueDate?: string
  tags: string[]
}

export type PagedResponse<T> = {
  items: T[]
  page: number
  size: number
  totalCount: number
}

export async function listSchedules(params: Record<string, any>) {
  const { data } = await api.get<PagedResponse<Schedule>>('/api/v1/schedules', { params })
  return data
}

export async function listMySchedules(params: { rangeStart?: string; rangeEnd?: string }) {
  const { data } = await api.get<PagedResponse<Schedule>>('/api/v1/schedules/my', { params })
  return data
}

export async function createSchedule(payload: any) {
  const { data } = await api.post<Schedule>('/api/v1/schedules', payload)
  return data
}

export async function updateSchedule(id: string, payload: any) {
  const { data } = await api.patch<Schedule>(`/api/v1/schedules/${id}`, payload)
  return data
}

export async function deleteSchedule(id: string) {
  return api.delete(`/api/v1/schedules/${id}`)
}

export async function listTasks(params: Record<string, any>) {
  const { data } = await api.get<PagedResponse<Task>>('/api/v1/tasks', { params })
  return data
}

export async function createTask(payload: any, idempotencyKey: string) {
  const { data } = await api.post<Task>('/api/v1/tasks', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return data
}

export async function updateTask(id: string, payload: any) {
  const { data } = await api.patch<Task>(`/api/v1/tasks/${id}`, payload)
  return data
}

export async function addTaskComment(id: string, payload: { body: string }) {
  const { data } = await api.post<Task>(`/api/v1/tasks/${id}/comments`, payload)
  return data
}

export async function fetchAvailability(params: Record<string, any>) {
  const { data } = await api.get('/api/v1/availability', { params })
  return data
}

export async function importSchedules(payload: any) {
  const { data } = await api.post('/api/v1/imports/schedules', payload)
  return data
}

export async function getImportJob(jobId: string) {
  const { data } = await api.get(`/api/v1/imports/${jobId}`)
  return data
}


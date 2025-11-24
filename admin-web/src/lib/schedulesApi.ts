import api from './api'

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


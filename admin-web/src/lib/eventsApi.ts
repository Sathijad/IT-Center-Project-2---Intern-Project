import axios from 'axios'
import { config } from '../config/env'

const eventsApi = axios.create({
  baseURL: config.EVENTS_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

eventsApi.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`
  }
  return cfg
})

eventsApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('id_token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export type EventStatus =
  | 'DRAFT'
  | 'PENDING_MODERATION'
  | 'SCHEDULED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'ARCHIVED'

export interface EventAttachment {
  name: string
  url: string
  type: string
}

export interface Event {
  id: string
  title: string
  summary: string
  status: EventStatus
  channel: string
  tags: string[]
  attachments: EventAttachment[]
  rsvpRequired: boolean
  scheduledFor?: string
  publishedAt?: string
  broadcastAt?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
  etag: string
}

export interface EventBody {
  html: string
  sanitized: string
  plainText: string
}

export interface EventListResponse {
  items: Event[]
  page: number
  size: number
  total: number
  hasNext: boolean
  etag?: string
}

export async function listEvents(params: { page?: number; size?: number; status?: string[]; tags?: string[] }) {
  const response = await eventsApi.get('/api/v1/events', { params })
  const etag = response.headers['etag']
  return { ...(response.data as EventListResponse), etag }
}

export async function getEvent(id: string, etag?: string) {
  const headers: Record<string, string> = {}
  if (etag) headers['If-None-Match'] = etag
  const response = await eventsApi.get(`/api/v1/events/${id}`, { headers, validateStatus: () => true })
  if (response.status === 304) {
    return { status: 304 as const }
  }
  if (response.status >= 400) {
    throw new Error(response.data?.message || 'Failed to load event')
  }
  return { status: 200 as const, etag: response.headers['etag'] as string, data: response.data as { event: Event; body?: EventBody } }
}

export interface EventMutationPayload {
  title: string
  summary: string
  body: string
  channel: string
  tags: string[]
  attachments: EventAttachment[]
  rsvpRequired: boolean
  scheduledFor?: string | null
  expiresAt?: string | null
}

export async function createEvent(payload: EventMutationPayload) {
  const response = await eventsApi.post('/api/v1/events', payload)
  return response.data as Event
}

export async function updateEvent(id: string, payload: EventMutationPayload) {
  const response = await eventsApi.patch(`/api/v1/events/${id}`, payload)
  return response.data as Event
}

export async function moderateEvent(id: string, action: 'APPROVE' | 'REJECT', notes: string) {
  await eventsApi.post(`/api/v1/events/${id}/moderate`, { action, notes })
}

export async function broadcastEvent(id: string, payload: { channels: string[]; idempotencyKey?: string }) {
  const response = await eventsApi.post(`/api/v1/events/${id}/broadcast`, payload)
  return response.data
}

export async function suggestTags(query: string) {
  const response = await eventsApi.post('/api/v1/events/tag-suggest', { query })
  return (response.data?.tags ?? []) as string[]
}

export async function fetchTags(query: string) {
  const response = await eventsApi.get('/api/v1/tags', { params: { query } })
  return (response.data?.tags ?? []) as string[]
}

export async function fetchAudits(eventId: string, limit = 20) {
  const response = await eventsApi.get(`/api/v1/events/${eventId}/audit`, { params: { limit } })
  return response.data?.audits ?? []
}


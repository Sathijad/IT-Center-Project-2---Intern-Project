import axios from 'axios'
import { config } from '../config/env'

console.log('[Events API] Initializing with base URL:', config.EVENTS_API_BASE_URL)

const eventsApi = axios.create({
  baseURL: config.EVENTS_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

eventsApi.interceptors.request.use((cfg) => {
  // Events backend requires id_token, not access_token
  let token = localStorage.getItem('id_token')
  const tokenType = 'id_token'
  
  // Fall back to access_token only if id_token is not available (shouldn't happen normally)
  if (!token) {
    token = localStorage.getItem('access_token')
    if (token) {
      console.warn('[Events API] id_token not found, falling back to access_token (this may not work)')
    }
  }
  
  // Decode JWT to inspect claims (without verification)
  let tokenInfo: any = null
  if (token) {
    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        tokenInfo = {
          sub: payload.sub,
          email: payload.email,
          issuer: payload.iss,
          audience: payload.aud,
          exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
          expired: payload.exp ? Date.now() >= payload.exp * 1000 : null,
        }
      }
    } catch (e) {
      console.warn('[Events API] Could not decode token:', e)
    }
  }
  
  console.log('[Events API] Request:', {
    url: cfg.url,
    method: cfg.method,
    hasToken: !!token,
    tokenLength: token?.length || 0,
    tokenType,
    tokenInfo,
  })
  
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`
  } else {
    console.error('[Events API] No id_token found in localStorage! Events backend requires id_token for authentication.')
  }
  
  // Check token expiration before making request
  const expiresAt = localStorage.getItem('expires_at')
  if (expiresAt) {
    const expirationTime = parseInt(expiresAt, 10)
    const now = Date.now()
    // If token expires in less than 1 minute, log a warning
    if (now >= expirationTime - 60000) {
      console.warn('[Events API] Token is expired or expiring soon', {
        expiresAt: new Date(expirationTime).toISOString(),
        now: new Date(now).toISOString(),
        expired: now >= expirationTime,
      })
    }
  } else {
    console.warn('[Events API] No expiration time found in localStorage')
  }
  
  return cfg
})

eventsApi.interceptors.response.use(
  (response) => {
    console.log('[Events API] Response:', {
      url: response.config.url,
      status: response.status,
    })
    return response
  },
  (error) => {
    console.error('[Events API] Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      code: error.code,
      hasResponse: !!error.response,
      responseData: error.response?.data,
      path: window.location.pathname,
    })

    // Only handle 401 if we actually got a response from the server
    // Network errors (CORS, connection refused, etc.) won't have error.response
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || 'Unauthorized'
      console.error('[Events API] 401 Unauthorized:', {
        path: window.location.pathname,
        message: errorMessage,
        note: 'This might be due to user not being in events database or token configuration issue',
      })
      
      // Only clear tokens if the error indicates the token itself is invalid
      // "invalid token" or "missing token" suggest auth issues
      // "user not provisioned" means the token is valid but user doesn't exist in events DB
      if (errorMessage.includes('invalid token') || errorMessage.includes('missing token')) {
        console.warn('[Events API] Token appears invalid, but NOT clearing to prevent redirect loop')
        // Don't clear tokens - let user manually refresh/login if needed
        // Clearing tokens causes ProtectedRoute to redirect, which is the user's complaint
      } else {
        console.log('[Events API] 401 likely due to user not in events database, keeping tokens')
      }
    } else if (!error.response) {
      // Network error (CORS, connection refused, etc.)
      console.error('[Events API] Network error (no response from server)', {
        message: error.message,
        code: error.code,
        path: window.location.pathname,
        possibleCauses: [
          'Events backend not running',
          'CORS configuration issue',
          'Network connectivity problem',
          'Wrong API URL configured',
        ],
      })
      // Don't redirect on network errors - let the component handle it
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
  // Build query params manually to ensure arrays are serialized correctly for Go's QueryArray
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.append('page', String(params.page))
  if (params.size) queryParams.append('size', String(params.size))
  if (params.status && params.status.length > 0) {
    // Go's QueryArray expects multiple query params with the same name
    params.status.forEach(s => queryParams.append('status', s))
  }
  if (params.tags && params.tags.length > 0) {
    params.tags.forEach(t => queryParams.append('tags', t))
  }
  
  const queryString = queryParams.toString()
  const url = `/api/v1/events${queryString ? `?${queryString}` : ''}`
  
  console.log('[Events API] listEvents:', { url, params })
  
  const response = await eventsApi.get(url)
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
  console.log('[Events API] createEvent payload:', payload)
  try {
    const response = await eventsApi.post('/api/v1/events', payload)
    console.log('[Events API] createEvent success:', response.data)
    return response.data as Event
  } catch (error: any) {
    console.error('[Events API] createEvent error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
      payload,
    })
    throw error
  }
}

export async function updateEvent(id: string, payload: EventMutationPayload) {
  console.log('[Events API] updateEvent:', { id, payload })
  try {
    const response = await eventsApi.patch(`/api/v1/events/${id}`, payload)
    return response.data as Event
  } catch (error: any) {
    console.error('[Events API] updateEvent error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    })
    throw error
  }
}

export async function moderateEvent(id: string, action: 'APPROVE' | 'REJECT', notes: string) {
  try {
    await eventsApi.post(`/api/v1/events/${id}/moderate`, { action, notes })
  } catch (error: any) {
    console.error('[Events API] moderateEvent error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    })
    throw error
  }
}

export async function broadcastEvent(id: string, payload: { channels: string[]; idempotencyKey?: string }) {
  const response = await eventsApi.post(`/api/v1/events/${id}/broadcast`, payload)
  return response.data
}

export async function suggestTags(query: string) {
  try {
    const response = await eventsApi.post('/api/v1/events/tag-suggest', { query })
    return (response.data?.tags ?? []) as string[]
  } catch (error: any) {
    console.error('[Events API] suggestTags error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    })
    throw error
  }
}

export async function fetchTags(query: string) {
  const response = await eventsApi.get('/api/v1/tags', { params: { query } })
  return (response.data?.tags ?? []) as string[]
}

export async function fetchAudits(eventId: string, limit = 20) {
  const response = await eventsApi.get(`/api/v1/events/${eventId}/audit`, { params: { limit } })
  return response.data?.audits ?? []
}


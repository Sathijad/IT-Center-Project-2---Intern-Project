import axios from 'axios'
import { config } from '../config/env'

// Phase 3 API client for booking endpoints
const bookingApi = axios.create({
  baseURL: config.BOOKING_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token interceptor
bookingApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors
bookingApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Booking API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    })
    
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

export interface Room {
  id: number
  name: string
  capacity: number
  amenities: string[]
  location: string | null
  active: boolean
  ownerTeamId: number | null
  externalCalendarId: string | null
  createdAt: string
  updatedAt: string
}

export interface Booking {
  id: number
  roomId: number
  userId: number
  startTs: string
  endTs: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  title: string | null
  attendees: string[]
  idempotencyKey: string | null
  externalEventId: string | null
  createdAt: string
  updatedAt: string
}

export interface BlackoutWindow {
  id: number
  roomId: number
  startTs: string
  endTs: string
  reason: string | null
  createdBy: number | null
  createdAt: string
}

export interface CreateBookingInput {
  room_id: number
  start_ts: string
  end_ts: string
  title?: string | null
  attendees?: string[]
}

export interface CreateBlackoutInput {
  room_id: number
  start_ts: string
  end_ts: string
  reason?: string | null
}

export interface AvailabilityResponse {
  roomId: number
  start: string
  end: string
  bookings: Array<{
    id: number
    start: string
    end: string
    title: string | null
  }>
  blackouts: Array<{
    id: number
    start: string
    end: string
    reason: string | null
  }>
}

// Room endpoints
export async function getRooms(params?: {
  date?: string
  capacity?: number
  amenities?: string[]
  active?: boolean
  location?: string
}): Promise<{ rooms: Room[] }> {
  const queryParams: Record<string, string> = {}
  if (params?.date) queryParams.date = params.date
  if (params?.capacity) queryParams.capacity = String(params.capacity)
  if (params?.amenities?.length) queryParams.amenities = params.amenities.join(',')
  if (params?.active !== undefined) queryParams.active = String(params.active)
  if (params?.location) queryParams.location = params.location

  const response = await bookingApi.get('/api/v1/rooms', { params: queryParams })
  return response.data
}

export async function getRoom(id: number): Promise<{ room: Room }> {
  const response = await bookingApi.get(`/api/v1/rooms/${id}`)
  return response.data
}

export async function createRoom(data: {
  name: string
  capacity: number
  amenities?: string[]
  location?: string | null
  active?: boolean
  owner_team_id?: number | null
}): Promise<{ room: Room }> {
  const response = await bookingApi.post('/api/v1/rooms', data)
  return response.data
}

export async function updateRoom(
  id: number,
  data: Partial<{
    name: string
    capacity: number
    amenities: string[]
    location: string | null
    active: boolean
    owner_team_id: number | null
  }>
): Promise<{ room: Room }> {
  const response = await bookingApi.patch(`/api/v1/rooms/${id}`, data)
  return response.data
}

export async function deleteRoom(id: number): Promise<{ room: Room; message: string }> {
  const response = await bookingApi.delete(`/api/v1/rooms/${id}`)
  return response.data
}

export async function getRoomAvailability(
  id: number,
  start: string,
  end: string
): Promise<AvailabilityResponse> {
  const response = await bookingApi.get(`/api/v1/rooms/${id}/availability`, {
    params: { start, end },
  })
  return response.data
}

// Booking endpoints
export async function createBooking(
  data: CreateBookingInput,
  idempotencyKey?: string
): Promise<{ booking: Booking }> {
  const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}
  const response = await bookingApi.post('/api/v1/bookings', data, { headers })
  return response.data
}

export async function getBooking(id: number): Promise<{ booking: Booking }> {
  const response = await bookingApi.get(`/api/v1/bookings/${id}`)
  return response.data
}

const normalizeDateParam = (value?: string, endOfDay = false): string | undefined => {
  if (!value) {
    return undefined
  }

  const hasTime = value.includes('T')

  if (!hasTime) {
    return `${value}T${endOfDay ? '23:59:59' : '00:00:00'}Z`
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

export async function listBookings(params?: {
  user_id?: number
  room_id?: number
  start_date?: string
  end_date?: string
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
}): Promise<{ bookings: Booking[] }> {
  const queryParams: Record<string, string> = {}
  if (params?.user_id) queryParams.user_id = String(params.user_id)
  if (params?.room_id) queryParams.room_id = String(params.room_id)
  const normalizedStart = normalizeDateParam(params?.start_date)
  const normalizedEnd = normalizeDateParam(params?.end_date, true)
  if (normalizedStart) queryParams.start_date = normalizedStart
  if (normalizedEnd) queryParams.end_date = normalizedEnd
  if (params?.status) queryParams.status = params.status

  const response = await bookingApi.get('/api/v1/bookings', { params: queryParams })
  return response.data
}

export async function cancelBooking(id: number): Promise<{ booking: Booking }> {
  const response = await bookingApi.delete(`/api/v1/bookings/${id}`)
  return response.data
}

// Blackout endpoints (ADMIN only)
export async function createBlackout(data: CreateBlackoutInput): Promise<{ blackout: BlackoutWindow }> {
  const response = await bookingApi.post('/api/v1/blackouts', data)
  return response.data
}

export async function listBlackouts(roomId?: number): Promise<{ blackouts: BlackoutWindow[] }> {
  const params = roomId ? { room_id: String(roomId) } : {}
  const response = await bookingApi.get('/api/v1/blackouts', { params })
  return response.data
}

export async function updateBlackout(
  id: number,
  data: Partial<{ start_ts: string; end_ts: string; reason: string | null }>
): Promise<{ blackout: BlackoutWindow }> {
  const response = await bookingApi.patch(`/api/v1/blackouts/${id}`, data)
  return response.data
}

export async function deleteBlackout(id: number): Promise<void> {
  await bookingApi.delete(`/api/v1/blackouts/${id}`)
}

// ICS Export
export async function exportBookingsICS(params: {
  room_id?: number
  start: string
  end: string
}): Promise<Blob> {
  const queryParams: Record<string, string> = {
    start: params.start,
    end: params.end,
  }
  if (params.room_id) queryParams.room_id = String(params.room_id)

  const response = await bookingApi.get('/api/v1/exports/bookings.ics', {
    params: queryParams,
    responseType: 'blob',
  })
  return response.data
}

export default bookingApi


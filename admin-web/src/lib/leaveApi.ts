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
  request_id: number
  user_id: number
  user_name: string
  user_email: string
  policy_id: number
  policy_name: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  start_date: string
  end_date: string
  days: number
  reason?: string
  created_at: string
  updated_at: string
}

export interface LeaveBalance {
  balance_id: number
  policy_id: number
  policy_name: string
  balance_days: number
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

export async function getLeaveBalance(userId?: number) {
  const params = userId ? { user_id: userId } : {}
  const response = await leaveApi.get('/api/v1/leave/balance', { params })
  return response.data
}

export async function getLeaveRequests(params: {
  user_id?: number
  status?: string
  start_date?: string
  end_date?: string
  page?: number
  size?: number
  sort?: string
}) {
  const response = await leaveApi.get('/api/v1/leave/requests', { params })
  return response.data
}

export async function getLeaveRequestById(id: number) {
  const response = await leaveApi.get(`/api/v1/leave/requests/${id}`)
  return response.data
}

export async function createLeaveRequest(data: CreateLeaveRequest) {
  const response = await leaveApi.post('/api/v1/leave/requests', data)
  return response.data
}

export async function updateLeaveRequest(id: number, data: UpdateLeaveRequest) {
  const response = await leaveApi.patch(`/api/v1/leave/requests/${id}`, data)
  return response.data
}


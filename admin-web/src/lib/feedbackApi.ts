import axios from 'axios'
import { config } from '../config/env'

// Create axios instance for feedback API (Phase 7 backend)
const feedbackApiClient = axios.create({
  baseURL: config.FEEDBACK_API_BASE_URL || 'http://localhost:8086',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token interceptor
feedbackApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors
feedbackApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
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

export interface Feedback {
  feedback_id: string
  title: string
  description: string
  category: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REJECTED'
  created_by: number
  assigned_to?: number
  labels: string[]
  created_at: string
  updated_at: string
  messages?: FeedbackMessage[]
  attachments?: FeedbackAttachment[]
  audit_logs?: FeedbackAudit[]
  nlp_analysis?: NlpAnalysis[]
}

export interface FeedbackMessage {
  message_id: string
  feedback_id: string
  user_id: number
  content: string
  created_at: string
  attachments?: FeedbackAttachment[]
}

export interface FeedbackAttachment {
  attachment_id: string
  feedback_id: string
  message_id?: string
  s3_key: string
  file_name: string
  file_size?: number
  mime_type?: string
  uploaded_by: number
  created_at: string
  download_url?: string
}

export interface FeedbackAudit {
  audit_id: number
  feedback_id: string
  user_id?: number
  action: string
  old_value?: Record<string, any>
  new_value?: Record<string, any>
  metadata?: Record<string, any>
  created_at: string
}

export interface NlpAnalysis {
  analysis_id: string
  feedback_id: string
  sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED'
  sentiment_score?: Record<string, number>
  pii_entities?: Array<{
    type: string
    score: number
    text: string
  }>
  raw_response?: Record<string, any>
  analyzed_at: string
  created_at: string
}

export interface FeedbackListResponse {
  items: Feedback[]
  page: number
  size: number
  total_count: number
  total_pages: number
}

export const feedbackApi = {
  // Create feedback
  async createFeedback(data: {
    title: string
    description: string
    category: string
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    labels?: string[]
    attachments?: Array<{
      file_name: string
      file_size?: number
      mime_type?: string
      s3_key: string
    }>
  }): Promise<Feedback> {
    const response = await feedbackApiClient.post('/api/v1/feedback', data)
    return response.data
  },

  // List feedback
  async getFeedbackList(params: {
    status?: string
    assignee?: number
    category?: string
    priority?: string
    page?: number
    size?: number
  }): Promise<FeedbackListResponse> {
    const queryParams = new URLSearchParams()
    if (params.status) queryParams.append('status', params.status)
    if (params.assignee) queryParams.append('assignee', params.assignee.toString())
    if (params.category) queryParams.append('category', params.category)
    if (params.priority) queryParams.append('priority', params.priority)
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.size) queryParams.append('size', params.size.toString())

    const response = await feedbackApiClient.get(`/api/v1/feedback?${queryParams.toString()}`)
    return response.data
  },

  // Get feedback by ID
  async getFeedbackById(id: string): Promise<Feedback> {
    const response = await feedbackApiClient.get(`/api/v1/feedback/${id}`)
    return response.data
  },

  // Add message to feedback
  async addMessage(
    feedbackId: string,
    data: {
      content: string
      attachments?: Array<{
        file_name: string
        file_size?: number
        mime_type?: string
        s3_key: string
      }>
    }
  ): Promise<FeedbackMessage> {
    const response = await feedbackApiClient.post(`/api/v1/feedback/${feedbackId}/messages`, data)
    return response.data
  },

  // Update feedback (ADMIN only)
  async updateFeedback(
    id: string,
    updates: {
      status?: string
      assignee_id?: number
      priority?: string
      labels?: string[]
    }
  ): Promise<Feedback> {
    const response = await feedbackApiClient.patch(`/api/v1/feedback/${id}`, updates)
    return response.data
  },

  // Analyze feedback sentiment (ADMIN only)
  async analyzeFeedback(id: string): Promise<{ message: string; feedback_id: string }> {
    const response = await feedbackApiClient.post(`/api/v1/feedback/${id}/analyze`)
    return response.data
  },

  // Export feedback as CSV (ADMIN only)
  async exportFeedbackCSV(params: {
    status?: string
    category?: string
    priority?: string
    start_date?: string
    end_date?: string
  }): Promise<Blob> {
    const queryParams = new URLSearchParams()
    if (params.status) queryParams.append('status', params.status)
    if (params.category) queryParams.append('category', params.category)
    if (params.priority) queryParams.append('priority', params.priority)
    if (params.start_date) queryParams.append('start_date', params.start_date)
    if (params.end_date) queryParams.append('end_date', params.end_date)

    const response = await feedbackApiClient.get(`/api/v1/exports/feedback.csv?${queryParams.toString()}`, {
      responseType: 'blob',
    })
    return response.data
  },

  // Send Teams notification (ADMIN only)
  async sendTeamsNotification(data: {
    feedback_id: string
    channel_id?: string
  }): Promise<{ message: string; feedback_id: string }> {
    const response = await feedbackApiClient.post('/api/v1/integrations/teams/notify', data)
    return response.data
  },
}


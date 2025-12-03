import axios from 'axios'
import { config } from '../config/env'

// Create axios instance for performance API (Phase 6 backend)
const performanceApiClient = axios.create({
  baseURL: config.PERFORMANCE_API_BASE_URL || 'http://localhost:5167',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token interceptor
performanceApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors
performanceApiClient.interceptors.response.use(
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

export interface KpiSnapshot {
  kpiCode: string
  kpiName: string
  currentValue?: number
  targetValue?: number
  variance?: number
  unit?: string
  lastMeasuredAt?: string
}

export interface KpiTimeSeries {
  kpiCode: string
  kpiName: string
  unit?: string
  dataPoints: Array<{
    timestamp: string
    value: number
  }>
}

export interface KpiTarget {
  targetId: string
  kpiId: string
  kpiCode: string
  kpiName: string
  userId?: number
  teamId?: number
  periodType: string
  periodStart: string
  periodEnd: string
  targetValue: number
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface TrainingCourse {
  courseId: string
  title: string
  description?: string
  provider?: string
  modality: string
  teamsMeetingUrl?: string
  sharepointUrl?: string
  onedriveUrl?: string
  durationMinutes?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TrainingAssignment {
  assignmentId: string
  courseId: string
  courseTitle: string
  assigneeType: string
  assigneeId?: number
  cohortId?: string
  dueDate?: string
  status: string
  progress: number
  completedAt?: string
  assignedBy: number
  createdAt: string
  updatedAt: string
}

export interface ImportJob {
  jobId: string
  jobType: string
  status: string
  processedCount: number
  failedCount: number
  errorDetails?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export const performanceApi = {
  // KPI Metrics
  async getMetrics(params: {
    userId?: number
    teamId?: number
    kpi?: string
    range?: string
  }): Promise<KpiSnapshot[]> {
    const queryParams = new URLSearchParams()
    if (params.userId) queryParams.append('user_id', params.userId.toString())
    if (params.teamId) queryParams.append('team_id', params.teamId.toString())
    if (params.kpi) queryParams.append('kpi', params.kpi)
    if (params.range) queryParams.append('range', params.range)

    const response = await performanceApiClient.get(`/api/v1/perf/metrics?${queryParams.toString()}`)
    return response.data
  },

  async getTimeSeries(params: {
    userId?: number
    teamId?: number
    kpi?: string
    range?: string
  }): Promise<KpiTimeSeries[]> {
    const queryParams = new URLSearchParams()
    if (params.userId) queryParams.append('user_id', params.userId.toString())
    if (params.teamId) queryParams.append('team_id', params.teamId.toString())
    if (params.kpi) queryParams.append('kpi', params.kpi)
    if (params.range) queryParams.append('range', params.range)

    const response = await performanceApiClient.get(`/api/v1/perf/metrics/timeseries?${queryParams.toString()}`)
    return response.data
  },

  // KPI Targets
  async createTarget(target: {
    kpiId: string
    userId?: number
    teamId?: number
    periodType: string
    periodStart: string
    periodEnd: string
    targetValue: number
  }): Promise<KpiTarget> {
    const response = await performanceApiClient.post('/api/v1/perf/targets', target)
    return response.data
  },

  // Training Courses
  async getCourses(params: {
    query?: string
    page?: number
    size?: number
  }): Promise<{
    items: TrainingCourse[]
    page: number
    size: number
    totalCount: number
  }> {
    const queryParams = new URLSearchParams()
    if (params.query) queryParams.append('query', params.query)
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.size) queryParams.append('size', params.size.toString())

    const response = await performanceApiClient.get(`/api/v1/training/courses?${queryParams.toString()}`)
    return response.data
  },

  async createCourse(course: {
    title: string
    description?: string
    provider?: string
    modality: string
    teamsMeetingUrl?: string
    sharepointUrl?: string
    onedriveUrl?: string
    durationMinutes?: number
  }): Promise<TrainingCourse> {
    const response = await performanceApiClient.post('/api/v1/training/courses', course)
    return response.data
  },

  // Training Assignments
  async assignTraining(assignment: {
    courseId: string
    assigneeType: string
    assigneeId?: number
    cohortId?: string
    dueDate?: string
  }): Promise<TrainingAssignment[]> {
    const response = await performanceApiClient.post('/api/v1/training/assign', assignment)
    return response.data
  },

  async updateAssignment(
    assignmentId: string,
    update: {
      status?: string
      progress?: number
      completedAt?: string
    }
  ): Promise<TrainingAssignment> {
    const response = await performanceApiClient.patch(`/api/v1/training/assignments/${assignmentId}`, update)
    return response.data
  },

  // Imports
  async importKpiActuals(file: File): Promise<ImportJob> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await performanceApiClient.post('/api/v1/perf/actuals/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  async getImportJob(jobId: string): Promise<ImportJob> {
    const response = await performanceApiClient.get(`/api/v1/imports/${jobId}`)
    return response.data
  },

  // Notifications
  async notifyStaff(request: {
    assignmentIds?: string[]
    userId?: number
    teamId?: number
    overdueOnly?: boolean
    incompleteOnly?: boolean
  }): Promise<{ queued: number; message: string }> {
    const response = await performanceApiClient.post('/api/v1/notify/staff', request)
    return response.data
  },
}


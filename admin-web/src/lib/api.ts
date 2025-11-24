import axios from 'axios'
import { config } from '../config/env'

const api = axios.create({
  baseURL: config.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const MAX_RETRIES = 2

// Add token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('id_token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    const config = error.config as typeof error.config & { __retryCount?: number }
    if (!config) {
      return Promise.reject(error)
    }
    const shouldRetry = !error.response || error.response.status >= 500
    if (!shouldRetry) {
      return Promise.reject(error)
    }

    config.__retryCount = (config.__retryCount ?? 0) + 1
    if (config.__retryCount > MAX_RETRIES) {
      return Promise.reject(error)
    }
    await new Promise((resolve) => setTimeout(resolve, 200 * config.__retryCount))
    return api(config)
  }
)

export default api

export async function deleteUser(id: number) {
  return api.delete(`/api/v1/admin/users/${id}`)
}


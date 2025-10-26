import axios from 'axios'
import { config } from '../config/env'

const api = axios.create({
  baseURL: config.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

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
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('id_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api


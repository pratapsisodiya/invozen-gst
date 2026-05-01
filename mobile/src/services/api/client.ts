import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://invozen-gst.vercel.app/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const user = useAuthStore.getState().user
    if (user) {
      config.headers.Authorization = `Bearer ${user.id}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - logout user
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

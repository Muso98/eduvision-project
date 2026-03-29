import axios from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = Cookies.get('refresh_token')
      if (refresh) {
        try {
          const res = await axios.post(`${API_URL}/api/auth/token/refresh/`, { refresh })
          Cookies.set('access_token', res.data.access, { expires: 1 })
          error.config.headers.Authorization = `Bearer ${res.data.access}`
          return api.request(error.config)
        } catch {
          Cookies.remove('access_token')
          Cookies.remove('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const login = (email: string, password: string) =>
  api.post('/api/auth/login/', { email, password })

export const logout = () =>
  api.post('/api/auth/logout/', { refresh: Cookies.get('refresh_token') })

export const getMe = () => api.get('/api/auth/me/')
export const updateMe = (data: FormData | any) => {
  const isFormData = data instanceof FormData;
  return api.patch('/api/auth/me/', data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
}

// Classrooms
export const getClassrooms = () => api.get('/api/classrooms/')
export const createClassroom = (data: object) => api.post('/api/classrooms/', data)

// Lessons
export const getLessons = () => api.get('/api/lessons/')
export const getLesson = (id: number) => api.get(`/api/lessons/${id}/`)
export const startLesson = (data: { title: string; classroom_id: number }) =>
  api.post('/api/lessons/start/', data)
export const stopLesson = (id: number) => api.post(`/api/lessons/${id}/stop/`)
export const analyzeVideo = (lessonId: number, file: File, onProgress?: (pct: number) => void) => {
  const form = new FormData()
  form.append('video', file)
  return api.post(`/api/lessons/${lessonId}/analyze-video/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000, // 5 min for large videos
    onUploadProgress: e => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
}

export const analyzeVideoStandalone = (file: File, onProgress?: (pct: number) => void) => {
  const form = new FormData()
  form.append('video', file)
  return api.post(`/api/lessons/analyze-video/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
    onUploadProgress: e => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
}

// Reports
export const getReports = () => api.get('/api/reports/')
export const getReport = (lessonId: number) => api.get(`/api/reports/${lessonId}/`)
export const exportReportCsv = (lessonId: number, lang: string = 'en') => api.get(`/api/reports/${lessonId}/export/csv/?lang=${lang}`, { responseType: 'blob' })
export const exportReportPdf = (lessonId: number, lang: string = 'en') => api.get(`/api/reports/${lessonId}/export/pdf/?lang=${lang}`, { responseType: 'blob' })

// Users (admin)
export const getUsers = () => api.get('/api/auth/users/')
export const createUser = (data: object) => api.post('/api/auth/users/', data)

export default api

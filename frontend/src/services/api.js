import axios from 'axios'
import { clearSession, getToken } from './session'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// An expired or invalid session (401) sends the user back to sign in,
// remembering where they were. Login failures are left to the login form.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const isLogin = error.config?.url?.includes('/auth/login')
    if (status === 401 && !isLogin) {
      clearSession()
      const here = window.location.pathname + window.location.search
      if (window.location.pathname !== '/') {
        window.location.assign(`/?redirect=${encodeURIComponent(here)}`)
      }
    }
    return Promise.reject(error)
  }
)

export function errorMessage(error, fallback) {
  return error?.response?.data?.message || fallback
}

export default api

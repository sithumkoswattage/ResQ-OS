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

// 401 = session expired/invalid; 403 "account_suspended" = an administrator
// suspended this account. Either way, drop the session and go to sign-in.
// (The login request itself is excluded so its errors show on the form.)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const code = error.response?.data?.code
    const isLogin = String(error.config?.url || '').includes('/auth/login')
    if (!isLogin && (status === 401 || (status === 403 && code === 'account_suspended'))) {
      clearSession()
      if (window.location.pathname !== '/') {
        window.location.assign(`/?reason=${code === 'account_suspended' ? 'suspended' : 'expired'}`)
      }
    }
    return Promise.reject(error)
  }
)

export default api

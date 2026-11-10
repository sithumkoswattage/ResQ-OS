// Single place that knows where the login session is stored.
const KEYS = ['token', 'user']

export function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}

export function getUser() {
  const raw = localStorage.getItem('user') || sessionStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function getRole() {
  return getUser()?.role ?? null
}

export function clearSession() {
  for (const key of KEYS) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  }
}

// Where each role lands after signing in.
export function homeFor(role) {
  if (role === 'admin') return '/admin'
  if (role === 'dispatcher') return '/dispatcher'
  return '/'
}

// Where the sign-in token and user live (localStorage for "Remember me",
// sessionStorage otherwise).
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
  const role = getUser()?.role
  return role === 'field' ? 'responder' : role || null
}

export function homeFor(role) {
  return role === 'responder' ? '/field' : '/dispatcher'
}

export function clearSession() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem('token')
    storage.removeItem('user')
  }
}

export function titleCase(value = '') {
  return String(value).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

export function timeAgo(value, now = Date.now()) {
  if (!value) return '—'
  const seconds = Math.max(0, Math.floor((now - new Date(value).getTime()) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.floor(hours / 24)} d ago`
}

export function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

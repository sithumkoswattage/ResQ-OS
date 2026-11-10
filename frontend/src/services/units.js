// Mirrors backend/services/presence.js: a unit is online when it is not
// switched off and its device pinged within the last 60 s.
export const ONLINE_WINDOW_MS = 60 * 1000

export function isUnitOnline(unit, now = Date.now()) {
  if (!unit || unit.status === 'offline' || !unit.lastSeen) return false
  return now - new Date(unit.lastSeen).getTime() <= ONLINE_WINDOW_MS
}

const PROGRESS_LABELS = {
  assigned: 'Dispatched',
  accepted: 'Accepted',
  on_scene: 'On scene'
}

export function progressLabel(progress) {
  return PROGRESS_LABELS[progress] || 'Dispatched'
}

export function formatLastSeen(value) {
  if (!value) return 'Never seen'
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 60) return 'Seen just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `Seen ${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Seen ${hours} h ago`
  return `Seen ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))}`
}

export function formatEta(minutes) {
  if (minutes == null) return ''
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${Math.round(minutes)} min`
  return `${Math.floor(minutes / 60)} h ${Math.round(minutes % 60)} min`
}

import api from './api'

// Opens the Server-Sent Events stream and keeps it open.
// `handlers` maps event names (see API_CONTRACT.md) to callbacks receiving the
// parsed JSON payload. `onReconnect` runs after every reconnect (not the first
// connect), so callers can reload data missed while disconnected.
// Returns a function that closes the stream for good.
export function connectStream(handlers, { onReconnect, onStatus } = {}) {
  let source
  let closed = false
  let retry = 1000
  let timer
  let connectedBefore = false

  function scheduleRetry() {
    if (closed) return
    timer = setTimeout(open, retry)
    retry = Math.min(retry * 2, 15000)
  }

  async function open() {
    if (closed) return
    try {
      const { data } = await api.post('/stream/ticket')
      if (closed) return
      const base = api.defaults.baseURL.replace(/\/$/, '')
      source = new EventSource(`${base}/stream?ticket=${encodeURIComponent(data.ticket)}`)
      source.addEventListener('connected', () => {
        retry = 1000
        onStatus?.(true)
        if (connectedBefore) onReconnect?.()
        connectedBefore = true
      })
      for (const [event, fn] of Object.entries(handlers)) {
        source.addEventListener(event, (e) => {
          try {
            fn(JSON.parse(e.data))
          } catch (err) {
            console.error(`Stream handler for "${event}" failed`, err)
          }
        })
      }
      // Tickets are single-use: never let EventSource auto-reconnect.
      source.onerror = () => {
        source.close()
        onStatus?.(false)
        scheduleRetry()
      }
    } catch {
      onStatus?.(false)
      scheduleRetry()
    }
  }

  open()
  return () => {
    closed = true
    clearTimeout(timer)
    source?.close()
  }
}

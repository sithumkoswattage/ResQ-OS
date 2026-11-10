import api from './api'
import { clearSession } from './session'

// Live updates over Server-Sent Events (see API_CONTRACT.md).
//   const stop = connectStream({ 'unit:status': (unit) => ... }, { onStatus: (ok) => ... })
// Call stop() on unmount. Events missed while disconnected are not replayed,
// so reload your data when onStatus(true) fires after a reconnect.
export function connectStream(handlers = {}, { onStatus } = {}) {
  let source = null
  let closed = false
  let retry = 1000
  let timer = null

  function schedule() {
    if (closed) return
    timer = setTimeout(open, retry)
    retry = Math.min(retry * 2, 15000)
  }

  async function open() {
    if (closed) return
    try {
      // Tickets are single-use, so every (re)connect needs a fresh one.
      const { data } = await api.post('/stream/ticket')
      if (closed) return
      const base = String(api.defaults.baseURL).replace(/\/$/, '')
      source = new EventSource(`${base}/stream?ticket=${encodeURIComponent(data.ticket)}`)
      source.addEventListener('connected', () => {
        retry = 1000
        onStatus?.(true)
      })
      source.addEventListener('account:suspended', () => {
        clearSession()
        window.location.assign('/?reason=suspended')
      })
      for (const [event, handler] of Object.entries(handlers)) {
        source.addEventListener(event, (message) => {
          try {
            handler(JSON.parse(message.data))
          } catch (error) {
            console.error(`Error handling "${event}"`, error)
          }
        })
      }
      source.onerror = () => {
        source.close()
        onStatus?.(false)
        schedule()
      }
    } catch {
      onStatus?.(false)
      schedule()
    }
  }

  open()
  return () => {
    closed = true
    clearTimeout(timer)
    source?.close()
  }
}

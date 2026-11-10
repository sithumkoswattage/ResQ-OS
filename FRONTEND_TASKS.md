# Frontend tasks for Amandi

The backend for everything below is **done** and described in [`API_CONTRACT.md`](API_CONTRACT.md). Read that first. Everything in this file is frontend work; you shouldn't need to touch `backend/`. If an endpoint doesn't behave as the contract says, tell Sithum.

> **Update:** the login role switch is gone, `api.js` now handles 401/suspension, `services/stream.js` (live updates) exists, and the admin console (`/admin`, `src/views/admin/`) is built. Section 1's quick fixes are done except routing responders to the field app. New API for the admin side is in `API_CONTRACT.md`.

## 0. Get running

```bash
# terminal 1 - MongoDB must be running locally (or: docker compose up mongo)
cd backend
cp .env.example .env        # then set JWT_SECRET (16+ random chars) if you don't have a .env
npm install
npm run seed:initial                                   # sample incidents + units
DEMO_RESPONDER_PASSWORD='pick-something' npm run seed:responders   # logins: res-101, med-103, res-104, pat-102, wtr-101
node createDispatcher.js                               # your dispatcher login
npm start

# terminal 2
cd frontend && npm install && npm run dev              # http://localhost:5173 (proxies /api to :5000)
```
Full stack in containers instead: `JWT_SECRET=<random> docker compose up --build`, then http://localhost:8080.

Branch: work on a feature branch off `feature/nearest-unit-dispatch` (or after Sithum merges it into `main`), so you get the backend changes.

## 1. Quick fixes (do these first, ~30 min)

- **401 handling** in `src/services/api.js`: add a response interceptor; on `401`, clear `token`/`user` from `localStorage` and `sessionStorage` and redirect to `/` (keep `?redirect=`). Without this, an expired session (8 h) leaves the app half-broken.
- `LoginView.vue` uses raw `fetch('/api/auth/login')`. Switch it to `api.post('/auth/login', ...)` so base URL / interceptors apply (and handle `429`: show the server message).
- Route responders to the new field app after login instead of the "maintenance" message (see section 3).
- Add a small **live stream helper** (see section 4) and use it in the dispatcher pages.

## 2. Dispatcher: the core loop

1. **Click-to-place on the map** (`IncidentsView.vue`, form): add a Leaflet map (`@vue-leaflet/vue-leaflet`, already installed - see `CommandCenterView.vue` for setup). Clicking sets `form.latitude` / `form.longitude` and drops a marker; keep the number inputs in sync so they can still be typed. Optional: reverse-geocode the click with Nominatim to fill `location` (rate-limited, 1 req/s, send a descriptive `User-Agent`/referer; let the dispatcher edit the text).
2. **Nearest units panel** on `IncidentDetailsView.vue` (and ideally from the Command Center after clicking an incident):
   - `GET /incidents/:id/nearby-resources?limit=5&routing=true` (fall back to without `routing` if it's slow).
   - Show each unit: name, code, type, `online` badge, distance and ETA (`durationMin`, label it "approx." if `routeSource === 'straight-line'`).
   - **Dispatch** button -> `PATCH /resources/:id/assignment` `{ incidentId }`. On `409`, show the message and reload the list.
   - Show the already-assigned units (you have this) with a **Release** button.
3. **Command Center map**: show `online`/stale units differently; optionally draw the route (`GET /route?...`) for a selected unit -> incident as a `LPolyline`.
4. **Resources page**: show `operator` and `online`; add a "Link operator" action using `PUT /resources/:id/operator` (`{ email }` / `{ email: null }`).
5. Replace the 30 s polling with live updates (section 4); keep one initial load plus a slow fallback refresh (e.g. 2 min).

## 3. Field unit app (new)

`src/views/FieldDashboard.vue` is a hardcoded placeholder and isn't routed. Replace it with the real thing and add a guarded route, e.g. `/field`, plus `meta: { role: 'responder' }` checks in the router (the login stores `user.role`). Mobile-first - this is used on a phone.

Screen contents:
- **Online toggle** -> `PATCH /me/status` (`available` / `offline`). Disabled while dispatched.
- **Location reporting**: while online, `navigator.geolocation.watchPosition` and `POST /me/location` at most every ~10 s. Needs HTTPS in production (localhost is fine in dev). Show a clear "location unavailable / permission denied" state. Numbers only in the body.
- **Current assignment card** (`GET /me/unit`): incident title, type, priority, location, description, distance/ETA.
- **Map**: unit position, incident marker, and the route polyline from `GET /me/route` (`geometry` is `[[lat,lng],...]`). Refresh the route every ~30 s or when the position moves a lot.
- **Progress buttons**: Accept -> On scene -> Complete (`PATCH /me/assignment`). Only show the next valid step. After Complete, go back to the idle/online screen.
- **New dispatch alert**: when `dispatch:assigned` arrives, show a prominent banner and play a sound/vibrate (`navigator.vibrate`). Audio needs a prior user interaction (e.g. the online toggle) before the browser allows it.
- Empty state for `404 No unit is linked...`: "Ask a dispatcher to link your account to a unit."

## 4. Live stream helper (`src/services/stream.js`)

```js
import api from './api'

export function connectStream(handlers) {
  let source, closed = false, retry = 1000
  async function open() {
    if (closed) return
    try {
      const { data } = await api.post('/stream/ticket')
      const base = api.defaults.baseURL.replace(/\/$/, '')
      source = new EventSource(`${base}/stream?ticket=${data.ticket}`)
      source.addEventListener('connected', () => { retry = 1000 })
      for (const [event, fn] of Object.entries(handlers)) {
        source.addEventListener(event, (e) => fn(JSON.parse(e.data)))
      }
      // Tickets are single-use: never let EventSource auto-reconnect.
      source.onerror = () => { source.close(); setTimeout(open, retry); retry = Math.min(retry * 2, 15000) }
    } catch { setTimeout(open, retry); retry = Math.min(retry * 2, 15000) }
  }
  open()
  return () => { closed = true; source?.close() }
}
```
Use in `onMounted`, and call the returned function in `onUnmounted`. Events and payloads are in the contract. After a reconnect, reload the data once - events missed while disconnected are not replayed.

## 5. Testing it end to end

- Two browsers (or one normal + one private window): dispatcher in one, `res-104` in the other (sign in with the **Field Unit** tab). Create an incident, dispatch `res-104`, watch the field screen react, accept / arrive / complete, and watch the dispatcher side update.
- Without a real GPS, use Chrome DevTools -> Sensors to fake the location.
- Routing uses the public OSRM demo server by default (needs internet); if it's down you'll get `routeSource: "straight-line"` - handle that gracefully.
- Backend tests: `cd backend && npm test` (the integration test needs `TEST_MONGO_URI=mongodb://localhost:27017`).

## 6. Open product questions (agree with Sithum)

- Can a unit **decline** a dispatch? (Not built; would be `PATCH /me/assignment` `{ progress: "declined" }` + auto-release.)
- Sound/notification when the field app is in the background -> needs a PWA + push notifications (later).
- Should dispatchers be able to create responder accounts from the UI? (Today: `npm run create:responder` or self-registration + "Link operator".)

<template>
  <div class="field-app" @pointerdown.once="unlockAudio">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark"><ShieldCheck :size="18" aria-hidden="true" /></span>
        <div>
          <strong>ResQ<span>-OS</span></strong>
          <small>{{ unit ? `${unit.unitCode} · ${unit.name}` : 'Field unit' }}</small>
        </div>
      </div>
      <button class="ghost-button" type="button" @click="signOut">
        <LogOut :size="16" aria-hidden="true" /> Sign out
      </button>
    </header>

    <transition name="slide">
      <div v-if="banner" class="banner" :class="`banner-${banner.tone}`" role="alert">
        <BellRing v-if="banner.tone === 'dispatch'" :size="22" aria-hidden="true" />
        <Info v-else :size="20" aria-hidden="true" />
        <div>
          <strong>{{ banner.title }}</strong>
          <span>{{ banner.text }}</span>
        </div>
        <button type="button" aria-label="Dismiss" @click="banner = null"><X :size="18" /></button>
      </div>
    </transition>

    <main class="content">
      <p v-if="loading" class="state-card">Loading your unit…</p>

      <section v-else-if="notLinked" class="state-card empty">
        <Link2Off :size="30" aria-hidden="true" />
        <h2>No unit linked</h2>
        <p>Ask a dispatcher to link your account to a unit.</p>
        <button class="secondary-button" type="button" @click="loadUnit">Check again</button>
      </section>

      <template v-else-if="unit">
        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

        <!-- Availability -->
        <section class="card status-card">
          <div>
            <span class="eyebrow">Availability</span>
            <strong class="status-line">
              <i class="status-dot" :class="statusTone"></i>
              {{ statusText }}
            </strong>
            <small v-if="isDispatched">You can go offline after this dispatch is complete.</small>
            <small v-else-if="unit.status !== 'offline'">{{ lastSentText }}</small>
            <small v-else>Go online to receive dispatches.</small>
          </div>
          <button
            class="switch"
            :class="{ on: unit.status !== 'offline' }"
            type="button"
            role="switch"
            :aria-checked="unit.status !== 'offline'"
            :disabled="isDispatched || statusBusy"
            @click="toggleOnline"
          >
            <span class="knob"></span>
            <span class="sr-only">Online</span>
          </button>
        </section>

        <!-- Location -->
        <section v-if="unit.status !== 'offline'" class="card location-card" :class="`geo-${geoState}`">
          <MapPin :size="18" aria-hidden="true" />
          <div>
            <strong>{{ geoTitle }}</strong>
            <small>{{ geoDetail }}</small>
          </div>
          <button v-if="geoState === 'denied' || geoState === 'unavailable'" class="secondary-button" type="button" @click="startLocation">
            Retry
          </button>
        </section>

        <!-- Assignment -->
        <section v-if="assignment" class="card assignment-card">
          <div class="assignment-head">
            <span class="eyebrow">Current assignment · {{ assignment.code }}</span>
            <span class="priority" :class="`priority-${assignment.priority}`">{{ titleCase(assignment.priority) }}</span>
          </div>
          <h1>{{ assignment.title }}</h1>
          <p class="meta">{{ assignment.type }} · {{ assignment.location }}</p>
          <p v-if="assignment.description" class="description">{{ assignment.description }}</p>

          <div class="eta-row">
            <div>
              <span class="eyebrow">Distance</span>
              <strong>{{ route ? formatKm(route.distanceKm) : '—' }}</strong>
            </div>
            <div>
              <span class="eyebrow">ETA{{ route?.source === 'straight-line' ? ' (approx.)' : '' }}</span>
              <strong>{{ route ? formatEta(route.durationMin) : '—' }}</strong>
            </div>
            <div>
              <span class="eyebrow">Stage</span>
              <strong>{{ progressLabel(progress) }}</strong>
            </div>
          </div>

          <ol class="steps" aria-label="Dispatch progress">
            <li v-for="step in steps" :key="step.value" :class="stepState(step.value)">
              <span></span>{{ step.label }}
            </li>
          </ol>

          <button
            v-if="nextStep"
            class="progress-button"
            :class="`next-${nextStep.value}`"
            type="button"
            :disabled="progressBusy"
            @click="advance"
          >
            <component :is="nextStep.icon" :size="20" aria-hidden="true" />
            {{ progressBusy ? 'Updating…' : nextStep.label }}
          </button>

          <a
            class="nav-link"
            :href="`https://www.google.com/maps/dir/?api=1&destination=${assignment.latitude},${assignment.longitude}`"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation :size="15" aria-hidden="true" /> Open in maps app
          </a>
        </section>

        <section v-else-if="unit.status !== 'offline'" class="card idle-card">
          <Radio :size="26" aria-hidden="true" />
          <h2>Standing by</h2>
          <p>You'll be alerted here when a dispatcher assigns you to an incident.</p>
        </section>

        <!-- Map -->
        <section class="card map-card">
          <div class="map-wrap">
            <LMap
              :zoom="14"
              :center="mapCenter"
              :use-global-leaflet="false"
              :options="{ zoomControl: true }"
              @ready="onMapReady"
            >
              <LTileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <LPolyline
                v-if="route?.geometry?.length"
                :lat-lngs="route.geometry"
                color="#3b82f6"
                :weight="6"
                :opacity="0.85"
                :dash-array="route.source === 'straight-line' ? '10 10' : null"
              />
              <LCircleMarker
                v-if="assignment"
                :lat-lng="[assignment.latitude, assignment.longitude]"
                :radius="11"
                color="#be123c"
                fill-color="#f43f5e"
                :fill-opacity="0.95"
                :weight="3"
              />
              <LCircleMarker
                :lat-lng="unitPosition"
                :radius="9"
                color="#ffffff"
                fill-color="#2563eb"
                :fill-opacity="1"
                :weight="3"
              />
            </LMap>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  BellRing,
  CheckCircle2,
  Info,
  Link2Off,
  LogOut,
  MapPin,
  Navigation,
  Radio,
  ShieldCheck,
  Siren,
  ThumbsUp,
  X
} from 'lucide-vue-next'
import { LCircleMarker, LMap, LPolyline, LTileLayer } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import api, { errorMessage as apiError } from '../services/api'
import { connectStream } from '../services/stream'
import { clearSession } from '../services/session'
import { formatEta, progressLabel } from '../services/units'

const LOCATION_INTERVAL_MS = 10000
const ROUTE_INTERVAL_MS = 30000
const ROUTE_MOVE_THRESHOLD_KM = 0.25

const router = useRouter()
const loading = ref(true)
const notLinked = ref(false)
const errorMessage = ref('')
const unit = ref(null)
const assignment = ref(null)
const progress = ref(null)
const route = ref(null)
const banner = ref(null)
const statusBusy = ref(false)
const progressBusy = ref(false)

// Geolocation: idle | waiting | watching | denied | unavailable | unsupported
const geoState = ref('idle')
const position = ref(null)
const lastSentAt = ref(null)
const now = ref(Date.now())

let watchId = null
let sending = false
let routeTimer
let clockTimer
let routeFrom = null
let closeStream
let map = null
let audioCtx = null

const steps = [
  { value: 'assigned', label: 'Dispatched' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'on_scene', label: 'On scene' },
  { value: 'completed', label: 'Complete' }
]
const ORDER = steps.map((s) => s.value)

const NEXT = {
  assigned: { value: 'accepted', label: 'Accept dispatch', icon: ThumbsUp },
  accepted: { value: 'on_scene', label: 'Arrived on scene', icon: Siren },
  on_scene: { value: 'completed', label: 'Complete dispatch', icon: CheckCircle2 }
}

const isDispatched = computed(() => unit.value?.status === 'dispatched')
const nextStep = computed(() => (assignment.value ? NEXT[progress.value || 'assigned'] : null))

const statusText = computed(() => {
  if (!unit.value) return ''
  if (isDispatched.value) return 'Dispatched'
  return unit.value.status === 'offline' ? 'Offline' : 'Online · available'
})
const statusTone = computed(() => (isDispatched.value ? 'tone-dispatched' : unit.value?.status === 'offline' ? 'tone-offline' : 'tone-online'))

const lastSentText = computed(() => {
  if (!lastSentAt.value) return 'Waiting to share your location…'
  const seconds = Math.max(0, Math.round((now.value - lastSentAt.value) / 1000))
  return seconds < 5 ? 'Location shared just now' : `Location shared ${seconds}s ago`
})

const geoTitle = computed(() => ({
  idle: 'Location not started',
  waiting: 'Finding your location…',
  watching: 'Sharing live location',
  denied: 'Location permission denied',
  unavailable: 'Location unavailable',
  unsupported: 'Location not supported'
}[geoState.value]))

const geoDetail = computed(() => {
  if (geoState.value === 'denied') return 'Allow location access for this site in your browser settings, then retry.'
  if (geoState.value === 'unavailable') return 'No GPS fix yet. Move to open sky or check that location services are on.'
  if (geoState.value === 'unsupported') return 'This browser cannot share location. Dispatch will use your last known position.'
  if (position.value) {
    const { latitude, longitude, accuracy } = position.value
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)} · ±${Math.round(accuracy)} m`
  }
  return 'Location needs HTTPS outside of local development.'
})

const unitPosition = computed(() => (position.value
  ? [position.value.latitude, position.value.longitude]
  : [unit.value?.latitude ?? 6.9271, unit.value?.longitude ?? 79.8612]))

const mapCenter = computed(() => unitPosition.value)

function stepState(value) {
  const current = ORDER.indexOf(progress.value || 'assigned')
  const index = ORDER.indexOf(value)
  if (index < current) return 'done'
  if (index === current) return 'current'
  return ''
}

// ---------- Data ----------

async function loadUnit() {
  errorMessage.value = ''
  try {
    const { data } = await api.get('/me/unit')
    const wasUnlinked = notLinked.value
    notLinked.value = false
    applyUnitState(data)
    // Stream tickets carry the unit id, so reconnect once a unit is linked.
    if (wasUnlinked && closeStream) startStream()
  } catch (error) {
    if (error.response?.status === 404) {
      notLinked.value = true
      unit.value = null
    } else {
      errorMessage.value = apiError(error, 'Unable to load your unit.')
    }
  } finally {
    loading.value = false
  }
}

function applyUnitState(data) {
  unit.value = data.unit
  const hadAssignment = assignment.value?._id
  assignment.value = data.assignment
  progress.value = data.progress
  if (!data.assignment) {
    route.value = null
    routeFrom = null
  } else if (data.assignment._id !== hadAssignment) {
    loadRoute()
  }
  if (data.unit.status !== 'offline') startLocation()
  else stopLocation()
}

async function loadRoute() {
  if (!assignment.value) return
  try {
    const { data } = await api.get('/me/route')
    route.value = data
    routeFrom = data.from
    fitMap()
  } catch (error) {
    if (error.response?.status === 404) route.value = null
  }
}

// ---------- Availability ----------

async function toggleOnline() {
  if (!unit.value || isDispatched.value) return
  unlockAudio()
  const status = unit.value.status === 'offline' ? 'available' : 'offline'
  statusBusy.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.patch('/me/status', { status })
    unit.value = data.unit
    if (status === 'available') {
      lastSentAt.value = null
      startLocation()
    } else {
      stopLocation()
    }
  } catch (error) {
    errorMessage.value = apiError(error, 'Unable to change availability.')
    if (error.response?.status === 409) loadUnit()
  } finally {
    statusBusy.value = false
  }
}

// ---------- Location ----------

function startLocation() {
  if (watchId !== null) return
  if (!('geolocation' in navigator)) {
    geoState.value = 'unsupported'
    return
  }
  geoState.value = 'waiting'
  watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 20000
  })
}

function stopLocation() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId)
  watchId = null
  geoState.value = 'idle'
}

function onPosition(pos) {
  geoState.value = 'watching'
  position.value = {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy
  }
  if (!lastSentAt.value || Date.now() - lastSentAt.value >= LOCATION_INTERVAL_MS) sendLocation()
}

function onPositionError(err) {
  if (err.code === err.PERMISSION_DENIED) {
    geoState.value = 'denied'
    if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    watchId = null
  } else {
    // Timeouts and lost fixes: keep watching, but say so.
    geoState.value = position.value ? 'watching' : 'unavailable'
  }
}

async function sendLocation() {
  if (sending || !position.value || unit.value?.status === 'offline') return
  sending = true
  const latitude = Number(position.value.latitude)
  const longitude = Number(position.value.longitude)
  try {
    const { data } = await api.post('/me/location', { latitude, longitude })
    lastSentAt.value = Date.now()
    if (unit.value) unit.value = { ...unit.value, latitude, longitude, lastSeen: data.lastSeen }
    if (assignment.value && movedFar(latitude, longitude)) loadRoute()
  } catch (error) {
    if (error.response?.status === 409) {
      // The unit was switched offline elsewhere.
      await loadUnit()
    }
  } finally {
    sending = false
  }
}

function movedFar(lat, lng) {
  if (!routeFrom) return true
  return distanceKm(lat, lng, routeFrom.lat, routeFrom.lng) > ROUTE_MOVE_THRESHOLD_KM
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ---------- Progress ----------

async function advance() {
  if (!nextStep.value) return
  const step = nextStep.value.value
  if (step === 'completed' && !window.confirm('Mark this dispatch as complete?')) return
  progressBusy.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.patch('/me/assignment', { progress: step })
    applyUnitState(data)
    if (step === 'completed') {
      banner.value = { tone: 'info', title: 'Dispatch complete', text: 'You are back online and available.' }
    }
  } catch (error) {
    errorMessage.value = apiError(error, 'Unable to update progress.')
    if (error.response?.status === 409) loadUnit()
  } finally {
    progressBusy.value = false
  }
}

// ---------- Alerts ----------

function unlockAudio() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioCtx = new Ctx()
    }
    audioCtx?.resume?.()
  } catch {
    audioCtx = null
  }
}

function playAlert() {
  navigator.vibrate?.([400, 150, 400, 150, 600])
  if (!audioCtx || audioCtx.state !== 'running') return
  const start = audioCtx.currentTime
  for (let i = 0; i < 3; i += 1) {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'square'
    osc.frequency.value = i % 2 ? 660 : 880
    gain.gain.setValueAtTime(0.0001, start + i * 0.35)
    gain.gain.exponentialRampToValueAtTime(0.25, start + i * 0.35 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.35 + 0.3)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start(start + i * 0.35)
    osc.stop(start + i * 0.35 + 0.32)
  }
}

function onDispatchAssigned({ incident, progress: newProgress }) {
  banner.value = {
    tone: 'dispatch',
    title: 'New dispatch',
    text: `${incident.title} · ${incident.location}`
  }
  playAlert()
  if (unit.value) unit.value = { ...unit.value, status: 'dispatched' }
  assignment.value = incident
  progress.value = newProgress || 'assigned'
  routeFrom = null
  loadRoute()
  loadUnit()
}

function onDispatchReleased({ incidentId }) {
  if (assignment.value && String(assignment.value._id) === String(incidentId)) {
    banner.value = { tone: 'info', title: 'Dispatch released', text: 'The dispatcher released you from this incident.' }
    navigator.vibrate?.(200)
  }
  loadUnit()
}

// ---------- Map ----------

function onMapReady(instance) {
  map = instance
  fitMap()
}

function fitMap() {
  if (!map || !assignment.value) return
  const points = route.value?.geometry?.length
    ? route.value.geometry
    : [unitPosition.value, [assignment.value.latitude, assignment.value.longitude]]
  try {
    map.fitBounds(points, { padding: [30, 30], maxZoom: 16 })
  } catch {
    // map not laid out yet
  }
}

watch(assignment, (value) => {
  if (!value) map?.setView(unitPosition.value, 14)
})

// ---------- Misc ----------

function signOut() {
  stopLocation()
  closeStream?.()
  clearSession()
  router.push('/')
}

function titleCase(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
}

function formatKm(km) {
  if (km == null) return '—'
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function startStream() {
  closeStream?.()
  closeStream = connectStream({
    'dispatch:assigned': onDispatchAssigned,
    'dispatch:released': onDispatchReleased
  }, { onReconnect: loadUnit })
}

onMounted(async () => {
  await loadUnit()
  startStream()
  routeTimer = window.setInterval(() => {
    if (assignment.value) loadRoute()
  }, ROUTE_INTERVAL_MS)
  clockTimer = window.setInterval(() => {
    now.value = Date.now()
    // Keep presence alive even if the device is standing still.
    if (position.value && lastSentAt.value && Date.now() - lastSentAt.value >= LOCATION_INTERVAL_MS * 2) sendLocation()
  }, 5000)
})

onUnmounted(() => {
  stopLocation()
  closeStream?.()
  window.clearInterval(routeTimer)
  window.clearInterval(clockTimer)
  audioCtx?.close?.()
})
</script>

<style scoped>
.field-app {
  min-height: 100vh;
  min-height: 100dvh;
  color: #e2e8f0;
  background: radial-gradient(circle at top, #1e293b 0%, #0b1020 60%);
  font-size: 15px;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
  background: rgb(11 16 32 / 85%);
  backdrop-filter: blur(12px);
}

.brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
.brand-mark {
  display: flex;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #fff;
  background: linear-gradient(135deg, #d97706, #e11d48);
}
.brand strong { display: block; color: #fff; font-size: 16px; }
.brand strong span { color: #f59e0b; }
.brand small {
  display: block;
  overflow: hidden;
  color: #94a3b8;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ghost-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 10px;
  padding: 0 12px;
  color: #e2e8f0;
  background: rgb(255 255 255 / 6%);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 640px;
  margin: 0 auto;
  padding: 14px 16px 32px;
}

.card,
.state-card {
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: 18px;
  padding: 16px;
  background: rgb(15 23 42 / 80%);
  box-shadow: 0 10px 30px rgb(0 0 0 / 25%);
}

.state-card { color: #94a3b8; text-align: center; }
.state-card.empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 20px; }
.state-card.empty h2 { margin: 4px 0 0; color: #fff; font-size: 18px; }
.state-card.empty p { margin: 0 0 8px; }

.eyebrow {
  display: block;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.status-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.status-card small { display: block; margin-top: 4px; color: #94a3b8; font-size: 12px; }
.status-line { display: flex; align-items: center; gap: 8px; margin-top: 4px; color: #fff; font-size: 19px; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; }
.tone-online { background: #22c55e; box-shadow: 0 0 0 4px rgb(34 197 94 / 20%); }
.tone-dispatched { background: #3b82f6; box-shadow: 0 0 0 4px rgb(59 130 246 / 25%); }
.tone-offline { background: #64748b; }

.switch {
  position: relative;
  width: 64px;
  height: 36px;
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  background: #334155;
  cursor: pointer;
  transition: background 0.2s;
}
.switch.on { background: #16a34a; }
.switch:disabled { cursor: not-allowed; opacity: 0.55; }
.knob {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}
.switch.on .knob { transform: translateX(28px); }

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.location-card { display: flex; align-items: center; gap: 12px; padding: 12px 16px; }
.location-card > div { flex: 1; min-width: 0; }
.location-card strong { display: block; color: #fff; font-size: 14px; }
.location-card small { display: block; color: #94a3b8; font-size: 12px; }
.geo-watching { border-color: rgb(34 197 94 / 35%); }
.geo-watching svg { color: #22c55e; }
.geo-denied,
.geo-unavailable,
.geo-unsupported { border-color: rgb(245 158 11 / 45%); background: rgb(69 26 3 / 55%); }
.geo-denied svg,
.geo-unavailable svg,
.geo-unsupported svg { color: #f59e0b; }

.assignment-card { border-color: rgb(244 63 94 / 40%); }
.assignment-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.assignment-card h1 { margin: 8px 0 4px; color: #fff; font-size: 22px; line-height: 1.2; }
.meta { margin: 0; color: #cbd5e1; font-size: 14px; }
.description { margin: 10px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.45; white-space: pre-line; }

.priority { border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 800; }
.priority-critical { color: #fff; background: #e11d48; }
.priority-high { color: #fecdd3; background: rgb(225 29 72 / 30%); }
.priority-medium { color: #bfdbfe; background: rgb(59 130 246 / 25%); }
.priority-low { color: #bbf7d0; background: rgb(34 197 94 / 20%); }

.eta-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 14px 0;
}
.eta-row > div { border-radius: 12px; padding: 10px; background: rgb(255 255 255 / 5%); }
.eta-row strong { display: block; margin-top: 3px; color: #fff; font-size: 16px; }

.steps {
  display: flex;
  justify-content: space-between;
  margin: 0 0 14px;
  padding: 0;
  list-style: none;
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
}
.steps li { display: flex; flex: 1; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
.steps li span { width: 12px; height: 12px; border: 2px solid #475569; border-radius: 50%; }
.steps li.done { color: #86efac; }
.steps li.done span { border-color: #22c55e; background: #22c55e; }
.steps li.current { color: #fff; }
.steps li.current span { border-color: #f59e0b; background: #f59e0b; box-shadow: 0 0 0 4px rgb(245 158 11 / 25%); }

.progress-button {
  display: flex;
  width: 100%;
  min-height: 56px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 0;
  border-radius: 14px;
  color: #fff;
  font: inherit;
  font-size: 17px;
  font-weight: 800;
  cursor: pointer;
}
.progress-button:disabled { opacity: 0.6; cursor: wait; }
.next-accepted { background: linear-gradient(90deg, #d97706, #e11d48); }
.next-on_scene { background: linear-gradient(90deg, #2563eb, #4f46e5); }
.next-completed { background: linear-gradient(90deg, #16a34a, #0d9488); }

.nav-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
  color: #93c5fd;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.idle-card { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 26px 16px; text-align: center; }
.idle-card svg { color: #22c55e; }
.idle-card h2 { margin: 6px 0 0; color: #fff; font-size: 18px; }
.idle-card p { margin: 0; color: #94a3b8; font-size: 14px; }

.map-card { padding: 0; overflow: hidden; }
.map-wrap { height: 320px; }

.banner {
  position: sticky;
  top: 59px;
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 10px 16px 0;
  border-radius: 16px;
  padding: 14px 16px;
  color: #fff;
  box-shadow: 0 12px 30px rgb(0 0 0 / 40%);
}
.banner > div { display: flex; flex: 1; min-width: 0; flex-direction: column; }
.banner strong { font-size: 16px; }
.banner span { font-size: 13px; opacity: 0.9; }
.banner button { border: 0; color: inherit; background: none; cursor: pointer; }
.banner-dispatch { background: linear-gradient(90deg, #e11d48, #d97706); animation: pulse 1.2s ease-in-out 3; }
.banner-info { background: #1e3a8a; }

@keyframes pulse {
  50% { transform: scale(1.02); }
}

.slide-enter-active,
.slide-leave-active { transition: all 0.25s; }
.slide-enter-from,
.slide-leave-to { opacity: 0; transform: translateY(-10px); }

.error-message {
  margin: 0;
  border: 1px solid rgb(244 63 94 / 40%);
  border-radius: 12px;
  padding: 10px 12px;
  color: #fecdd3;
  background: rgb(76 5 25 / 60%);
  font-size: 13px;
}

@media (min-width: 900px) {
  .map-wrap { height: 420px; }
}
</style>

<template>
  <section class="incident-details">
    <header class="page-header">
      <div>
        <p class="eyebrow">Incident register</p>
        <h1>{{ incident?.title || 'Incident details' }}</h1>
        <p v-if="incident" class="description">{{ incident.code }} · Reported {{ formatDate(incident.createdAt) }}</p>
      </div>
      <RouterLink class="back-button" to="/dispatcher/incidents">Back to incidents</RouterLink>
    </header>

    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
    <p v-else-if="loading" class="loading-state">Loading incident…</p>
    <template v-else-if="incident">
      <section class="summary-card">
        <div>
          <span class="eyebrow">Current status</span>
          <span class="status-badge" :class="`status-${incident.status}`">{{ titleCase(incident.status) }}</span>
        </div>
        <div>
          <span class="eyebrow">Priority</span>
          <span class="priority-badge" :class="`priority-${incident.priority}`">{{ titleCase(incident.priority) }}</span>
        </div>
      </section>
      <div class="details-grid">
        <section class="detail-card">
          <p class="eyebrow">Incident overview</p>
          <h2>Details</h2>
          <dl>
            <div><dt>Type</dt><dd>{{ incident.type }}</dd></div>
            <div><dt>Location</dt><dd>{{ incident.location }}</dd></div>
            <div><dt>Coordinates</dt><dd>{{ Number(incident.latitude).toFixed(5) }}, {{ Number(incident.longitude).toFixed(5) }}</dd></div>
            <div><dt>Reported</dt><dd>{{ formatDate(incident.createdAt) }}</dd></div>
            <div v-if="incident.description"><dt>Description</dt><dd>{{ incident.description }}</dd></div>
          </dl>
        </section>
        <section class="detail-card">
          <p class="eyebrow">Response</p>
          <h2>Assigned resources</h2>
          <ul v-if="assignedResources.length" class="assigned-list">
            <li v-for="resource in assignedResources" :key="resource._id">
              <span>
                <strong>{{ resource.name }}</strong>
                <small>
                  {{ resource.unitCode }} · {{ resource.type }}
                  <template v-if="resource.crew?.length"> · {{ resource.crew.filter((m) => m.onDuty).map((m) => m.username).join(', ') || 'nobody on duty' }}</template>
                </small>
              </span>
              <span class="row-end">
                <span class="online-dot" :class="{ on: resource.online }" :title="resource.online ? 'Online' : formatLastSeen(resource.lastSeen)"></span>
                <span class="status-badge" :class="`progress-${resource.progress || 'assigned'}`">{{ progressLabel(resource.progress) }}</span>
                <button
                  class="small-button"
                  type="button"
                  :disabled="busyId === resource._id"
                  @click="release(resource)"
                >
                  {{ busyId === resource._id ? 'Releasing…' : 'Release' }}
                </button>
              </span>
            </li>
          </ul>
          <p v-else class="muted-copy">No resources are assigned to this incident.</p>
          <RouterLink class="manage-link" to="/dispatcher/resources">Manage resource assignments</RouterLink>
        </section>
      </div>

      <section v-if="incident.status === 'active'" class="detail-card nearby-card">
        <div class="card-heading">
          <div>
            <p class="eyebrow">Dispatch</p>
            <h2>Nearest available units</h2>
          </div>
          <div class="nearby-controls">
            <label class="toggle">
              <input v-model="onlineOnly" type="checkbox" @change="loadNearby" />
              Online only
            </label>
            <button class="small-button" type="button" :disabled="nearbyLoading" @click="loadNearby">
              {{ nearbyLoading ? 'Finding…' : 'Refresh' }}
            </button>
          </div>
        </div>
        <p v-if="nearbyError" class="error-message" role="alert">{{ nearbyError }}</p>
        <p v-if="nearbyLoading && !nearby.length" class="loading-state">Finding nearby units…</p>
        <ul v-else-if="nearby.length" class="assigned-list nearby-list">
          <li v-for="unit in nearby" :key="unit._id">
            <span>
              <strong>
                {{ unit.name }}
                <span class="online-badge" :class="{ on: unit.online }">{{ unit.online ? 'Online' : 'Not reporting' }}</span>
              </strong>
              <small>{{ unit.unitCode }} · {{ unit.type }}</small>
            </span>
            <span class="row-end">
              <span class="distance">
                <strong>{{ formatKm(unit.routeDistanceKm ?? unit.distanceKm) }}</strong>
                <small v-if="unit.durationMin != null">
                  {{ unit.routeSource === 'straight-line' ? 'approx. ' : '' }}{{ formatEta(unit.durationMin) }}
                </small>
                <small v-else>straight-line</small>
              </span>
              <button
                class="primary-small"
                type="button"
                :disabled="busyId === unit._id"
                @click="dispatch(unit)"
              >
                {{ busyId === unit._id ? 'Dispatching…' : 'Dispatch' }}
              </button>
            </span>
          </li>
        </ul>
        <p v-else-if="!nearbyError" class="muted-copy">No available units found. Free up a unit or bring one online.</p>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import api, { errorMessage as apiError } from '../services/api'
import { connectStream } from '../services/stream'
import { formatEta, formatLastSeen, progressLabel } from '../services/units'

const route = useRoute()
const incident = ref(null)
const resources = ref([])
const loading = ref(true)
const errorMessage = ref('')
const nearby = ref([])
const nearbyLoading = ref(false)
const nearbyError = ref('')
const onlineOnly = ref(false)
const busyId = ref('')
let closeStream
let fallbackTimer
let refreshTimer

const assignedResources = computed(() =>
  resources.value.filter((resource) => {
    const assigned = resource.assignedIncident?._id ?? resource.assignedIncident
    return String(assigned) === String(incident.value?._id)
  })
)

onMounted(async () => {
  await loadIncident()
  closeStream = connectStream({
    'unit:status': scheduleRefresh,
    'unit:removed': scheduleRefresh,
    'incident:updated': (data) => {
      if (String(data._id) === String(incident.value?._id)) {
        incident.value = { ...incident.value, ...data }
        scheduleRefresh()
      }
    }
  }, { onReconnect: refreshAll })
  fallbackTimer = window.setInterval(refreshAll, 120000)
})

onUnmounted(() => {
  closeStream?.()
  window.clearInterval(fallbackTimer)
  window.clearTimeout(refreshTimer)
})

watch(() => route.params.id, (id) => {
  if (id) loadIncident()
})

// Several unit events can arrive together; refresh once.
function scheduleRefresh() {
  window.clearTimeout(refreshTimer)
  refreshTimer = window.setTimeout(refreshAll, 400)
}

async function refreshAll() {
  await Promise.all([loadResources(), loadNearby()])
}

async function loadIncident() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [incidentResponse, resourceResponse] = await Promise.all([
      api.get(`/incidents/${route.params.id}`),
      api.get('/resources')
    ])
    incident.value = incidentResponse.data
    resources.value = resourceResponse.data
  } catch (error) {
    errorMessage.value = apiError(error, 'Unable to load incident details.')
  } finally {
    loading.value = false
  }
  loadNearby()
}

async function loadResources() {
  try {
    const { data } = await api.get('/resources')
    resources.value = data
  } catch {
    // keep the last list; the error banner is for the initial load
  }
}

async function loadNearby() {
  if (!incident.value || incident.value.status !== 'active') {
    nearby.value = []
    return
  }
  nearbyLoading.value = true
  nearbyError.value = ''
  const params = { limit: 5, routing: true }
  if (onlineOnly.value) params.onlineOnly = true
  try {
    const { data } = await api.get(`/incidents/${incident.value._id}/nearby-resources`, { params, timeout: 8000 })
    nearby.value = data.resources
  } catch (error) {
    if (!error.response || error.code === 'ECONNABORTED') {
      // Routing can be slow; fall back to straight-line ranking.
      try {
        delete params.routing
        const { data } = await api.get(`/incidents/${incident.value._id}/nearby-resources`, { params })
        nearby.value = data.resources
        return
      } catch (fallbackError) {
        error = fallbackError
      }
    }
    nearby.value = []
    nearbyError.value = apiError(error, 'Unable to find nearby units.')
  } finally {
    nearbyLoading.value = false
  }
}

async function dispatch(unit) {
  busyId.value = unit._id
  nearbyError.value = ''
  try {
    await api.patch(`/resources/${unit._id}/assignment`, { incidentId: incident.value._id })
  } catch (error) {
    nearbyError.value = apiError(error, 'Unable to dispatch this unit.')
  } finally {
    busyId.value = ''
    await refreshAll()
  }
}

async function release(resource) {
  if (!window.confirm(`Release ${resource.name} from this incident?`)) return
  busyId.value = resource._id
  errorMessage.value = ''
  try {
    await api.patch(`/resources/${resource._id}/assignment`, { incidentId: null })
  } catch (error) {
    errorMessage.value = apiError(error, 'Unable to release this unit.')
  } finally {
    busyId.value = ''
    await refreshAll()
  }
}

function formatKm(km) {
  if (km == null) return ''
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}
</script>

<style scoped>
.incident-details {
  --ink: #172033;
  --muted: #788397;
  --line: #e9edf3;
  max-width: 1100px;
  margin: 0 auto;
  color: var(--ink);
}

.page-header,
.summary-card,
.summary-card > div,
.assigned-list li {
  display: flex;
  align-items: center;
}

.page-header,
.summary-card {
  justify-content: space-between;
  gap: 16px;
}

.page-header { margin: 4px 0 18px; }

.eyebrow {
  display: block;
  margin: 0 0 5px;
  color: #929caf;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

h1,
h2,
p { margin-top: 0; }

h1 { margin-bottom: 5px; font-size: clamp(24px, 3vw, 31px); letter-spacing: -0.035em; }
.description { margin: 0; color: var(--muted); font-size: 12px; }

.back-button,
.manage-link {
  color: #b8323e;
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
}

.back-button {
  border: 1px solid #dfe4ec;
  border-radius: 7px;
  padding: 9px 11px;
  background: #fff;
}

.back-button:hover,
.manage-link:hover { color: #8f202c; }

.summary-card,
.detail-card {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 17px;
  background: #fff;
  box-shadow: 0 3px 12px rgb(19 32 55 / 3%);
}

.summary-card { justify-content: flex-start; margin-bottom: 13px; }
.summary-card > div { align-items: flex-start; flex-direction: column; gap: 6px; }

.status-badge,
.priority-badge {
  border-radius: 999px;
  padding: 5px 8px;
  font-size: 9px;
  font-weight: 750;
}

.status-active { color: #b82b38; background: #fff0f0; }
.status-resolved { color: #258564; background: #eaf7f1; }
.status-dispatched { color: #3976cb; background: #edf4ff; }
.priority-critical,
.priority-high { color: #b82b38; background: #fff0f0; }
.priority-medium { color: #376aa9; background: #edf4ff; }
.priority-low { color: #28775e; background: #eaf7f1; }

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px;
}

.detail-card h2 { margin: 0 0 13px; font-size: 15px; }

dl,
dd { margin: 0; }

dl > div {
  display: grid;
  grid-template-columns: 105px minmax(0, 1fr);
  gap: 10px;
  border-top: 1px solid #f0f2f6;
  padding: 10px 0;
}

dt { color: #8791a3; font-size: 10px; }
dd { color: #354057; font-size: 11px; overflow-wrap: anywhere; }

.assigned-list {
  display: flex;
  flex-direction: column;
  margin: 0 0 13px;
  padding: 0;
  list-style: none;
}

.assigned-list li {
  justify-content: space-between;
  gap: 8px;
  border-top: 1px solid #f0f2f6;
  padding: 10px 0;
}

.assigned-list li > span:first-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.assigned-list strong { color: #354057; font-size: 11px; }
.assigned-list small { color: #8993a4; font-size: 9px; }
.muted-copy,
.loading-state { color: #8993a4; font-size: 11px; }
.manage-link { display: inline-block; margin-top: 8px; }

.error-message {
  margin: 0 0 12px;
  border-radius: 7px;
  padding: 9px 11px;
  color: #a92735;
  background: #fff0f1;
  font-size: 12px;
}

.row-end {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.progress-assigned { color: #3976cb; background: #edf4ff; }
.progress-accepted { color: #8a5a00; background: #fff6e0; }
.progress-on_scene { color: #258564; background: #eaf7f1; }

.online-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c3c9d3;
}
.online-dot.on { background: #22a06b; box-shadow: 0 0 0 3px rgb(34 160 107 / 18%); }

.online-badge {
  margin-left: 6px;
  border-radius: 999px;
  padding: 2px 6px;
  color: #6b7486;
  background: #eef1f6;
  font-size: 9px;
  font-weight: 700;
}
.online-badge.on { color: #1d7c55; background: #e3f6ec; }

.small-button,
.primary-small {
  min-height: 28px;
  border-radius: 6px;
  padding: 0 10px;
  font: inherit;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}
.small-button { border: 1px solid #dfe4ec; color: #4b5870; background: #fff; }
.small-button:hover:not(:disabled) { border-color: #c83240; color: #b82b38; }
.primary-small { border: 0; color: #fff; background: #c83240; }
.primary-small:hover:not(:disabled) { background: #ab2633; }
button:disabled { cursor: not-allowed; opacity: 0.55; }

.nearby-card { margin-top: 13px; }
.card-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.nearby-controls { display: flex; align-items: center; gap: 10px; }
.toggle { display: flex; align-items: center; gap: 5px; color: #566176; font-size: 11px; }
.distance { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; min-width: 70px; }
.distance strong { color: #354057; font-size: 11px; }
.distance small { color: #8993a4; font-size: 9px; }

@media (max-width: 650px) {
  .details-grid { grid-template-columns: 1fr; }
  .assigned-list li { align-items: flex-start; flex-direction: column; }
  .row-end { justify-content: flex-start; }
}

@media (max-width: 450px) {
  .page-header { align-items: flex-start; flex-direction: column; }
}
</style>

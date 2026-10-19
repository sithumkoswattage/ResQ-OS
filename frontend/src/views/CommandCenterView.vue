<template>
  <section class="command-center">
    <header class="page-header">
      <div>
        <p class="eyebrow">Emergency operations</p>
        <h1>Command Center</h1>
        <p class="description">Monitor active incidents and field-unit positions across the response area.</p>
      </div>
      <button class="refresh-button" type="button" :disabled="loading" @click="loadOverview">
        <RefreshCw :size="16" :class="{ spinning: loading }" aria-hidden="true" />
        {{ loading ? 'Refreshing…' : 'Refresh' }}
      </button>
    </header>

    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

    <section class="summary-grid" aria-label="Command Center summary">
      <article class="summary-card">
        <span class="summary-icon incidents-icon"><Siren :size="18" /></span>
        <div><strong>{{ summary.activeIncidents }}</strong><span>Active incidents</span></div>
      </article>
      <article class="summary-card">
        <span class="summary-icon available-icon"><Radio :size="18" /></span>
        <div><strong>{{ summary.availableResources }}</strong><span>Units available</span></div>
      </article>
      <article class="summary-card">
        <span class="summary-icon dispatched-icon"><Truck :size="18" /></span>
        <div><strong>{{ summary.dispatchedResources }}</strong><span>Units dispatched</span></div>
      </article>
      <article class="summary-card">
        <span class="summary-icon offline-icon"><CircleOff :size="18" /></span>
        <div><strong>{{ summary.offlineResources }}</strong><span>Units offline</span></div>
      </article>
    </section>

    <div class="operations-grid">
      <section class="map-panel panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Operational map</p>
            <h2>Incidents & response units</h2>
          </div>
          <span class="map-area">Colombo · Sri Lanka</span>
        </div>
        <div class="map-wrap">
          <LMap
            :zoom="12"
            :center="mapCenter"
            :use-global-leaflet="false"
            :options="{ zoomControl: true, scrollWheelZoom: false }"
            aria-label="Map of active incidents and response units"
          >
            <LTileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <LCircleMarker
              v-for="incident in incidents"
              :key="`incident-${incident._id}`"
              :lat-lng="[incident.latitude, incident.longitude]"
              :radius="9"
              color="#c83240"
              fill-color="#e24a58"
              :fill-opacity="0.9"
              :weight="2"
            >
              <LPopup>
                <strong>{{ incident.code }} · {{ incident.title }}</strong><br />
                {{ incident.location }}<br />
                Priority: {{ titleCase(incident.priority) }}
              </LPopup>
            </LCircleMarker>
            <LCircleMarker
              v-for="resource in resources"
              :key="`resource-${resource._id}`"
              :lat-lng="[resource.latitude, resource.longitude]"
              :radius="7"
              :color="resourceColor(resource.status)"
              :fill-color="resourceColor(resource.status)"
              :fill-opacity="0.85"
              :weight="2"
            >
              <LPopup>
                <strong>{{ resource.unitCode }} · {{ resource.name }}</strong><br />
                {{ resource.type }} · {{ titleCase(resource.status) }}<br />
                <span v-if="resource.assignedIncident">
                  Assigned to {{ resource.assignedIncident.code }}
                </span>
              </LPopup>
            </LCircleMarker>
          </LMap>
          <div v-if="!incidents.length && !resources.length && !loading" class="map-empty">
            <MapPin :size="21" aria-hidden="true" />
            <span>No active incidents or resources to display</span>
          </div>
        </div>
        <div class="map-legend" aria-label="Map legend">
          <span><i class="legend-dot incident-dot"></i>Active incident</span>
          <span><i class="legend-dot available-dot"></i>Available unit</span>
          <span><i class="legend-dot dispatched-dot"></i>Dispatched unit</span>
          <span><i class="legend-dot offline-dot"></i>Offline unit</span>
        </div>
      </section>

      <aside class="side-panels">
        <section class="panel list-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Active queue</p>
              <h2>Incidents</h2>
            </div>
            <RouterLink to="/dispatcher/incidents" class="text-link">View all</RouterLink>
          </div>
          <div v-if="incidents.length" class="compact-list">
            <RouterLink
              v-for="incident in incidents.slice(0, 5)"
              :key="incident._id"
              :to="`/dispatcher/incidents/${incident._id}`"
              class="compact-row"
            >
              <span class="incident-mark"><Siren :size="16" /></span>
              <span class="compact-copy">
                <strong>{{ incident.title }}</strong>
                <span>{{ incident.code }} · {{ incident.location }}</span>
              </span>
              <span class="priority" :class="`priority-${incident.priority}`">{{ titleCase(incident.priority) }}</span>
            </RouterLink>
          </div>
          <p v-else class="empty-message">No active incidents.</p>
        </section>

        <section class="panel list-panel units-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Field fleet</p>
              <h2>Resource status</h2>
            </div>
            <RouterLink to="/dispatcher/resources" class="text-link">Manage</RouterLink>
          </div>
          <div v-if="resources.length" class="compact-list">
            <div v-for="resource in resources.slice(0, 6)" :key="resource._id" class="compact-row unit-row">
              <span class="unit-mark" :class="`unit-${resource.status}`"><Truck :size="16" /></span>
              <span class="compact-copy">
                <strong>{{ resource.name }}</strong>
                <span>{{ resource.unitCode }} · {{ resource.type }}</span>
              </span>
              <span class="unit-status" :class="`status-${resource.status}`">{{ titleCase(resource.status) }}</span>
            </div>
          </div>
          <p v-else class="empty-message">No units have been added.</p>
        </section>
      </aside>
    </div>

    <p class="map-note">
      <Info :size="14" aria-hidden="true" />
      Positions are based on the coordinates stored for each incident and resource. Map tiles are provided by OpenStreetMap.
      <span v-if="lastUpdated">Updated {{ lastUpdated }}</span>
    </p>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  CircleOff,
  Info,
  MapPin,
  Radio,
  RefreshCw,
  Siren,
  Truck
} from 'lucide-vue-next'
import { LCircleMarker, LMap, LPopup, LTileLayer } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'

const incidents = ref([])
const resources = ref([])
const mapCenter = computed(() => {
  const points = [...incidents.value, ...resources.value]
  if (!points.length) return [6.9271, 79.8612]
  return [
    points.reduce((sum, point) => sum + Number(point.latitude), 0) / points.length,
    points.reduce((sum, point) => sum + Number(point.longitude), 0) / points.length
  ]
})
const summary = ref({
  activeIncidents: 0,
  availableResources: 0,
  dispatchedResources: 0,
  offlineResources: 0
})
const loading = ref(true)
const errorMessage = ref('')
const lastUpdated = ref('')
let refreshTimer

onMounted(() => {
  loadOverview()
  refreshTimer = window.setInterval(loadOverview, 30000)
})

onUnmounted(() => {
  window.clearInterval(refreshTimer)
})

async function loadOverview() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/command-center/overview')
    incidents.value = data.incidents
    resources.value = data.resources
    summary.value = data.summary
    lastUpdated.value = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date())
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Unable to load Command Center data.'
  } finally {
    loading.value = false
  }
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function resourceColor(status) {
  return {
    available: '#258564',
    dispatched: '#3976cb',
    offline: '#7c8492'
  }[status] || '#7c8492'
}
</script>

<style scoped>
.command-center {
  --ink: #172033;
  --muted: #788397;
  --line: #e9edf3;
  max-width: 1500px;
  margin: 0 auto;
  color: var(--ink);
}

.page-header,
.panel-heading,
.summary-card,
.map-legend,
.map-note,
.text-link {
  display: flex;
  align-items: center;
}

.page-header,
.panel-heading {
  justify-content: space-between;
  gap: 14px;
}

.page-header {
  margin: 4px 0 20px;
}

.eyebrow {
  margin: 0 0 5px;
  color: #929caf;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 6px;
  font-size: clamp(25px, 3vw, 32px);
  letter-spacing: -0.035em;
}

.description {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.refresh-button {
  display: inline-flex;
  min-height: 37px;
  align-items: center;
  gap: 7px;
  border: 1px solid #dfe4ec;
  border-radius: 8px;
  padding: 0 11px;
  color: #46536b;
  background: #fff;
  font: inherit;
  font-size: 11px;
  font-weight: 650;
  cursor: pointer;
}

.refresh-button:disabled {
  cursor: wait;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.summary-card,
.panel {
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #fff;
  box-shadow: 0 3px 12px rgb(19 32 55 / 3%);
}

.summary-card {
  gap: 11px;
  padding: 14px;
}

.summary-icon {
  display: inline-flex;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
}

.incidents-icon { color: #c83240; background: #fff0f0; }
.available-icon { color: #258564; background: #eaf7f1; }
.dispatched-icon { color: #3976cb; background: #edf4ff; }
.offline-icon { color: #798396; background: #f0f2f5; }

.summary-card > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-card strong {
  font-size: 23px;
  line-height: 1;
}

.summary-card > div span {
  color: #788397;
  font-size: 10px;
}

.operations-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(290px, 0.9fr);
  align-items: start;
  gap: 14px;
}

.panel {
  min-width: 0;
  padding: 16px;
}

.panel-heading {
  margin-bottom: 12px;
}

.panel-heading h2 {
  margin: 0;
  font-size: 15px;
  letter-spacing: -0.02em;
}

.map-area {
  color: #858fa1;
  font-size: 10px;
}

.map-wrap {
  position: relative;
  overflow: hidden;
  height: clamp(360px, 54vh, 620px);
  border: 1px solid #e1e7ed;
  border-radius: 8px;
  background: #eaf0ed;
}

.map-wrap :deep(.leaflet-container) {
  width: 100%;
  height: 100%;
  font: inherit;
  z-index: 0;
}

.map-empty {
  position: absolute;
  inset: 12px auto auto 50%;
  display: flex;
  align-items: center;
  gap: 7px;
  transform: translateX(-50%);
  border: 1px solid #e2e7ec;
  border-radius: 8px;
  padding: 8px 10px;
  color: #566176;
  background: rgb(255 255 255 / 94%);
  font-size: 10px;
  white-space: nowrap;
  pointer-events: none;
}

.map-legend {
  flex-wrap: wrap;
  gap: 12px 18px;
  padding: 12px 2px 0;
}

.map-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6f7a8d;
  font-size: 10px;
}

.legend-dot {
  width: 9px;
  height: 9px;
  border: 2px solid rgb(0 0 0 / 14%);
  border-radius: 50%;
}

.incident-dot { background: #e24a58; }
.available-dot { background: #258564; }
.dispatched-dot { background: #3976cb; }
.offline-dot { background: #7c8492; }

.side-panels {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 14px;
}

.text-link {
  color: #be3440;
  font-size: 10px;
  font-weight: 700;
  text-decoration: none;
}

.text-link:hover {
  color: #90232d;
}

.compact-list {
  display: flex;
  flex-direction: column;
}

.compact-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
  border-top: 1px solid #f0f2f6;
  padding: 10px 0;
  color: inherit;
  text-decoration: none;
}

.compact-row:first-child {
  border-top: 0;
}

a.compact-row:hover .compact-copy strong {
  color: #bd3440;
}

.incident-mark,
.unit-mark {
  display: inline-flex;
  width: 31px;
  height: 31px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.incident-mark {
  color: #c83240;
  background: #fff0f0;
}

.unit-available { color: #258564; background: #eaf7f1; }
.unit-dispatched { color: #3976cb; background: #edf4ff; }
.unit-offline { color: #798396; background: #f0f2f5; }

.compact-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.compact-copy strong,
.compact-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-copy strong {
  color: #303b51;
  font-size: 10px;
}

.compact-copy span {
  color: #919aac;
  font-size: 9px;
}

.priority,
.unit-status {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 4px 6px;
  font-size: 8px;
  font-weight: 750;
}

.priority-critical,
.priority-high { color: #b82b38; background: #fff0f0; }
.priority-medium { color: #376aa9; background: #edf4ff; }
.priority-low { color: #28775e; background: #eaf7f1; }
.status-available { color: #258564; background: #eaf7f1; }
.status-dispatched { color: #3976cb; background: #edf4ff; }
.status-offline { color: #717b8c; background: #f0f2f5; }

.empty-message {
  margin: 0;
  border-top: 1px solid #f0f2f6;
  padding: 18px 2px 4px;
  color: #8993a4;
  font-size: 11px;
}

.map-note {
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 2px 0;
  color: #8993a4;
  font-size: 10px;
}

.map-note span {
  margin-left: auto;
}

.error-message {
  margin: 0 0 12px;
  border-radius: 7px;
  padding: 9px 11px;
  color: #a92735;
  background: #fff0f1;
  font-size: 12px;
}

@media (max-width: 1000px) {
  .operations-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .side-panels {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .side-panels {
    grid-template-columns: minmax(0, 1fr);
  }

  .map-wrap {
    height: 380px;
  }

  .map-note span {
    width: 100%;
    margin-left: 20px;
  }
}
</style>

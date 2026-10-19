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
              <span><strong>{{ resource.name }}</strong><small>{{ resource.unitCode }} · {{ resource.type }}</small></span>
              <span class="status-badge status-dispatched">Dispatched</span>
            </li>
          </ul>
          <p v-else class="muted-copy">No resources are assigned to this incident.</p>
          <RouterLink class="manage-link" to="/dispatcher/resources">Manage resource assignments</RouterLink>
        </section>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const incident = ref(null)
const resources = ref([])
const loading = ref(true)
const errorMessage = ref('')

const assignedResources = computed(() =>
  resources.value.filter((resource) => resource.assignedIncident?._id === incident.value?._id)
)

onMounted(loadIncident)

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
    errorMessage.value = error.response?.data?.message || 'Unable to load incident details.'
  } finally {
    loading.value = false
  }
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

@media (max-width: 650px) {
  .details-grid { grid-template-columns: 1fr; }
}

@media (max-width: 450px) {
  .page-header { align-items: flex-start; flex-direction: column; }
}
</style>

<template>
  <section class="incidents-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Emergency operations</p>
        <h1>Incidents</h1>
        <p class="description">Create, review, and resolve incidents reported to the dispatch team.</p>
      </div>
      <button class="primary-button" type="button" @click="formVisible = !formVisible">
        <Plus :size="17" aria-hidden="true" />
        {{ formVisible ? 'Close form' : 'New incident' }}
      </button>
    </header>

    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
    <form v-if="formVisible" class="panel incident-form" @submit.prevent="createIncident">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Incident intake</p>
          <h2>Report an incident</h2>
        </div>
      </div>
      <div class="form-grid">
        <label>
          Incident title
          <input v-model.trim="form.title" required maxlength="160" placeholder="Residential building fire" />
        </label>
        <label>
          Incident type
          <input v-model.trim="form.type" required maxlength="80" placeholder="Fire" />
        </label>
        <label>
          Priority
          <select v-model="form.priority">
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label>
          Location
          <input v-model.trim="form.location" required maxlength="240" placeholder="Grandpass, Colombo" />
        </label>
        <label>
          Latitude
          <input v-model.number="form.latitude" type="number" min="-90" max="90" step="any" required />
        </label>
        <label>
          Longitude
          <input v-model.number="form.longitude" type="number" min="-180" max="180" step="any" required />
        </label>
        <label class="full-width">
          Description
          <textarea v-model.trim="form.description" maxlength="2000" rows="3" placeholder="Relevant details for responding units"></textarea>
        </label>
      </div>
      <div class="form-actions">
        <button class="secondary-button" type="button" @click="formVisible = false">Cancel</button>
        <button class="primary-button" type="submit" :disabled="saving">
          {{ saving ? 'Submitting…' : 'Create incident' }}
        </button>
      </div>
    </form>

    <section class="panel incidents-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Incident register</p>
          <h2>All incidents</h2>
        </div>
        <span class="count-badge">{{ incidents.length }} total</span>
      </div>

      <p v-if="loading" class="state-message">Loading incidents…</p>
      <div v-else-if="incidents.length" class="incident-list">
        <article v-for="incident in incidents" :key="incident._id" class="incident-row">
          <RouterLink :to="`/dispatcher/incidents/${incident._id}`" class="incident-link">
            <span class="incident-icon"><Siren :size="19" aria-hidden="true" /></span>
            <span class="incident-copy">
              <strong>{{ incident.title }}</strong>
              <span>{{ incident.code }} · {{ incident.type }} · {{ incident.location }}</span>
              <span class="incident-time">Reported {{ formatDate(incident.createdAt) }}</span>
            </span>
          </RouterLink>
          <div class="incident-actions">
            <span class="priority-badge" :class="`priority-${incident.priority}`">{{ titleCase(incident.priority) }}</span>
            <span class="status-badge" :class="`status-${incident.status}`">{{ titleCase(incident.status) }}</span>
            <button
              v-if="incident.status === 'active'"
              class="resolve-button"
              type="button"
              :disabled="resolvingId === incident._id"
              @click="resolveIncident(incident)"
            >
              {{ resolvingId === incident._id ? 'Resolving…' : 'Resolve' }}
            </button>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">
        <Siren :size="28" aria-hidden="true" />
        <h3>No incidents reported</h3>
        <p>Create an incident to add it to the dispatch queue and map.</p>
      </div>
    </section>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Plus, Siren } from 'lucide-vue-next'
import api from '../services/api'

const incidents = ref([])
const loading = ref(true)
const saving = ref(false)
const resolvingId = ref('')
const errorMessage = ref('')
const formVisible = ref(false)
const form = reactive({
  title: '',
  type: '',
  priority: 'medium',
  location: '',
  latitude: 6.9271,
  longitude: 79.8612,
  description: ''
})

onMounted(loadIncidents)

async function loadIncidents() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/incidents')
    incidents.value = data
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Unable to load incidents.'
  } finally {
    loading.value = false
  }
}

async function createIncident() {
  saving.value = true
  errorMessage.value = ''
  try {
    await api.post('/incidents', { ...form })
    Object.assign(form, {
      title: '',
      type: '',
      priority: 'medium',
      location: '',
      latitude: 6.9271,
      longitude: 79.8612,
      description: ''
    })
    formVisible.value = false
    await loadIncidents()
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Unable to create this incident.'
  } finally {
    saving.value = false
  }
}

async function resolveIncident(incident) {
  resolvingId.value = incident._id
  errorMessage.value = ''
  try {
    const { data } = await api.patch(`/incidents/${incident._id}`, { status: 'resolved' })
    incidents.value = incidents.value.map((item) => item._id === incident._id ? data : item)
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Unable to resolve this incident.'
  } finally {
    resolvingId.value = ''
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
.incidents-page {
  --ink: #172033;
  --muted: #788397;
  --line: #e9edf3;
  max-width: 1280px;
  margin: 0 auto;
  color: var(--ink);
}

.page-header,
.panel-heading,
.incident-row,
.incident-link,
.incident-actions,
.form-actions {
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
h3,
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

.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 8px;
  padding: 0 13px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.primary-button {
  color: #fff;
  background: #c83240;
}

.primary-button:hover:not(:disabled) { background: #ab2633; }

.secondary-button {
  color: #354057;
  background: #eef1f6;
}

button:disabled { cursor: not-allowed; opacity: 0.55; }

.panel {
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 11px;
  padding: 18px;
  background: #fff;
  box-shadow: 0 3px 12px rgb(19 32 55 / 3%);
}

.incident-form { margin-bottom: 15px; }

.panel-heading { margin-bottom: 13px; }
.panel-heading h2 { margin: 0; font-size: 16px; }

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #566176;
  font-size: 11px;
  font-weight: 650;
}

input,
select,
textarea {
  min-width: 0;
  border: 1px solid #dfe4ec;
  border-radius: 7px;
  padding: 9px 10px;
  color: #263249;
  background: #fff;
  font: inherit;
  font-size: 12px;
}

input,
select { height: 37px; padding-top: 0; padding-bottom: 0; }
textarea { resize: vertical; }
.full-width { grid-column: 1 / -1; }

input:focus,
select:focus,
textarea:focus {
  outline: 2px solid rgb(200 50 64 / 20%);
  border-color: #c83240;
}

.form-actions {
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

.count-badge {
  border-radius: 999px;
  padding: 5px 9px;
  color: #475773;
  background: #edf2f8;
  font-size: 10px;
  font-weight: 700;
}

.incident-list { display: flex; flex-direction: column; }

.incident-row {
  justify-content: space-between;
  gap: 14px;
  border-top: 1px solid #edf0f4;
  padding: 13px 0;
}

.incident-link {
  min-width: 0;
  flex: 1;
  gap: 11px;
  color: inherit;
  text-decoration: none;
}

.incident-link:hover .incident-copy strong { color: #bd3440; }

.incident-icon {
  display: inline-flex;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  color: #c83240;
  background: #fff0f0;
}

.incident-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.incident-copy strong,
.incident-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.incident-copy strong { color: #283349; font-size: 12px; }
.incident-copy span { color: #8993a4; font-size: 10px; }
.incident-copy .incident-time { color: #a0a8b5; font-size: 9px; }

.incident-actions {
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.priority-badge,
.status-badge {
  border-radius: 999px;
  padding: 5px 8px;
  font-size: 9px;
  font-weight: 750;
}

.priority-critical,
.priority-high { color: #b82b38; background: #fff0f0; }
.priority-medium { color: #376aa9; background: #edf4ff; }
.priority-low { color: #28775e; background: #eaf7f1; }
.status-active { color: #b82b38; background: #fff0f0; }
.status-resolved { color: #258564; background: #eaf7f1; }

.resolve-button {
  min-height: 29px;
  border: 1px solid #dfe4ec;
  border-radius: 6px;
  padding: 0 8px;
  color: #4b5870;
  background: #fff;
  font: inherit;
  font-size: 10px;
  font-weight: 650;
  cursor: pointer;
}

.resolve-button:hover:not(:disabled) { border-color: #c83240; color: #b82b38; }

.state-message,
.empty-state {
  padding: 26px 10px;
  color: #8993a4;
  text-align: center;
  font-size: 12px;
}

.empty-state svg { color: #a6afbd; }
.empty-state h3 { margin: 8px 0 4px; color: #354057; font-size: 14px; }
.empty-state p { margin: 0; }

.error-message {
  margin: 0 0 12px;
  border-radius: 7px;
  padding: 9px 11px;
  color: #a92735;
  background: #fff0f1;
  font-size: 12px;
}

@media (max-width: 760px) {
  .incident-row { align-items: flex-start; flex-direction: column; }
  .incident-actions { justify-content: flex-start; margin-left: 49px; }
}

@media (max-width: 600px) {
  .page-header { align-items: flex-start; }
  .form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 420px) {
  .page-header { flex-direction: column; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>

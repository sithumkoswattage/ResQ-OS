<template>
  <section class="resources-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Field operations</p>
        <h1>Resources</h1>
        <p class="description">Track unit readiness, update field positions, and dispatch teams to active incidents.</p>
      </div>
      <button class="primary-button" type="button" @click="openCreateForm">
        <Plus :size="17" aria-hidden="true" /> Add resource
      </button>
    </header>

    <div class="summary-grid" aria-label="Resource summary">
      <article class="summary-card">
        <span>Tracked units</span>
        <strong>{{ resources.length }}</strong>
      </article>
      <article class="summary-card available-card">
        <span>Available</span>
        <strong>{{ countByStatus('available') }}</strong>
      </article>
      <article class="summary-card dispatched-card">
        <span>Dispatched</span>
        <strong>{{ countByStatus('dispatched') }}</strong>
      </article>
      <article class="summary-card offline-card">
        <span>Offline</span>
        <strong>{{ countByStatus('offline') }}</strong>
      </article>
    </div>

    <form v-if="formVisible" class="resource-form panel" @submit.prevent="saveResource">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Resource details</p>
          <h2>{{ editingResource ? 'Edit resource' : 'Add a resource' }}</h2>
        </div>
        <button class="icon-button" type="button" aria-label="Close form" @click="closeForm">
          <X :size="18" />
        </button>
      </div>
      <div class="form-grid">
        <label>
          Unit code
          <input v-model.trim="form.unitCode" required maxlength="32" placeholder="RES-101" />
        </label>
        <label>
          Unit name
          <input v-model.trim="form.name" required maxlength="100" placeholder="Rescue 01" />
        </label>
        <label>
          Resource type
          <input v-model.trim="form.type" required maxlength="80" placeholder="Fire & rescue" />
        </label>
        <label>
          Availability
          <select v-model="form.status" :disabled="Boolean(editingResource?.assignedIncident)">
            <option value="available">Available</option>
            <option value="offline">Offline</option>
          </select>
        </label>
        <label>
          Latitude
          <input v-model.number="form.latitude" type="number" min="-90" max="90" step="any" required />
        </label>
        <label>
          Longitude
          <input v-model.number="form.longitude" type="number" min="-180" max="180" step="any" required />
        </label>
      </div>
      <p v-if="formError" class="error-message" role="alert">{{ formError }}</p>
      <div class="form-actions">
        <button class="secondary-button" type="button" @click="closeForm">Cancel</button>
        <button class="primary-button" type="submit" :disabled="saving">
          {{ saving ? 'Saving…' : (editingResource ? 'Save changes' : 'Create resource') }}
        </button>
      </div>
    </form>

    <section class="panel inventory-panel">
      <div class="panel-heading inventory-heading">
        <div>
          <p class="eyebrow">Fleet inventory</p>
          <h2>Response units</h2>
        </div>
        <div class="filters">
          <label class="search-field">
            <Search :size="16" aria-hidden="true" />
            <input v-model="search" type="search" placeholder="Search units" aria-label="Search units" />
          </label>
          <select v-model="statusFilter" aria-label="Filter by availability">
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="dispatched">Dispatched</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      <p v-if="loadError" class="error-message" role="alert">{{ loadError }}</p>
      <p v-if="loading" class="loading-state">Loading resources…</p>
      <div v-else-if="filteredResources.length" class="resource-list">
        <article v-for="resource in filteredResources" :key="resource._id" class="resource-row">
          <div class="unit-identity">
            <span class="unit-icon" :class="`tone-${resource.status}`">
              <Ambulance v-if="resource.type.toLowerCase().includes('ambulance')" :size="20" aria-hidden="true" />
              <Truck v-else :size="20" aria-hidden="true" />
            </span>
            <div>
              <strong>{{ resource.name }}</strong>
              <span>{{ resource.unitCode }} · {{ resource.type }}</span>
              <span class="coordinates">{{ formatCoordinates(resource) }}</span>
            </div>
          </div>

          <div class="resource-state">
            <span class="status-badge" :class="`status-${resource.status}`">{{ statusLabel(resource.status) }}</span>
            <span v-if="resource.assignedIncident" class="assignment-label">
              {{ resource.assignedIncident.code }} · {{ resource.assignedIncident.title }}
            </span>
          </div>

          <div class="assignment-controls">
            <select
              v-model="assignmentSelections[resource._id]"
              :disabled="resource.status === 'offline' || activeIncidents.length === 0"
              :aria-label="`Select incident for ${resource.name}`"
            >
              <option value="">Release / no incident</option>
              <option v-for="incident in activeIncidents" :key="incident._id" :value="incident._id">
                {{ incident.code }} · {{ incident.title }}
              </option>
            </select>
            <button
              class="secondary-button dispatch-button"
              type="button"
              :disabled="updatingAssignment === resource._id || resource.status === 'offline'"
              @click="updateAssignment(resource)"
            >
              {{ updatingAssignment === resource._id ? 'Updating…' : (assignmentSelections[resource._id] ? 'Dispatch' : 'Release') }}
            </button>
          </div>

          <div class="row-actions">
            <button
              class="icon-button"
              type="button"
              :disabled="resource.status === 'dispatched'"
              :aria-label="`Edit ${resource.name}`"
              title="Edit resource"
              @click="openEditForm(resource)"
            >
              <Pencil :size="17" />
            </button>
            <button
              class="icon-button danger-action"
              type="button"
              :disabled="resource.status === 'dispatched' || deletingResource === resource._id"
              :aria-label="`Remove ${resource.name}`"
              title="Remove resource"
              @click="removeResource(resource)"
            >
              <Trash2 :size="17" />
            </button>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">
        <Ambulance :size="28" aria-hidden="true" />
        <h3>{{ resources.length ? 'No matching units' : 'No resources yet' }}</h3>
        <p>{{ resources.length ? 'Try changing the search or status filter.' : 'Add a response unit to start managing your fleet.' }}</p>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  Ambulance,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  X
} from 'lucide-vue-next'
import api from '../services/api'

const resources = ref([])
const incidents = ref([])
const loading = ref(true)
const saving = ref(false)
const updatingAssignment = ref('')
const deletingResource = ref('')
const loadError = ref('')
const formError = ref('')
const search = ref('')
const statusFilter = ref('all')
const formVisible = ref(false)
const editingResource = ref(null)
const assignmentSelections = reactive({})

const emptyForm = () => ({
  unitCode: '',
  name: '',
  type: '',
  status: 'available',
  latitude: 6.9271,
  longitude: 79.8612
})
const form = reactive(emptyForm())

const activeIncidents = computed(() => incidents.value.filter((incident) => incident.status === 'active'))
const filteredResources = computed(() => resources.value.filter((resource) => {
  const query = search.value.trim().toLowerCase()
  const matchesSearch = !query ||
    [resource.unitCode, resource.name, resource.type, resource.assignedIncident?.code]
      .some((value) => value?.toLowerCase().includes(query))
  return matchesSearch && (statusFilter.value === 'all' || resource.status === statusFilter.value)
}))

onMounted(loadData)

async function loadData() {
  loading.value = true
  loadError.value = ''
  try {
    const [resourceResponse, incidentResponse] = await Promise.all([
      api.get('/resources'),
      api.get('/incidents')
    ])
    resources.value = resourceResponse.data
    incidents.value = incidentResponse.data
    for (const resource of resources.value) {
      assignmentSelections[resource._id] = resource.assignedIncident?._id || ''
    }
  } catch (error) {
    loadError.value = error.response?.data?.message || 'Unable to load resource data. Please try again.'
  } finally {
    loading.value = false
  }
}

function countByStatus(status) {
  return resources.value.filter((resource) => resource.status === status).length
}

function statusLabel(status) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatCoordinates(resource) {
  return `${Number(resource.latitude).toFixed(4)}, ${Number(resource.longitude).toFixed(4)}`
}

function resetForm() {
  Object.assign(form, emptyForm())
  editingResource.value = null
  formError.value = ''
}

function openCreateForm() {
  resetForm()
  formVisible.value = true
}

function openEditForm(resource) {
  resetForm()
  editingResource.value = resource
  Object.assign(form, {
    unitCode: resource.unitCode,
    name: resource.name,
    type: resource.type,
    status: resource.status,
    latitude: resource.latitude,
    longitude: resource.longitude
  })
  formVisible.value = true
}

function closeForm() {
  formVisible.value = false
  resetForm()
}

async function saveResource() {
  saving.value = true
  formError.value = ''
  const payload = { ...form }
  try {
    if (editingResource.value) {
      await api.patch(`/resources/${editingResource.value._id}`, payload)
    } else {
      await api.post('/resources', payload)
    }
    closeForm()
    await loadData()
  } catch (error) {
    formError.value = error.response?.data?.message || 'Unable to save this resource.'
  } finally {
    saving.value = false
  }
}

async function updateAssignment(resource) {
  updatingAssignment.value = resource._id
  loadError.value = ''
  try {
    const incidentId = assignmentSelections[resource._id] || null
    const response = await api.patch(`/resources/${resource._id}/assignment`, { incidentId })
    resources.value = resources.value.map((item) => item._id === resource._id ? response.data : item)
    assignmentSelections[resource._id] = response.data.assignedIncident?._id || ''
  } catch (error) {
    loadError.value = error.response?.data?.message || 'Unable to update the resource assignment.'
  } finally {
    updatingAssignment.value = ''
  }
}

async function removeResource(resource) {
  if (!window.confirm(`Remove ${resource.name} (${resource.unitCode}) from the fleet?`)) return
  deletingResource.value = resource._id
  loadError.value = ''
  try {
    await api.delete(`/resources/${resource._id}`)
    resources.value = resources.value.filter((item) => item._id !== resource._id)
    delete assignmentSelections[resource._id]
  } catch (error) {
    loadError.value = error.response?.data?.message || 'Unable to remove this resource.'
  } finally {
    deletingResource.value = ''
  }
}
</script>

<style scoped>
.resources-page {
  --ink: #172033;
  --muted: #788397;
  --line: #e9edf3;
  max-width: 1440px;
  margin: 0 auto;
  color: var(--ink);
}

.page-header,
.panel-heading,
.form-actions,
.filters,
.resource-row,
.unit-identity,
.resource-state,
.assignment-controls,
.row-actions {
  display: flex;
  align-items: center;
}

.page-header,
.panel-heading {
  justify-content: space-between;
  gap: 16px;
}

.page-header {
  margin: 4px 0 22px;
}

.eyebrow {
  margin: 0 0 5px;
  color: #909bae;
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

.primary-button:hover:not(:disabled) {
  background: #ab2633;
}

.secondary-button {
  color: #354057;
  background: #eef1f6;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card,
.panel {
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #fff;
  box-shadow: 0 3px 12px rgb(19 32 55 / 3%);
}

.summary-card {
  display: flex;
  min-height: 78px;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
}

.summary-card span {
  color: #738096;
  font-size: 12px;
  font-weight: 600;
}

.summary-card strong {
  font-size: 25px;
}

.available-card strong { color: #258564; }
.dispatched-card strong { color: #3976cb; }
.offline-card strong { color: #828b9b; }

.resource-form,
.inventory-panel {
  padding: 18px;
}

.resource-form {
  margin-bottom: 16px;
}

.panel-heading {
  margin-bottom: 14px;
}

.panel-heading h2 {
  margin: 0;
  font-size: 16px;
}

.icon-button {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 7px;
  color: #657188;
  background: transparent;
  cursor: pointer;
}

.icon-button:hover:not(:disabled) {
  border-color: #e1e6ee;
  background: #f5f7fa;
}

.danger-action:hover:not(:disabled) {
  color: #bd2f3d;
  background: #fff1f2;
}

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
select {
  min-width: 0;
  height: 37px;
  border: 1px solid #dfe4ec;
  border-radius: 7px;
  padding: 0 10px;
  color: #263249;
  background: #fff;
  font: inherit;
  font-size: 12px;
}

input:focus,
select:focus {
  outline: 2px solid rgb(200 50 64 / 20%);
  border-color: #c83240;
}

.form-actions {
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

.inventory-heading {
  flex-wrap: wrap;
}

.filters {
  gap: 8px;
}

.search-field {
  display: flex;
  height: 36px;
  align-items: center;
  gap: 7px;
  border: 1px solid #dfe4ec;
  border-radius: 7px;
  padding: 0 9px;
  color: #8a94a5;
}

.search-field input {
  width: 145px;
  height: 32px;
  border: 0;
  padding: 0;
  outline: 0;
}

.resource-list {
  display: flex;
  flex-direction: column;
}

.resource-row {
  min-width: 0;
  gap: 15px;
  border-top: 1px solid #edf0f4;
  padding: 14px 0;
}

.unit-identity {
  flex: 1 1 200px;
  min-width: 160px;
  gap: 11px;
}

.unit-icon {
  display: flex;
  width: 39px;
  height: 39px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.tone-available { color: #258564; background: #eaf7f1; }
.tone-dispatched { color: #3976cb; background: #edf4ff; }
.tone-offline { color: #798396; background: #f0f2f5; }

.unit-identity > div,
.resource-state {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.unit-identity strong {
  color: #283349;
  font-size: 12px;
}

.unit-identity span:not(.unit-icon),
.assignment-label,
.coordinates {
  overflow: hidden;
  max-width: 100%;
  color: #9099aa;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 700;
}

.status-available { color: #258564; background: #eaf7f1; }
.status-dispatched { color: #3976cb; background: #edf4ff; }
.status-offline { color: #717b8c; background: #f0f2f5; }

.assignment-controls {
  flex: 1 1 250px;
  gap: 7px;
}

.assignment-controls select {
  flex: 1;
}

.dispatch-button {
  min-height: 36px;
  white-space: nowrap;
}

.row-actions {
  flex: 0 0 auto;
  gap: 2px;
}

.loading-state,
.empty-state {
  padding: 28px 12px;
  color: #8791a3;
  text-align: center;
  font-size: 12px;
}

.empty-state svg {
  color: #a6afbd;
}

.empty-state h3 {
  margin: 9px 0 4px;
  color: #354057;
  font-size: 14px;
}

.empty-state p {
  margin: 0;
}

.error-message {
  margin: 10px 0 0;
  border-radius: 7px;
  padding: 9px 11px;
  color: #a92735;
  background: #fff0f1;
  font-size: 12px;
}

@media (max-width: 950px) {
  .resource-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .resource-state {
    min-width: 120px;
  }

  .assignment-controls {
    flex-basis: calc(100% - 105px);
  }

  .row-actions {
    margin-left: auto;
  }
}

@media (max-width: 650px) {
  .page-header {
    align-items: flex-start;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filters {
    width: 100%;
  }

  .filters select {
    flex: 1;
  }

  .resource-state {
    margin-left: 50px;
  }

  .assignment-controls {
    flex: 1 1 100%;
    margin-left: 50px;
  }

  .row-actions {
    margin-left: 50px;
  }
}

@media (max-width: 420px) {
  .page-header {
    flex-direction: column;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .assignment-controls {
    margin-left: 0;
  }

  .assignment-controls select {
    max-width: 100%;
  }
}
</style>

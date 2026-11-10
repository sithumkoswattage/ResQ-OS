<template>
  <section class="c-page">
    <header class="c-header">
      <div>
        <p class="c-eyebrow">Administration</p>
        <h1 class="c-title">Units</h1>
        <p class="c-sub">Register units, link them to field accounts, and suspend or reactivate them.</p>
      </div>
      <button class="c-btn primary" type="button" @click="openDialog('create')"><Plus :size="16" /> Register unit</button>
    </header>

    <p v-if="error" class="c-error" role="alert">{{ error }}</p>

    <section class="c-card">
      <div class="c-toolbar">
        <input v-model.trim="search" class="c-input grow" placeholder="Search code, name or type" />
        <select v-model="statusFilter" class="c-select">
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="dispatched">Dispatched</option>
          <option value="offline">Offline</option>
          <option value="suspended">Suspended</option>
        </select>
        <span class="c-muted">{{ filtered.length }} shown</span>
      </div>

      <p v-if="loading" class="c-empty">Loading units…</p>
      <div v-else-if="filtered.length" class="c-table-wrap">
        <table class="c-table">
          <thead>
            <tr><th>Unit</th><th>Type</th><th>Status</th><th>Operator</th><th>Last seen</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="unit in filtered" :key="unit._id">
              <td>
                <span class="c-dot" :class="{ on: unit.online }" :title="unit.online ? 'Online' : 'Not reporting'"></span>
                <strong>{{ unit.unitCode }}</strong>
                <div class="muted">{{ unit.name }}</div>
              </td>
              <td>{{ unit.type }}</td>
              <td>
                <span class="c-badge" :class="statusTone(unit.status)" :title="unit.suspendedReason || ''">{{ titleCase(unit.status) }}</span>
                <div v-if="unit.assignedIncident" class="muted">{{ unit.assignedIncident.code }}</div>
              </td>
              <td>
                <template v-if="unit.operator">{{ unit.operator.username }}<div class="muted">{{ unit.operator.email }}</div></template>
                <span v-else class="muted">Not linked</span>
              </td>
              <td class="muted">{{ unit.lastSeen ? timeAgo(unit.lastSeen, now) : 'Never' }}</td>
              <td>
                <div class="actions">
                  <button class="c-btn sm" type="button" @click="openDialog('operator', unit)">{{ unit.operator ? 'Change operator' : 'Link operator' }}</button>
                  <button v-if="unit.status === 'suspended'" class="c-btn sm" type="button" @click="reactivate(unit)">Reactivate</button>
                  <button v-else class="c-btn sm danger" type="button" @click="openDialog('suspend', unit)">Suspend</button>
                  <button class="c-btn sm danger" type="button" :disabled="unit.status === 'dispatched'" :title="unit.status === 'dispatched' ? 'Release the unit first' : ''" @click="openDialog('delete', unit)">Remove</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="c-empty">No units match.</p>
    </section>

    <ConsoleModal
      v-if="dialog"
      :title="dialogTitle"
      :submit-label="submitLabel"
      :danger="['suspend', 'delete'].includes(dialog.type)"
      :busy="busy"
      :error="formError"
      @close="dialog = null"
      @submit="submit"
    >
      <template v-if="dialog.type === 'create'">
        <div class="c-form-grid">
          <label class="c-field">Unit code<input v-model.trim="form.unitCode" class="c-input" required maxlength="32" placeholder="AMB-07" /></label>
          <label class="c-field">Name<input v-model.trim="form.name" class="c-input" required maxlength="100" placeholder="Ambulance 7" /></label>
          <label class="c-field">Type<input v-model.trim="form.type" class="c-input" required maxlength="80" placeholder="Ambulance" list="unit-types" /></label>
          <label class="c-field">Starts as
            <select v-model="form.status" class="c-select"><option value="offline">Offline</option><option value="available">Available</option></select>
          </label>
          <label class="c-field">Latitude<input v-model.number="form.latitude" type="number" step="any" min="-90" max="90" class="c-input" required /></label>
          <label class="c-field">Longitude<input v-model.number="form.longitude" type="number" step="any" min="-180" max="180" class="c-input" required /></label>
        </div>
        <datalist id="unit-types"><option>Ambulance</option><option>Fire &amp; rescue</option><option>Rapid response</option><option>Water rescue</option><option>Police patrol</option></datalist>
      </template>

      <template v-else-if="dialog.type === 'suspend'">
        <template v-if="needsForce">
          <p><strong>{{ dialog.unit.unitCode }}</strong> is on an active dispatch. Suspending it releases it from the incident and alerts its crew. Dispatchers will need to send another unit.</p>
        </template>
        <p v-else>Suspended units cannot go online or be dispatched until you reactivate them.</p>
        <label class="c-field">Reason (optional, shown in the activity log)<input v-model.trim="form.reason" class="c-input" maxlength="200" /></label>
      </template>

      <template v-else-if="dialog.type === 'operator'">
        <p>Link <strong>{{ dialog.unit.unitCode }}</strong> to a field-unit account. Leave the email empty to remove the current operator.</p>
        <label class="c-field">Field account email<input v-model.trim="form.email" type="email" class="c-input" placeholder="unit@example.com" /></label>
      </template>

      <template v-else-if="dialog.type === 'delete'">
        <p>Remove <strong>{{ dialog.unit.unitCode }}</strong> from the fleet? Its operator link is cleared and its equipment is unassigned. This cannot be undone.</p>
      </template>
    </ConsoleModal>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import api from '../../services/api'
import { connectStream } from '../../services/stream'
import { timeAgo, titleCase } from '../../services/format'
import ConsoleModal from '../../components/ConsoleModal.vue'

const units = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const statusFilter = ref('all')
const dialog = ref(null)
const busy = ref(false)
const formError = ref('')
const needsForce = ref(false)
const now = ref(Date.now())
const form = reactive({ unitCode: '', name: '', type: '', status: 'offline', latitude: 6.9271, longitude: 79.8612, reason: '', email: '' })
let stopStream = () => {}
let clock

const statusTone = (s) => ({ available: 'ok', dispatched: 'info', offline: 'muted', suspended: 'bad' }[s] || 'muted')
const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return units.value.filter((u) =>
    (statusFilter.value === 'all' || u.status === statusFilter.value) &&
    (!q || [u.unitCode, u.name, u.type].some((v) => v?.toLowerCase().includes(q))))
})
const dialogTitle = computed(() => ({
  create: 'Register a unit',
  suspend: `Suspend ${dialog.value?.unit?.unitCode}`,
  operator: 'Link operator',
  delete: 'Remove unit'
}[dialog.value?.type] || ''))
const submitLabel = computed(() => {
  if (dialog.value?.type === 'suspend') return needsForce.value ? 'Release and suspend' : 'Suspend unit'
  return { create: 'Register unit', operator: 'Save', delete: 'Remove unit' }[dialog.value?.type] || 'Save'
})

async function load() {
  try {
    const { data } = await api.get('/resources')
    units.value = data
    error.value = ''
  } catch (err) {
    error.value = err.response?.data?.message || 'Unable to load units.'
  } finally {
    loading.value = false
  }
}

function openDialog(type, unit = null) {
  formError.value = ''
  needsForce.value = false
  Object.assign(form, { unitCode: '', name: '', type: '', status: 'offline', latitude: 6.9271, longitude: 79.8612, reason: '', email: unit?.operator?.email || '' })
  dialog.value = { type, unit }
}

async function submit() {
  busy.value = true
  formError.value = ''
  try {
    const { type, unit } = dialog.value
    if (type === 'create') {
      await api.post('/resources', {
        unitCode: form.unitCode, name: form.name, type: form.type,
        status: form.status, latitude: form.latitude, longitude: form.longitude
      })
    } else if (type === 'suspend') {
      await api.post(`/admin/units/${unit._id}/suspend`, { reason: form.reason, force: needsForce.value })
    } else if (type === 'operator') {
      await api.put(`/resources/${unit._id}/operator`, { email: form.email || null })
    } else if (type === 'delete') {
      await api.delete(`/resources/${unit._id}`)
    }
    dialog.value = null
    await load()
  } catch (err) {
    if (err.response?.data?.code === 'unit_dispatched') {
      needsForce.value = true // show the confirmation text; the next submit sends force
      formError.value = ''
    } else {
      formError.value = err.response?.data?.message || 'That did not work. Please try again.'
    }
  } finally {
    busy.value = false
  }
}

async function reactivate(unit) {
  error.value = ''
  try {
    await api.post(`/admin/units/${unit._id}/reactivate`)
    await load()
  } catch (err) {
    error.value = err.response?.data?.message || 'Unable to reactivate this unit.'
  }
}

onMounted(() => {
  load()
  clock = setInterval(() => { now.value = Date.now() }, 30000)
  stopStream = connectStream({
    'unit:status': (unit) => {
      const known = units.value.find((u) => u._id === unit._id)
      // New unit, or a different incident: reload so operator/incident details are populated.
      if (!known || (unit.assignedIncident || null) !== (known.assignedIncident?._id ?? null)) return load()
      units.value = units.value.map((u) => (u._id === unit._id ? { ...u, ...unit, assignedIncident: u.assignedIncident, operator: u.operator } : u))
    },
    'unit:location': (loc) => {
      units.value = units.value.map((u) => (u._id === loc.resourceId
        ? { ...u, latitude: loc.latitude, longitude: loc.longitude, lastSeen: loc.lastSeen, online: true }
        : u))
    },
    'unit:removed': ({ resourceId }) => { units.value = units.value.filter((u) => u._id !== resourceId) }
  }, { onStatus: (ok) => { if (ok) load() } })
})
onUnmounted(() => {
  stopStream()
  clearInterval(clock)
})
</script>

<template>
  <section class="c-page">
    <header class="c-header">
      <div>
        <p class="c-eyebrow">Administration</p>
        <h1 class="c-title">Equipment</h1>
        <p class="c-sub">Register equipment, track its condition and service dates, and assign it to units.</p>
      </div>
      <button class="c-btn primary" type="button" @click="openDialog()"><Plus :size="16" /> Register equipment</button>
    </header>

    <p v-if="error" class="c-error" role="alert">{{ error }}</p>

    <section class="c-card">
      <div class="c-toolbar">
        <input v-model.trim="search" class="c-input grow" placeholder="Search name or asset tag" />
        <select v-model="categoryFilter" class="c-select">
          <option value="all">All categories</option>
          <option v-for="c in categories" :key="c" :value="c">{{ titleCase(c) }}</option>
        </select>
        <select v-model="statusFilter" class="c-select">
          <option value="all">All conditions</option>
          <option value="serviceable">Serviceable</option>
          <option value="maintenance">In maintenance</option>
          <option value="retired">Retired</option>
        </select>
        <select v-model="assignFilter" class="c-select">
          <option value="all">Any assignment</option>
          <option value="unassigned">Unassigned</option>
          <option value="assigned">Assigned</option>
        </select>
        <span class="c-muted">{{ filtered.length }} shown</span>
      </div>

      <p v-if="loading" class="c-empty">Loading equipment…</p>
      <div v-else-if="filtered.length" class="c-table-wrap">
        <table class="c-table">
          <thead>
            <tr><th>Item</th><th>Category</th><th>Condition</th><th>Qty</th><th>Assigned to</th><th>Next service</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="item in filtered" :key="item._id">
              <td><strong>{{ item.name }}</strong><div class="muted">{{ item.assetTag }}</div></td>
              <td>{{ titleCase(item.category) }}</td>
              <td><span class="c-badge" :class="statusTone(item.status)">{{ titleCase(item.status) }}</span></td>
              <td>{{ item.quantity }}</td>
              <td>{{ item.assignedUnit ? item.assignedUnit.unitCode : '—' }}</td>
              <td>
                <template v-if="item.nextServiceDue">
                  {{ formatDate(item.nextServiceDue) }}
                  <span v-if="overdue(item)" class="c-badge bad" style="margin-left: 4px">Overdue</span>
                </template>
                <span v-else class="muted">—</span>
              </td>
              <td>
                <div class="actions">
                  <button class="c-btn sm" type="button" @click="openDialog(item)">Edit</button>
                  <button class="c-btn sm danger" type="button" @click="confirmDelete(item)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="c-empty">No equipment matches.</p>
    </section>

    <ConsoleModal
      v-if="dialog"
      :title="dialog.item ? 'Edit equipment' : 'Register equipment'"
      :submit-label="dialog.item ? 'Save changes' : 'Register'"
      :busy="busy"
      :error="formError"
      @close="dialog = null"
      @submit="submit"
    >
      <div class="c-form-grid">
        <label class="c-field">Asset tag<input v-model.trim="form.assetTag" class="c-input" required maxlength="40" placeholder="DEFIB-01" /></label>
        <label class="c-field">Name<input v-model.trim="form.name" class="c-input" required maxlength="120" placeholder="Defibrillator" /></label>
        <label class="c-field">Category
          <select v-model="form.category" class="c-select"><option v-for="c in categories" :key="c" :value="c">{{ titleCase(c) }}</option></select>
        </label>
        <label class="c-field">Condition
          <select v-model="form.status" class="c-select">
            <option value="serviceable">Serviceable</option>
            <option value="maintenance">In maintenance</option>
            <option value="retired">Retired</option>
          </select>
        </label>
        <label class="c-field">Quantity<input v-model.number="form.quantity" type="number" min="1" step="1" class="c-input" required /></label>
        <label class="c-field">Next service due<input v-model="form.nextServiceDue" type="date" class="c-input" /></label>
        <label class="c-field full">Assigned unit
          <select v-model="form.assignedUnit" class="c-select" :disabled="form.status !== 'serviceable'">
            <option value="">Not assigned</option>
            <option v-for="u in units" :key="u._id" :value="u._id">{{ u.unitCode }} · {{ u.name }}</option>
          </select>
        </label>
        <label class="c-field full">Notes<textarea v-model.trim="form.notes" class="c-textarea" rows="2" maxlength="500"></textarea></label>
      </div>
      <p v-if="form.status !== 'serviceable'" class="c-muted" style="margin-top: 8px">Equipment that is in maintenance or retired is removed from its unit.</p>
    </ConsoleModal>

    <ConsoleModal
      v-if="deleting"
      title="Delete equipment"
      submit-label="Delete"
      danger
      :busy="busy"
      :error="formError"
      @close="deleting = null"
      @submit="doDelete"
    >
      <p>Delete <strong>{{ deleting.name }}</strong> ({{ deleting.assetTag }})? This cannot be undone. To keep a record, mark it Retired instead.</p>
    </ConsoleModal>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import api from '../../services/api'
import { formatDate, titleCase } from '../../services/format'
import ConsoleModal from '../../components/ConsoleModal.vue'

const categories = ['medical', 'firefighting', 'rescue', 'communication', 'protective', 'vehicle', 'other']

const items = ref([])
const units = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const categoryFilter = ref('all')
const statusFilter = ref('all')
const assignFilter = ref('all')
const dialog = ref(null)
const deleting = ref(null)
const busy = ref(false)
const formError = ref('')
const form = reactive({ assetTag: '', name: '', category: 'other', status: 'serviceable', quantity: 1, nextServiceDue: '', notes: '', assignedUnit: '' })

const statusTone = (s) => ({ serviceable: 'ok', maintenance: 'warn', retired: 'muted' }[s] || 'muted')
const overdue = (item) => item.status !== 'retired' && item.nextServiceDue && new Date(item.nextServiceDue) < new Date()

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return items.value.filter((i) =>
    (categoryFilter.value === 'all' || i.category === categoryFilter.value) &&
    (statusFilter.value === 'all' || i.status === statusFilter.value) &&
    (assignFilter.value === 'all' || (assignFilter.value === 'assigned') === Boolean(i.assignedUnit)) &&
    (!q || i.name.toLowerCase().includes(q) || i.assetTag.toLowerCase().includes(q)))
})

async function load() {
  try {
    const [equipment, fleet] = await Promise.all([api.get('/equipment'), api.get('/resources')])
    items.value = equipment.data
    units.value = fleet.data
    error.value = ''
  } catch (err) {
    error.value = err.response?.data?.message || 'Unable to load equipment.'
  } finally {
    loading.value = false
  }
}

function openDialog(item = null) {
  formError.value = ''
  Object.assign(form, {
    assetTag: item?.assetTag || '',
    name: item?.name || '',
    category: item?.category || 'other',
    status: item?.status || 'serviceable',
    quantity: item?.quantity || 1,
    nextServiceDue: item?.nextServiceDue ? item.nextServiceDue.slice(0, 10) : '',
    notes: item?.notes || '',
    assignedUnit: item?.assignedUnit?._id || ''
  })
  dialog.value = { item }
}

async function submit() {
  busy.value = true
  formError.value = ''
  const { item } = dialog.value
  const body = {
    assetTag: form.assetTag, name: form.name, category: form.category, status: form.status,
    quantity: form.quantity, notes: form.notes, nextServiceDue: form.nextServiceDue || null
  }
  const unitId = form.status === 'serviceable' ? form.assignedUnit || null : null
  try {
    if (item) {
      await api.patch(`/equipment/${item._id}`, body)
      if ((item.assignedUnit?._id || null) !== unitId && form.status === 'serviceable') {
        await api.post(`/equipment/${item._id}/assign`, { unitId })
      }
    } else {
      await api.post('/equipment', { ...body, ...(unitId ? { assignedUnit: unitId } : {}) })
    }
    dialog.value = null
    await load()
  } catch (err) {
    formError.value = err.response?.data?.message || 'That did not work. Please try again.'
  } finally {
    busy.value = false
  }
}

function confirmDelete(item) {
  formError.value = ''
  deleting.value = item
}

async function doDelete() {
  busy.value = true
  try {
    await api.delete(`/equipment/${deleting.value._id}`)
    deleting.value = null
    await load()
  } catch (err) {
    formError.value = err.response?.data?.message || 'Unable to delete this item.'
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

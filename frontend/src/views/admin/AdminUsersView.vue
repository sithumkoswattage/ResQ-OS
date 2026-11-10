<template>
  <section class="c-page">
    <header class="c-header">
      <div>
        <p class="c-eyebrow">Administration</p>
        <h1 class="c-title">Accounts</h1>
        <p class="c-sub">Create accounts, change roles, suspend access and reset passwords.</p>
      </div>
      <button class="c-btn primary" type="button" @click="openDialog('create')"><Plus :size="16" /> New account</button>
    </header>

    <p v-if="error" class="c-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="c-notice" role="status">{{ notice }}</p>

    <section class="c-card">
      <div class="c-toolbar">
        <input v-model.trim="search" class="c-input grow" placeholder="Search username or email" />
        <select v-model="roleFilter" class="c-select">
          <option value="all">All roles</option>
          <option value="admin">Administrators</option>
          <option value="dispatcher">Dispatchers</option>
          <option value="responder">Field units</option>
        </select>
        <span class="c-muted">{{ onlineCount }} online · {{ filtered.length }} shown</span>
      </div>

      <p v-if="loading" class="c-empty">Loading accounts…</p>
      <div v-else-if="filtered.length" class="c-table-wrap">
        <table class="c-table">
          <thead>
            <tr><th>Account</th><th>Role</th><th>Status</th><th>Unit</th><th>Last sign-in</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="user in filtered" :key="user._id">
              <td>
                <span class="c-dot" :class="{ on: user.online }" :title="user.online ? 'Online' : 'Offline'"></span>
                <strong>{{ user.username }}</strong>
                <div class="muted">{{ user.email }}</div>
              </td>
              <td><span class="c-badge" :class="roleTone(user.role)">{{ user.role }}</span></td>
              <td>
                <span v-if="user.suspended" class="c-badge bad" :title="user.suspendedReason || ''">Suspended</span>
                <span v-else class="c-badge ok">Active</span>
              </td>
              <td>
                <template v-if="user.unit">
                  {{ user.unit.unitCode }}
                  <span class="c-badge" :class="user.onDuty ? 'ok' : 'muted'">{{ user.onDuty ? 'On duty' : 'Off duty' }}</span>
                </template>
                <span v-else-if="user.role === 'responder'" class="c-badge warn" title="This account cannot go on duty until it has a unit">No unit</span>
                <template v-else>—</template>
              </td>
              <td class="muted">{{ user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never' }}</td>
              <td>
                <div class="actions">
                  <RouterLink class="c-btn sm" :to="{ name: 'admin-audit', query: { actorId: user._id } }">Activity</RouterLink>
                  <button v-if="user.role === 'responder'" class="c-btn sm" type="button" @click="openDialog('unit', user)">Unit</button>
                  <button class="c-btn sm" type="button" @click="openDialog('role', user)">Role</button>
                  <button class="c-btn sm" type="button" @click="openDialog('reset', user)">Reset password</button>
                  <button v-if="user.suspended" class="c-btn sm" type="button" @click="reactivate(user)">Reactivate</button>
                  <button v-else-if="user._id !== me?.id" class="c-btn sm danger" type="button" @click="openDialog('suspend', user)">Suspend</button>
                  <button v-if="user._id !== me?.id" class="c-btn sm danger" type="button" @click="openDialog('delete', user)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="c-empty">No accounts match.</p>
    </section>

    <ConsoleModal
      v-if="dialog"
      :title="dialogTitle"
      :submit-label="dialog.type === 'suspend' ? 'Suspend account' : dialog.type === 'delete' ? 'Delete account' : dialog.type === 'create' ? 'Create account' : 'Save'"
      :danger="['suspend', 'delete'].includes(dialog.type)"
      :busy="busy"
      :error="formError"
      @close="dialog = null"
      @submit="submit"
    >
      <template v-if="dialog.type === 'create'">
        <div class="c-form-grid">
          <label class="c-field">Username<input v-model.trim="form.username" class="c-input" required maxlength="60" autocomplete="off" /></label>
          <label class="c-field">Role
            <select v-model="form.role" class="c-select">
              <option value="dispatcher">Dispatcher</option>
              <option value="responder">Field unit</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <label class="c-field full">Email<input v-model.trim="form.email" type="email" class="c-input" required autocomplete="off" /></label>
          <label class="c-field full">Temporary password<input v-model="form.password" type="password" class="c-input" required minlength="8" autocomplete="new-password" /></label>
        </div>

        <fieldset v-if="form.role === 'responder'" class="c-fieldset">
          <legend>Unit for this person</legend>
          <div class="c-choice">
            <label><input type="radio" value="new" v-model="form.unitMode" /> Create a new unit for them</label>
            <label><input type="radio" value="existing" v-model="form.unitMode" /> Add to an existing unit</label>
            <label><input type="radio" value="none" v-model="form.unitMode" /> No unit yet</label>
          </div>
          <div v-if="form.unitMode === 'new'" class="c-form-grid">
            <label class="c-field">Unit code<input v-model.trim="form.unitCode" class="c-input" required maxlength="32" placeholder="PC-101" autocomplete="off" /></label>
            <label class="c-field">Type
              <input v-model.trim="form.unitType" class="c-input" required maxlength="80" list="unit-types" placeholder="Police officer" autocomplete="off" />
              <datalist id="unit-types">
                <option v-for="t in unitTypes" :key="t" :value="t" />
              </datalist>
            </label>
            <label class="c-field full">Unit name (optional, defaults to the username)<input v-model.trim="form.unitName" class="c-input" maxlength="100" autocomplete="off" /></label>
          </div>
          <label v-else-if="form.unitMode === 'existing'" class="c-field">Unit
            <select v-model="form.unitId" class="c-select" required>
              <option value="" disabled>Choose a unit</option>
              <option v-for="u in units" :key="u._id" :value="u._id">{{ crewLabel(u) }}</option>
            </select>
          </label>
          <p v-if="form.unitMode === 'existing' && !units.length" class="c-muted">There are no units yet; create a new one instead.</p>
          <p v-if="form.unitMode === 'new'" class="c-muted">The unit starts offline and appears on the dispatch board once this person goes on duty.</p>
        </fieldset>
      </template>

      <template v-else-if="dialog.type === 'unit'">
        <p>Choose the unit <strong>{{ dialog.user.username }}</strong> works on. Several people can share one unit. They start off duty on a new unit, and a unit on a dispatch needs someone left on duty.</p>
        <label class="c-field">Unit
          <select v-model="form.unitId" class="c-select">
            <option value="">No unit</option>
            <option v-for="u in units" :key="u._id" :value="u._id">{{ crewLabel(u) }}</option>
          </select>
        </label>
      </template>

      <template v-else-if="dialog.type === 'role'">
        <p>Change the role for <strong>{{ dialog.user.username }}</strong>. Changes apply on their next request.</p>
        <label class="c-field">Role
          <select v-model="form.role" class="c-select">
            <option value="dispatcher">Dispatcher</option>
            <option value="responder">Field unit</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
        <p v-if="dialog.user._id === me?.id" class="c-muted" style="margin-top: 10px">You cannot change your own role.</p>
      </template>

      <template v-else-if="dialog.type === 'reset'">
        <p>Set a new password for <strong>{{ dialog.user.username }}</strong>. Share it with them securely. Sessions they already have open stay valid until they expire; suspend the account first if you need them signed out now.</p>
        <label class="c-field">New password<input v-model="form.password" type="password" class="c-input" required minlength="8" autocomplete="new-password" /></label>
      </template>

      <template v-else-if="dialog.type === 'delete'">
        <p>Permanently delete <strong>{{ dialog.user.username }}</strong>? They are signed out immediately and cannot sign in again. This cannot be undone.</p>
        <p v-if="dialog.user.unit" class="c-muted">Their unit <strong>{{ dialog.user.unit.unitCode }}</strong> stays in the fleet without an operator.</p>
        <p class="c-muted">Their past activity stays in the activity log. To block access but keep the account, suspend it instead.</p>
      </template>

      <template v-else-if="dialog.type === 'suspend'">
        <p>Suspending <strong>{{ dialog.user.username }}</strong> signs them out immediately and blocks them from signing in until you reactivate the account.</p>
        <label class="c-field">Reason (optional, shown in the activity log)<input v-model.trim="form.reason" class="c-input" maxlength="200" /></label>
      </template>
    </ConsoleModal>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import api from '../../services/api'
import { connectStream } from '../../services/stream'
import { getUser } from '../../services/session'
import { formatDateTime } from '../../services/format'
import ConsoleModal from '../../components/ConsoleModal.vue'

const me = getUser()
const users = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const roleFilter = ref('all')
const dialog = ref(null)
const busy = ref(false)
const formError = ref('')
const form = reactive({
  username: '', email: '', password: '', role: 'dispatcher', reason: '',
  unitMode: 'new', unitCode: '', unitType: '', unitName: '', unitId: ''
})
const units = ref([])
const notice = ref('')
const unitTypes = ['Police officer', 'Patrol car', 'Motorcycle patrol', 'Ambulance', 'Fire engine', 'Rescue unit']
let stopStream = () => {}

const roleTone = (role) => ({ admin: 'bad', dispatcher: 'info', responder: 'ok' }[role] || 'muted')
// Any unit can take more crew, so every unit is a choice; show how many people it has.
const crewLabel = (u) => `${u.unitCode} · ${u.name} (${u.type}) · ${u.crew?.length || 0} on crew`
const onlineCount = computed(() => users.value.filter((u) => u.online).length)
const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return users.value.filter((u) =>
    (roleFilter.value === 'all' || u.role === roleFilter.value) &&
    (!q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)))
})
const dialogTitle = computed(() => ({
  create: 'New account',
  role: 'Change role',
  reset: 'Reset password',
  suspend: 'Suspend account',
  delete: 'Delete account',
  unit: 'Change unit'
}[dialog.value?.type] || ''))

async function loadUnits() {
  try {
    const { data } = await api.get('/resources')
    units.value = data
  } catch {
    units.value = []
  }
}

async function load() {
  try {
    const { data } = await api.get('/admin/users')
    users.value = data
    error.value = ''
  } catch (err) {
    error.value = err.response?.data?.message || 'Unable to load accounts.'
  } finally {
    loading.value = false
  }
}

function openDialog(type, user = null) {
  formError.value = ''
  Object.assign(form, {
    username: '', email: '', password: '', role: user?.role || 'dispatcher', reason: '',
    unitMode: 'new', unitCode: '', unitType: '', unitName: '', unitId: user?.unit?._id || ''
  })
  if (type === 'create' || type === 'unit') loadUnits()
  dialog.value = { type, user }
}

function replaceUser(updated) {
  users.value = users.value.map((u) => (u._id === updated._id ? { ...u, ...updated } : u))
}

async function submit() {
  busy.value = true
  formError.value = ''
  try {
    const { type, user } = dialog.value
    if (type === 'create') {
      const body = { username: form.username, email: form.email, password: form.password, role: form.role }
      if (form.role === 'responder') {
        if (form.unitMode === 'new') {
          body.createUnit = { unitCode: form.unitCode, type: form.unitType, name: form.unitName }
        } else if (form.unitMode === 'existing') {
          if (!form.unitId) throw new Error('Choose a unit, or pick "No unit yet".')
          body.unit = form.unitId
        }
      }
      await api.post('/admin/users', body)
      await load()
    } else if (type === 'unit') {
      const { data } = await api.patch(`/admin/users/${user._id}`, { unit: form.unitId || null })
      replaceUser(data)
    } else if (type === 'role') {
      if (form.role !== user.role) {
        const { data } = await api.patch(`/admin/users/${user._id}`, { role: form.role })
        replaceUser(data)
      }
    } else if (type === 'reset') {
      await api.post(`/admin/users/${user._id}/reset-password`, { password: form.password })
    } else if (type === 'delete') {
      await api.delete(`/admin/users/${user._id}`)
      users.value = users.value.filter((u) => u._id !== user._id)
      notice.value = `Deleted ${user.username}.`
    } else if (type === 'suspend') {
      const { data } = await api.post(`/admin/users/${user._id}/suspend`, { reason: form.reason })
      replaceUser(data)
      notice.value = data.unitStillDispatched
        ? `${user.username} is suspended, but ${data.unitStillDispatched} is still on a dispatch. Release it from the incident.`
        : ''
    }
    dialog.value = null
  } catch (err) {
    formError.value = err.response?.data?.message || err.message || 'That did not work. Please try again.'
  } finally {
    busy.value = false
  }
}

async function reactivate(user) {
  error.value = ''
  try {
    const { data } = await api.post(`/admin/users/${user._id}/reactivate`)
    replaceUser(data)
  } catch (err) {
    error.value = err.response?.data?.message || 'Unable to reactivate this account.'
  }
}

onMounted(() => {
  load()
  stopStream = connectStream({
    'presence:changed': (change) => {
      users.value = users.value.map((u) => (u._id === change.userId ? { ...u, online: change.online } : u))
    }
  }, { onStatus: (ok) => { if (ok) load() } })
})
onUnmounted(() => stopStream())
</script>

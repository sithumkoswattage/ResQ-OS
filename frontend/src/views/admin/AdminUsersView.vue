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
              <td>{{ user.unit ? user.unit.unitCode : '—' }}</td>
              <td class="muted">{{ user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never' }}</td>
              <td>
                <div class="actions">
                  <RouterLink class="c-btn sm" :to="{ name: 'admin-audit', query: { actorId: user._id } }">Activity</RouterLink>
                  <button class="c-btn sm" type="button" @click="openDialog('role', user)">Role</button>
                  <button class="c-btn sm" type="button" @click="openDialog('reset', user)">Reset password</button>
                  <button v-if="user.suspended" class="c-btn sm" type="button" @click="reactivate(user)">Reactivate</button>
                  <button v-else-if="user._id !== me?.id" class="c-btn sm danger" type="button" @click="openDialog('suspend', user)">Suspend</button>
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
      :submit-label="dialog.type === 'suspend' ? 'Suspend account' : dialog.type === 'create' ? 'Create account' : 'Save'"
      :danger="dialog.type === 'suspend'"
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
const form = reactive({ username: '', email: '', password: '', role: 'dispatcher', reason: '' })
let stopStream = () => {}

const roleTone = (role) => ({ admin: 'bad', dispatcher: 'info', responder: 'ok' }[role] || 'muted')
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
  suspend: 'Suspend account'
}[dialog.value?.type] || ''))

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
  Object.assign(form, { username: '', email: '', password: '', role: user?.role || 'dispatcher', reason: '' })
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
      await api.post('/admin/users', { username: form.username, email: form.email, password: form.password, role: form.role })
      await load()
    } else if (type === 'role') {
      if (form.role !== user.role) {
        const { data } = await api.patch(`/admin/users/${user._id}`, { role: form.role })
        replaceUser(data)
      }
    } else if (type === 'reset') {
      await api.post(`/admin/users/${user._id}/reset-password`, { password: form.password })
    } else if (type === 'suspend') {
      const { data } = await api.post(`/admin/users/${user._id}/suspend`, { reason: form.reason })
      replaceUser(data)
    }
    dialog.value = null
  } catch (err) {
    formError.value = err.response?.data?.message || 'That did not work. Please try again.'
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

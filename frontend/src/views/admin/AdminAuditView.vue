<template>
  <section class="c-page">
    <header class="c-header">
      <div>
        <p class="c-eyebrow">Administration</p>
        <h1 class="c-title">Activity log</h1>
        <p class="c-sub">Every sign-in, dispatch, change and admin action, with who did it.</p>
      </div>
      <label class="c-live" :class="{ off: !live || !connected }" style="cursor: pointer">
        <i></i>
        <input v-model="live" type="checkbox" style="display: none" />
        {{ live ? (connected ? 'Live' : 'Reconnecting…') : 'Live updates paused' }}
      </label>
    </header>

    <p v-if="error" class="c-error" role="alert">{{ error }}</p>

    <section class="c-card">
      <div class="c-toolbar">
        <select v-model="category" class="c-select">
          <option value="all">All activity</option>
          <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
        <select v-model="actorId" class="c-select">
          <option value="">Everyone</option>
          <option v-for="u in users" :key="u._id" :value="u._id">{{ u.username }} ({{ u.role }})</option>
        </select>
        <button v-if="category !== 'all' || actorId" class="c-btn sm" type="button" @click="category = 'all'; actorId = ''">Clear filters</button>
      </div>

      <p v-if="loading" class="c-empty">Loading activity…</p>
      <div v-else-if="entries.length" class="c-table-wrap">
        <table class="c-table">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th><th>IP</th></tr></thead>
          <tbody>
            <tr v-for="entry in entries" :key="entry._id">
              <td class="muted" :title="formatDateTime(entry.createdAt)">{{ timeAgo(entry.createdAt, now) }}</td>
              <td>
                <strong>{{ entry.actorName || 'Unknown' }}</strong>
                <div v-if="entry.actorRole" class="muted">{{ entry.actorRole }}</div>
              </td>
              <td><span class="c-badge" :class="actionTone(entry.action)">{{ entry.action }}</span></td>
              <td>{{ entry.summary }}</td>
              <td class="muted">{{ entry.ip || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="c-empty">Nothing recorded for these filters.</p>

      <div v-if="nextBefore" style="margin-top: 12px; text-align: center">
        <button class="c-btn" type="button" :disabled="loadingMore" @click="loadMore">{{ loadingMore ? 'Loading…' : 'Load older activity' }}</button>
      </div>
    </section>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../services/api'
import { connectStream } from '../../services/stream'
import { formatDateTime, timeAgo } from '../../services/format'

const categories = [
  { value: 'auth', label: 'Sign-ins' },
  { value: 'incident', label: 'Incidents' },
  { value: 'resource', label: 'Dispatch & fleet' },
  { value: 'unit', label: 'Field unit actions' },
  { value: 'user', label: 'Account management' }
]

const route = useRoute()
const entries = ref([])
const users = ref([])
const category = ref('all')
const actorId = ref(typeof route.query.actorId === 'string' ? route.query.actorId : '')
const nextBefore = ref(null)
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const live = ref(true)
const connected = ref(false)
const now = ref(Date.now())
let stopStream = () => {}
let clock

const actionTone = (action = '') => ({
  auth: action.includes('failed') || action.includes('blocked') ? 'bad' : 'info',
  incident: 'bad', resource: 'ok', unit: 'ok', user: 'warn'
}[action.split('.')[0]] || 'muted')

function query(extra = {}) {
  const params = { limit: 50, ...extra }
  if (category.value !== 'all') params.category = category.value
  if (actorId.value) params.actorId = actorId.value
  return params
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/admin/audit', { params: query() })
    entries.value = data.entries
    nextBefore.value = data.nextBefore
    error.value = ''
  } catch (err) {
    error.value = err.response?.data?.message || 'Unable to load the activity log.'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  loadingMore.value = true
  try {
    const { data } = await api.get('/admin/audit', { params: query({ before: nextBefore.value }) })
    entries.value = [...entries.value, ...data.entries]
    nextBefore.value = data.nextBefore
  } catch (err) {
    error.value = err.response?.data?.message || 'Unable to load more activity.'
  } finally {
    loadingMore.value = false
  }
}

function matchesFilters(entry) {
  return (category.value === 'all' || entry.action.startsWith(`${category.value}.`)) &&
    (!actorId.value || entry.actorId === actorId.value)
}

watch([category, actorId], load)

onMounted(async () => {
  clock = setInterval(() => { now.value = Date.now() }, 30000)
  try {
    users.value = (await api.get('/admin/users')).data
  } catch { /* the filter just stays empty */ }
  load()
  stopStream = connectStream({
    'audit:new': (entry) => {
      if (!live.value || !matchesFilters(entry)) return
      entries.value = [entry, ...entries.value.filter((e) => e._id !== entry._id)]
    }
  }, { onStatus: (ok) => { connected.value = ok } })
})

onUnmounted(() => {
  stopStream()
  clearInterval(clock)
})
</script>

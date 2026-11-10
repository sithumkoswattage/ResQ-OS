<template>
  <section class="c-page">
    <header class="c-header">
      <div>
        <p class="c-eyebrow">Administration</p>
        <h1 class="c-title">System overview</h1>
        <p class="c-sub">Live view of who is online, what the fleet is doing, and everything happening in the system.</p>
      </div>
      <span class="c-live" :class="{ off: !connected }"><i></i>{{ connected ? 'Live' : 'Reconnecting…' }}</span>
    </header>

    <p v-if="error" class="c-error" role="alert">{{ error }}</p>

    <div class="c-grid-4" v-if="overview">
      <article class="c-card c-stat">
        <div class="c-stat-label">Accounts online</div>
        <strong>{{ online.length }}<small class="of"> / {{ overview.users.total }}</small></strong>
        <span>{{ overview.users.suspended }} suspended</span>
      </article>
      <article class="c-card c-stat">
        <div class="c-stat-label">Units online</div>
        <strong>{{ overview.units.online }}<small class="of"> / {{ overview.units.total }}</small></strong>
        <span>{{ unitStatusLine }}</span>
      </article>
      <article class="c-card c-stat">
        <div class="c-stat-label">Active incidents</div>
        <strong>{{ overview.incidents.active }}</strong>
        <span>{{ overview.incidents.last24h }} reported in the last 24 h</span>
      </article>
      <article class="c-card c-stat">
        <div class="c-stat-label">Equipment</div>
        <strong>{{ overview.equipment.total }}</strong>
        <span>{{ overview.equipment.unassigned }} unassigned · {{ overview.equipment.serviceOverdue }} service overdue</span>
      </article>
    </div>

    <div class="c-two">
      <section class="c-card">
        <div class="c-card-head">
          <h2>Live activity</h2>
          <RouterLink class="c-btn sm" to="/admin/audit">Full log</RouterLink>
        </div>
        <ul v-if="activity.length" class="c-feed">
          <li v-for="entry in activity" :key="entry._id">
            <span class="tone" :class="category(entry.action)"></span>
            <div class="body">
              {{ entry.summary || entry.action }}
              <small>
                {{ entry.actorName || 'Unknown' }}<template v-if="entry.actorRole"> ({{ entry.actorRole }})</template>
                · {{ timeAgo(entry.createdAt, now) }}
              </small>
            </div>
          </li>
        </ul>
        <p v-else class="c-empty">No activity recorded yet.</p>
      </section>

      <aside class="c-card">
        <div class="c-card-head">
          <h2>Online now</h2>
          <RouterLink class="c-btn sm" to="/admin/users">Accounts</RouterLink>
        </div>
        <ul v-if="online.length" class="c-feed">
          <li v-for="person in online" :key="person.userId">
            <span class="c-dot on"></span>
            <div class="body">
              <strong>{{ person.username }}</strong>
              <span class="c-badge" :class="roleTone(person.role)" style="margin-left: 6px">{{ person.role }}</span>
              <small>
                signed in {{ timeAgo(person.since, now) }}
                <template v-if="person.connections > 1"> · {{ person.connections }} sessions</template>
              </small>
            </div>
          </li>
        </ul>
        <p v-else class="c-empty">Nobody is connected right now.</p>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../../services/api'
import { connectStream } from '../../services/stream'
import { timeAgo } from '../../services/format'

const overview = ref(null)
const online = ref([])
const activity = ref([])
const error = ref('')
const connected = ref(false)
const now = ref(Date.now())

let stopStream = () => {}
let clock
let reloadTimer

const unitStatusLine = computed(() => {
  const by = overview.value?.units.byStatus || {}
  return `${by.dispatched || 0} dispatched · ${by.suspended || 0} suspended`
})

const category = (action = '') => action.split('.')[0]
const roleTone = (role) => ({ admin: 'bad', dispatcher: 'info', responder: 'ok' }[role] || 'muted')

async function load({ keepFeed = false } = {}) {
  try {
    const { data } = await api.get('/admin/overview')
    overview.value = data
    online.value = data.onlineUsers
    if (!keepFeed) activity.value = data.recentActivity
    error.value = ''
  } catch (err) {
    error.value = err.response?.data?.message || 'Unable to load the overview.'
  }
}

// Fleet/incident events change the headline numbers; refresh them (not the feed), at most once a second.
function scheduleReload() {
  clearTimeout(reloadTimer)
  reloadTimer = setTimeout(() => load({ keepFeed: true }), 1000)
}

onMounted(() => {
  load()
  clock = setInterval(() => { now.value = Date.now() }, 30000)
  stopStream = connectStream({
    'audit:new': (entry) => {
      activity.value = [entry, ...activity.value.filter((e) => e._id !== entry._id)].slice(0, 40)
    },
    'presence:changed': (change) => {
      const rest = online.value.filter((p) => p.userId !== change.userId)
      if (change.online) {
        const existing = online.value.find((p) => p.userId === change.userId)
        online.value = [...rest, {
          userId: change.userId,
          username: change.username,
          role: change.role,
          connections: change.connections,
          since: existing?.since || new Date().toISOString()
        }].sort((a, b) => a.username.localeCompare(b.username))
      } else {
        online.value = rest
      }
      if (overview.value) overview.value.users.online = online.value.length
    },
    'unit:status': scheduleReload,
    'unit:removed': scheduleReload,
    'incident:created': scheduleReload,
    'incident:updated': scheduleReload
  }, {
    onStatus: (ok) => {
      const wasDown = !connected.value
      connected.value = ok
      if (ok && wasDown && overview.value) load() // catch up on anything missed while offline
    }
  })
})

onUnmounted(() => {
  stopStream()
  clearInterval(clock)
  clearTimeout(reloadTimer)
})
</script>

<style scoped>
.of { color: #929caf; font-size: 15px; font-weight: 600; }
</style>

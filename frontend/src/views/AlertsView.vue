<template>
  <section class="alerts-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Dispatch activity</p>
        <h1>Alerts</h1>
        <p class="description">Incident and field-unit updates from across the response operation.</p>
      </div>
      <div class="header-actions">
        <span class="unread-count">{{ unreadCount }} unread</span>
        <button class="secondary-button" type="button" :disabled="!unreadCount || markingAllRead" @click="markAllRead">
          <CheckCheck :size="16" aria-hidden="true" />
          {{ markingAllRead ? 'Updating…' : 'Mark all read' }}
        </button>
      </div>
    </header>

    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

    <section class="panel">
      <div class="toolbar">
        <div class="filters" aria-label="Filter alerts">
          <button
            v-for="option in statusOptions"
            :key="option.value"
            class="filter-button"
            :class="{ selected: statusFilter === option.value }"
            type="button"
            :aria-pressed="statusFilter === option.value"
            @click="statusFilter = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <label class="category-filter">
          <span class="visually-hidden">Filter alert category</span>
          <select v-model="categoryFilter">
            <option value="all">All activity</option>
            <option value="incidents">Incidents</option>
            <option value="resources">Resources</option>
          </select>
        </label>
      </div>

      <p v-if="loading" class="state-message">Loading alerts…</p>
      <div v-else-if="alerts.length" class="alert-list">
        <article
          v-for="alert in alerts"
          :key="alert._id"
          class="alert-row"
          :class="{ unread: !alert.isRead }"
        >
          <span class="alert-icon" :class="`severity-${alert.severity}`">
            <component :is="iconFor(alert)" :size="19" aria-hidden="true" />
          </span>
          <div class="alert-content">
            <div class="alert-title-line">
              <strong>{{ alert.title }}</strong>
              <span v-if="!alert.isRead" class="unread-dot" aria-label="Unread"></span>
            </div>
            <p>{{ alert.message }}</p>
            <time :datetime="alert.createdAt">{{ formatDate(alert.createdAt) }}</time>
          </div>
          <div class="alert-actions">
            <span class="category-badge">{{ alert.sourceType === 'incident' ? 'Incident' : 'Resource' }}</span>
            <RouterLink
              v-if="alert.sourceType === 'incident'"
              class="text-link"
              :to="`/dispatcher/incidents/${alert.sourceId}`"
            >
              View incident <ArrowUpRight :size="14" aria-hidden="true" />
            </RouterLink>
            <RouterLink v-else class="text-link" to="/dispatcher/resources">
              View resources <ArrowUpRight :size="14" aria-hidden="true" />
            </RouterLink>
            <button
              v-if="!alert.isRead"
              class="mark-read-button"
              type="button"
              :disabled="updatingAlert === alert._id"
              @click="markRead(alert)"
            >
              {{ updatingAlert === alert._id ? 'Saving…' : 'Mark read' }}
            </button>
            <span v-else class="read-label"><Check :size="14" aria-hidden="true" /> Read</span>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">
        <Bell :size="28" aria-hidden="true" />
        <h2>{{ statusFilter === 'unread' ? 'You’re all caught up' : 'No alerts yet' }}</h2>
        <p>New incidents and resource activity will appear here.</p>
      </div>

      <footer v-if="!loading && alerts.length" class="list-footer">
        Showing {{ alerts.length }} most recent alerts
      </footer>
    </section>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Ambulance,
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  CircleAlert,
  Siren,
  Truck
} from 'lucide-vue-next'
import api from '../services/api'

const alerts = ref([])
const unreadCount = ref(0)
const statusFilter = ref('all')
const categoryFilter = ref('all')
const loading = ref(true)
const markingAllRead = ref(false)
const updatingAlert = ref('')
const errorMessage = ref('')

const statusOptions = [
  { value: 'all', label: 'All alerts' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' }
]

let refreshTimer

onMounted(() => {
  loadAlerts()
  refreshTimer = window.setInterval(loadAlerts, 30000)
})

onUnmounted(() => window.clearInterval(refreshTimer))

watch([statusFilter, categoryFilter], loadAlerts)

async function loadAlerts() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/alerts', {
      params: {
        status: statusFilter.value,
        category: categoryFilter.value,
        limit: 100
      }
    })
    alerts.value = data.alerts
    unreadCount.value = data.unreadCount
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Unable to load alerts.'
  } finally {
    loading.value = false
  }
}

async function markRead(alert) {
  updatingAlert.value = alert._id
  errorMessage.value = ''
  try {
    const { data } = await api.patch(`/alerts/${alert._id}/read`)
    alerts.value = statusFilter.value === 'unread'
      ? alerts.value.filter((item) => item._id !== data._id)
      : alerts.value.map((item) => item._id === data._id ? data : item)
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Unable to mark this alert as read.'
  } finally {
    updatingAlert.value = ''
  }
}

async function markAllRead() {
  markingAllRead.value = true
  errorMessage.value = ''
  try {
    await api.patch('/alerts/read-all')
    alerts.value = statusFilter.value === 'unread'
      ? []
      : alerts.value.map((alert) => ({ ...alert, isRead: true }))
    unreadCount.value = 0
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Unable to mark alerts as read.'
  } finally {
    markingAllRead.value = false
  }
}

function iconFor(alert) {
  if (alert.sourceType === 'incident') return Siren
  if (alert.type === 'resource_dispatched') return Ambulance
  if (alert.type === 'resource_status_changed') return CircleAlert
  return Truck
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}
</script>

<style scoped>
.alerts-page {
  --ink: #172033;
  --muted: #788397;
  --line: #e9edf3;
  max-width: 1250px;
  margin: 0 auto;
  color: var(--ink);
}

.page-header,
.header-actions,
.toolbar,
.filters,
.alert-row,
.alert-title-line,
.alert-actions,
.text-link,
.read-label {
  display: flex;
  align-items: center;
}

.page-header,
.toolbar {
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

.header-actions {
  gap: 10px;
}

.unread-count,
.category-badge {
  border-radius: 999px;
  padding: 5px 9px;
  color: #a72a38;
  background: #fff0f1;
  font-size: 10px;
  font-weight: 750;
  white-space: nowrap;
}

.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 37px;
  align-items: center;
  justify-content: center;
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

.secondary-button:hover:not(:disabled) {
  border-color: #cbd2dd;
  background: #f8f9fb;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.panel {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #fff;
  box-shadow: 0 3px 12px rgb(19 32 55 / 3%);
}

.toolbar {
  min-height: 58px;
  border-bottom: 1px solid var(--line);
  padding: 10px 16px;
}

.filters {
  gap: 5px;
}

.filter-button {
  min-height: 32px;
  border: 0;
  border-radius: 7px;
  padding: 0 10px;
  color: #738096;
  background: transparent;
  font: inherit;
  font-size: 11px;
  font-weight: 650;
  cursor: pointer;
}

.filter-button:hover,
.filter-button.selected {
  color: #a72a38;
  background: #fff0f1;
}

.category-filter select {
  height: 34px;
  border: 1px solid #dfe4ec;
  border-radius: 7px;
  padding: 0 9px;
  color: #4d5a71;
  background: #fff;
  font: inherit;
  font-size: 11px;
}

.alert-list {
  display: flex;
  flex-direction: column;
}

.alert-row {
  min-width: 0;
  align-items: flex-start;
  gap: 13px;
  border-bottom: 1px solid #f0f2f6;
  padding: 16px;
}

.alert-row:last-child {
  border-bottom: 0;
}

.alert-row.unread {
  background: #fffdfd;
}

.alert-icon {
  display: inline-flex;
  width: 39px;
  height: 39px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.severity-info {
  color: #3976cb;
  background: #edf4ff;
}

.severity-warning {
  color: #bd791c;
  background: #fff6e8;
}

.severity-critical {
  color: #c83240;
  background: #fff0f0;
}

.alert-content {
  min-width: 0;
  flex: 1;
}

.alert-title-line {
  gap: 8px;
}

.alert-title-line strong {
  color: #303b51;
  font-size: 12px;
}

.unread-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #c83240;
}

.alert-content p {
  margin: 5px 0;
  color: #69758a;
  font-size: 11px;
  line-height: 1.5;
}

.alert-content time {
  color: #929caf;
  font-size: 10px;
}

.alert-actions {
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.category-badge {
  color: #58667d;
  background: #eef2f7;
}

.text-link {
  gap: 3px;
  color: #b8323e;
  font-size: 10px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.text-link:hover {
  color: #8f202c;
}

.mark-read-button {
  border: 0;
  padding: 5px 3px;
  color: #6a768b;
  background: transparent;
  font: inherit;
  font-size: 10px;
  font-weight: 650;
  cursor: pointer;
}

.mark-read-button:hover:not(:disabled) {
  color: #a72a38;
}

.read-label {
  gap: 4px;
  color: #258564;
  font-size: 10px;
  font-weight: 650;
}

.state-message,
.empty-state {
  padding: 34px 12px;
  color: #8993a4;
  text-align: center;
  font-size: 12px;
}

.empty-state svg {
  color: #a6afbd;
}

.empty-state h2 {
  margin: 9px 0 5px;
  color: #354057;
  font-size: 15px;
}

.empty-state p {
  margin: 0;
}

.list-footer {
  border-top: 1px solid var(--line);
  padding: 11px 16px;
  color: #8993a4;
  font-size: 10px;
  text-align: center;
}

.error-message {
  margin: 0 0 12px;
  border-radius: 7px;
  padding: 9px 11px;
  color: #a92735;
  background: #fff0f1;
  font-size: 12px;
}

.visually-hidden {
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

@media (max-width: 760px) {
  .alert-row {
    flex-wrap: wrap;
  }

  .alert-content {
    flex-basis: calc(100% - 55px);
  }

  .alert-actions {
    margin-left: 52px;
    justify-content: flex-start;
  }
}

@media (max-width: 520px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

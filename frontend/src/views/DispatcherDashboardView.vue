<template>
  <section class="dashboard">
    <header class="page-header">
      <div>
        <p class="eyebrow">Emergency operations</p>
        <h1>Command overview</h1>
        <p class="page-description">A quick view of incidents and field-unit readiness.</p>
      </div>
      <div class="header-actions">
        <span class="sample-label"><span class="sample-dot"></span> Sample data</span>
        <RouterLink class="primary-button" to="/dispatcher/incidents">
          <Plus :size="18" aria-hidden="true" />
          <span>View incidents</span>
        </RouterLink>
      </div>
    </header>

    <section class="stats-grid" aria-label="Operational summary">
      <article v-for="stat in stats" :key="stat.label" class="stat-card">
        <div class="stat-topline">
          <span class="stat-icon" :class="`tone-${stat.tone}`">
            <component :is="stat.icon" :size="19" aria-hidden="true" />
          </span>
          <span class="stat-context">{{ stat.context }}</span>
        </div>
        <p class="stat-value">{{ stat.value }}</p>
        <h2 class="stat-label">{{ stat.label }}</h2>
      </article>
    </section>

    <div class="dashboard-grid">
      <section class="panel incidents-panel">
        <div class="panel-header">
          <div>
            <p class="section-kicker">Live queue</p>
            <h2>Recent incidents</h2>
          </div>
          <RouterLink class="text-link" to="/dispatcher/incidents">
            All incidents <ArrowUpRight :size="16" aria-hidden="true" />
          </RouterLink>
        </div>

        <div class="incident-list">
          <RouterLink
            v-for="incident in recentIncidents"
            :key="incident.id"
            class="incident-row"
            :to="`/dispatcher/incidents/${incident.id}`"
          >
            <span class="incident-marker" :class="`marker-${incident.priority}`">
              <component :is="incident.icon" :size="18" aria-hidden="true" />
            </span>
            <span class="incident-info">
              <span class="incident-title">{{ incident.title }}</span>
              <span class="incident-location">
                <MapPin :size="13" aria-hidden="true" />{{ incident.location }}
              </span>
            </span>
            <span class="incident-meta">
              <span class="priority" :class="`priority-${incident.priority}`">{{ incident.priorityLabel }}</span>
              <span class="incident-time">{{ incident.time }}</span>
            </span>
            <ChevronRight class="row-chevron" :size="17" aria-hidden="true" />
          </RouterLink>
        </div>
      </section>

      <section class="panel units-panel">
        <div class="panel-header">
          <div>
            <p class="section-kicker">Field teams</p>
            <h2>Unit readiness</h2>
          </div>
          <RouterLink class="icon-link" to="/dispatcher/resources" aria-label="View resources">
            <ArrowUpRight :size="18" aria-hidden="true" />
          </RouterLink>
        </div>

        <div class="unit-summary">
          <div>
            <strong>{{ units.length }}</strong>
            <span>tracked units</span>
          </div>
          <span class="availability"><span></span>{{ availableUnits }} available</span>
        </div>

        <ul class="unit-list">
          <li v-for="unit in units" :key="unit.name" class="unit-row">
            <span class="unit-avatar" :class="`unit-${unit.status}`">
              <component :is="unit.icon" :size="17" aria-hidden="true" />
            </span>
            <span class="unit-info">
              <strong>{{ unit.name }}</strong>
              <span>{{ unit.type }}</span>
            </span>
            <span class="unit-status" :class="`status-${unit.status}`">
              <span></span>{{ unit.statusLabel }}
            </span>
          </li>
        </ul>

        <RouterLink class="secondary-button" to="/dispatcher/resources">
          Manage resources <ArrowRight :size="16" aria-hidden="true" />
        </RouterLink>
      </section>

      <section class="panel activity-panel">
        <div class="panel-header">
          <div>
            <p class="section-kicker">Dispatch log</p>
            <h2>Recent activity</h2>
          </div>
          <span class="activity-date">{{ today }}</span>
        </div>

        <ol class="activity-list">
          <li v-for="(activity, index) in activities" :key="activity.id" class="activity-item">
            <span class="activity-rail">
              <span class="activity-icon" :class="`activity-${activity.tone}`">
                <component :is="activity.icon" :size="15" aria-hidden="true" />
              </span>
              <span v-if="index < activities.length - 1" class="activity-line"></span>
            </span>
            <span class="activity-copy">
              <strong>{{ activity.title }}</strong>
              <span>{{ activity.detail }}</span>
              <time>{{ activity.time }}</time>
            </span>
          </li>
        </ol>
      </section>
    </div>

    <p class="demo-note">
      <Info :size="15" aria-hidden="true" />
      This overview uses sample information; live incident and resource feeds are not connected yet.
    </p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Ambulance,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  HeartPulse,
  Info,
  MapPin,
  Plus,
  Radio,
  ShieldAlert,
  Truck
} from 'lucide-vue-next'

const recentIncidents = [
  {
    id: 'INC-2048',
    title: 'Residential building fire',
    location: 'Grandpass, Colombo',
    priority: 'critical',
    priorityLabel: 'Critical',
    time: '4 min ago',
    icon: Flame
  },
  {
    id: 'INC-2047',
    title: 'Medical emergency',
    location: 'Cinnamon Gardens',
    priority: 'high',
    priorityLabel: 'High',
    time: '11 min ago',
    icon: HeartPulse
  },
  {
    id: 'INC-2046',
    title: 'Multi-vehicle collision',
    location: 'D.R. Wijewardena Mawatha',
    priority: 'medium',
    priorityLabel: 'Medium',
    time: '18 min ago',
    icon: Ambulance
  },
  {
    id: 'INC-2045',
    title: 'Flooding reported',
    location: 'Wellawatte, Colombo',
    priority: 'low',
    priorityLabel: 'Low',
    time: '32 min ago',
    icon: ShieldAlert
  }
]

const units = [
  { name: 'Rescue 01', type: 'Fire & rescue', status: 'dispatched', statusLabel: 'Dispatched', icon: Truck },
  { name: 'Medical 03', type: 'Ambulance', status: 'available', statusLabel: 'Available', icon: Ambulance },
  { name: 'Rescue 04', type: 'Fire & rescue', status: 'available', statusLabel: 'Available', icon: Truck },
  { name: 'Patrol 02', type: 'Rapid response', status: 'standby', statusLabel: 'Standby', icon: Radio }
]

const activities = [
  {
    id: 'dispatch',
    title: 'Unit dispatched',
    detail: 'Rescue 01 assigned to INC-2048',
    time: '4 min ago',
    tone: 'urgent',
    icon: Truck
  },
  {
    id: 'incident',
    title: 'New incident received',
    detail: 'Residential building fire · Grandpass',
    time: '6 min ago',
    tone: 'warning',
    icon: Flame
  },
  {
    id: 'available',
    title: 'Unit back in service',
    detail: 'Medical 03 marked available',
    time: '19 min ago',
    tone: 'success',
    icon: Check
  }
]

const activeIncidents = computed(() => recentIncidents.length)
const availableUnits = computed(() => units.filter((unit) => unit.status === 'available').length)
const stats = computed(() => [
  { label: 'Active incidents', value: activeIncidents.value, context: 'Across all zones', icon: ShieldAlert, tone: 'red' },
  { label: 'Units dispatched', value: units.filter((unit) => unit.status === 'dispatched').length, context: 'Responding now', icon: Truck, tone: 'blue' },
  { label: 'Units available', value: availableUnits.value, context: 'Ready to deploy', icon: Radio, tone: 'green' },
  { label: 'Avg. response time', value: '06:42', context: 'Today · sample', icon: Clock3, tone: 'amber' }
])

const today = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date())
</script>

<style scoped>
.dashboard {
  --ink: #172033;
  --muted: #788397;
  --line: #e9edf3;
  color: var(--ink);
  max-width: 1440px;
  margin: 0 auto;
}

.page-header,
.header-actions,
.panel-header,
.stat-topline,
.unit-summary,
.unit-row,
.incident-row,
.incident-location,
.text-link,
.secondary-button,
.demo-note {
  display: flex;
  align-items: center;
}

.page-header,
.panel-header,
.unit-summary {
  justify-content: space-between;
}

.page-header {
  gap: 20px;
  margin: 4px 0 26px;
}

.eyebrow,
.section-kicker {
  margin: 0;
  color: #929caf;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.11em;
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
  line-height: 1.2;
  letter-spacing: -0.035em;
}

.page-description {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.header-actions {
  gap: 16px;
}

.sample-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #6f7a8d;
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}

.sample-dot,
.availability > span,
.unit-status > span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #e6a43a;
}

.primary-button,
.secondary-button {
  justify-content: center;
  gap: 8px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.primary-button {
  min-height: 40px;
  padding: 0 14px;
  color: #fff;
  background: #cf3542;
  box-shadow: 0 5px 12px rgb(207 53 66 / 16%);
}

.primary-button:hover {
  background: #b92d39;
  transform: translateY(-1px);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.stat-card,
.panel {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 3px 12px rgb(19 32 55 / 3%);
}

.stat-card {
  min-width: 0;
  padding: 17px 18px 16px;
}

.stat-topline {
  justify-content: space-between;
  gap: 8px;
}

.stat-icon,
.incident-marker,
.unit-avatar,
.activity-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
}

.stat-icon {
  width: 35px;
  height: 35px;
}

.tone-red {
  color: #cf3542;
  background: #fff0f0;
}

.tone-blue {
  color: #3976cb;
  background: #edf4ff;
}

.tone-green {
  color: #258564;
  background: #eaf7f1;
}

.tone-amber {
  color: #bb7b1c;
  background: #fff6e8;
}

.stat-context {
  overflow: hidden;
  color: #98a1b1;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-value {
  margin: 13px 0 2px;
  font-size: 27px;
  font-weight: 750;
  line-height: 1.1;
  letter-spacing: -0.04em;
}

.stat-label {
  margin: 0;
  color: #69758a;
  font-size: 11px;
  font-weight: 600;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.85fr);
  gap: 16px;
}

.panel {
  min-width: 0;
  padding: 19px;
}

.panel-header {
  gap: 12px;
  margin-bottom: 14px;
}

.panel-header h2 {
  margin: 4px 0 0;
  font-size: 15px;
  font-weight: 720;
  letter-spacing: -0.02em;
}

.section-kicker {
  font-size: 9px;
}

.text-link,
.icon-link {
  color: #be3440;
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
}

.text-link {
  gap: 4px;
  white-space: nowrap;
}

.text-link:hover,
.icon-link:hover {
  color: #90232d;
}

.incident-list {
  display: flex;
  flex-direction: column;
}

.incident-row {
  min-width: 0;
  gap: 11px;
  padding: 13px 0;
  border-top: 1px solid #f0f2f6;
  color: inherit;
  text-decoration: none;
}

.incident-row:first-child {
  border-top: 0;
}

.incident-row:hover .incident-title {
  color: #bd3440;
}

.incident-marker {
  width: 37px;
  height: 37px;
}

.marker-critical {
  color: #c93642;
  background: #fff0f0;
}

.marker-high {
  color: #d3782d;
  background: #fff4e9;
}

.marker-medium {
  color: #4275b8;
  background: #edf4ff;
}

.marker-low {
  color: #30846b;
  background: #eaf7f1;
}

.incident-info,
.incident-meta,
.unit-info,
.activity-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.incident-info {
  flex: 1;
  gap: 4px;
}

.incident-title,
.unit-info strong {
  overflow: hidden;
  color: #283349;
  font-size: 12px;
  font-weight: 680;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.incident-location {
  gap: 4px;
  overflow: hidden;
  color: #9099aa;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.incident-meta {
  align-items: flex-end;
  gap: 5px;
}

.priority {
  border-radius: 999px;
  padding: 4px 7px;
  font-size: 9px;
  font-weight: 750;
}

.priority-critical {
  color: #b82b38;
  background: #fff0f0;
}

.priority-high {
  color: #b96628;
  background: #fff4e9;
}

.priority-medium {
  color: #376aa9;
  background: #edf4ff;
}

.priority-low {
  color: #28775e;
  background: #eaf7f1;
}

.incident-time {
  color: #9aa3b1;
  font-size: 9px;
  white-space: nowrap;
}

.row-chevron {
  flex: 0 0 auto;
  color: #b5bdc9;
}

.units-panel {
  grid-column: 2;
  grid-row: 1;
}

.icon-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--line);
  border-radius: 8px;
}

.unit-summary {
  padding: 11px 12px;
  border-radius: 9px;
  background: #f7f8fa;
}

.unit-summary > div {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.unit-summary strong {
  font-size: 19px;
}

.unit-summary > div > span {
  color: #8993a4;
  font-size: 10px;
}

.availability {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #348266;
  font-size: 10px;
  font-weight: 700;
}

.availability > span {
  background: #36a77b;
}

.unit-list {
  margin: 5px 0 14px;
  padding: 0;
  list-style: none;
}

.unit-row {
  gap: 9px;
  padding: 11px 0;
  border-bottom: 1px solid #f0f2f6;
}

.unit-avatar {
  width: 33px;
  height: 33px;
}

.unit-dispatched {
  color: #bd3541;
  background: #fff0f0;
}

.unit-available {
  color: #298362;
  background: #eaf7f1;
}

.unit-standby {
  color: #b87a1e;
  background: #fff6e8;
}

.unit-info {
  flex: 1;
  gap: 3px;
}

.unit-info strong {
  font-size: 11px;
}

.unit-info > span {
  color: #929bad;
  font-size: 9px;
}

.unit-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #818b9c;
  font-size: 9px;
  font-weight: 650;
  white-space: nowrap;
}

.unit-status > span {
  width: 6px;
  height: 6px;
  background: #a6afbc;
}

.status-dispatched > span {
  background: #d54a54;
}

.status-available > span {
  background: #36a77b;
}

.status-standby > span {
  background: #e0a13b;
}

.secondary-button {
  min-height: 36px;
  width: 100%;
  border: 1px solid #e5e8ee;
  color: #536075;
  background: #fff;
}

.secondary-button:hover {
  border-color: #d5a0a4;
  background: #fffafa;
}

.activity-panel {
  grid-column: 1 / -1;
}

.activity-date {
  color: #8993a4;
  font-size: 10px;
}

.activity-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin: 0;
  padding: 4px 0 0;
  list-style: none;
}

.activity-item {
  display: flex;
  min-width: 0;
  gap: 10px;
}

.activity-rail {
  position: relative;
  display: flex;
  flex: 0 0 auto;
}

.activity-icon {
  z-index: 1;
  width: 31px;
  height: 31px;
}

.activity-urgent {
  color: #c53c47;
  background: #fff0f0;
}

.activity-warning {
  color: #c17b25;
  background: #fff6e8;
}

.activity-success {
  color: #2d8967;
  background: #eaf7f1;
}

.activity-line {
  position: absolute;
  top: 32px;
  bottom: -10px;
  left: 15px;
  width: 1px;
  background: #e8ebf0;
}

.activity-copy {
  gap: 4px;
  padding: 1px 0;
}

.activity-copy strong {
  color: #374257;
  font-size: 10px;
}

.activity-copy > span {
  color: #858fa0;
  font-size: 9px;
  line-height: 1.5;
}

.activity-copy time {
  margin-top: 2px;
  color: #a0a8b5;
  font-size: 9px;
}

.demo-note {
  gap: 7px;
  margin: 14px 0 0;
  color: #8892a2;
  font-size: 10px;
  line-height: 1.5;
}

.demo-note svg {
  flex: 0 0 auto;
  color: #a3acba;
}

@media (max-width: 1050px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-grid {
    grid-template-columns: minmax(0, 1.25fr) minmax(250px, 0.85fr);
  }
}

@media (max-width: 760px) {
  .page-header {
    align-items: flex-start;
  }

  .header-actions {
    align-items: flex-end;
    flex-direction: column-reverse;
    gap: 9px;
  }

  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .units-panel,
  .activity-panel {
    grid-column: 1;
    grid-row: auto;
  }
}

@media (max-width: 520px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
  }

  .header-actions {
    align-items: center;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
  }

  .stats-grid {
    gap: 9px;
  }

  .stat-card {
    padding: 13px;
  }

  .stat-context {
    max-width: 90px;
    font-size: 9px;
  }

  .stat-value {
    font-size: 24px;
  }

  .panel {
    padding: 15px;
  }

  .incident-row {
    gap: 8px;
  }

  .incident-marker {
    width: 32px;
    height: 32px;
  }

  .incident-meta {
    max-width: 63px;
  }

  .incident-time {
    font-size: 8px;
  }

  .row-chevron {
    width: 14px;
  }

  .activity-list {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
}
</style>

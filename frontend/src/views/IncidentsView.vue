<template>
  <section class="incidents-view">
    <header class="page-header">
      <div>
        <p class="eyebrow">Operations</p>
        <h1>Incidents</h1>
      </div>
      <button class="primary-btn" type="button">New Incident</button>
    </header>

    <div class="panel">
      <div class="panel-header">
        <h2>Recent incidents</h2>
        <span class="badge">{{ incidents.length }} total</span>
      </div>

      <div v-if="incidents.length" class="incident-list">
        <article v-for="incident in incidents" :key="incident.id" class="incident-item">
          <div class="incident-main">
            <div>
              <p class="incident-title">{{ incident.title }}</p>
              <p class="incident-meta">{{ incident.location }} • {{ incident.time }}</p>
            </div>
          </div>

          <div class="incident-status-group">
            <span class="status" :class="incident.status.toLowerCase()">{{ incident.status }}</span>
            <span class="severity" :class="incident.severity.toLowerCase()">{{ incident.severity }}</span>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <h3>No incidents reported</h3>
        <p>Incidents will appear here once your team starts logging them.</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const incidents = ref([
  {
    id: 1,
    title: 'Power outage at East Wing',
    location: 'East Wing',
    time: '08:45 AM',
    status: 'Open',
    severity: 'High',
  },
  {
    id: 2,
    title: 'Water leak in Warehouse B',
    location: 'Warehouse B',
    time: '09:20 AM',
    status: 'In Progress',
    severity: 'Medium',
  },
  {
    id: 3,
    title: 'HVAC maintenance request',
    location: 'North Campus',
    time: '11:10 AM',
    status: 'Resolved',
    severity: 'Low',
  },
])
</script>

<style scoped>
.incidents-view {
  padding: 1.5rem;
  color: #1f2937;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.eyebrow {
  margin: 0 0 0.25rem;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  color: #6b7280;
}

h1 {
  margin: 0;
  font-size: 2rem;
  line-height: 1.2;
}

.primary-btn {
  border: none;
  border-radius: 0.5rem;
  background: #2563eb;
  color: #fff;
  padding: 0.75rem 1rem;
  font-weight: 600;
  cursor: pointer;
}

.panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.1rem;
}

.badge {
  background: #e0f2fe;
  color: #075985;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.incident-list {
  display: flex;
  flex-direction: column;
}

.incident-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
}

.incident-item:last-child {
  border-bottom: none;
}

.incident-title {
  margin: 0 0 0.25rem;
  font-weight: 600;
}

.incident-meta {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.incident-status-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status,
.severity {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.3rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.status.open,
.severity.high {
  background: #fee2e2;
  color: #b91c1c;
}

.status.in\ progress {
  background: #fef3c7;
  color: #92400e;
}

.status.resolved,
.severity.low {
  background: #dcfce7;
  color: #166534;
}

.severity.medium {
  background: #fef3c7;
  color: #92400e;
}

.empty-state {
  padding: 2rem 1.25rem;
  text-align: center;
}

.empty-state h3 {
  margin: 0 0 0.5rem;
}

.empty-state p {
  margin: 0;
  color: #6b7280;
}
</style>

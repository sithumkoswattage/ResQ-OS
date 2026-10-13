<template>
  <div class="incident-details">
    <div class="header">
      <div>
        <p class="eyebrow">Operations</p>
        <h1>Incident Details</h1>
      </div>
      <button class="back-btn" @click="goBack">Back</button>
    </div>

    <div v-if="incident" class="content">
      <section class="summary card">
        <div>
          <p class="label">Incident ID</p>
          <h2>{{ incident.id }}</h2>
        </div>
        <span :class="['status', incident.status.toLowerCase()]">{{ incident.status }}</span>
      </section>

      <section class="details-grid">
        <div class="card">
          <h3>Overview</h3>
          <ul>
            <li><strong>Title:</strong> {{ incident.title }}</li>
            <li><strong>Type:</strong> {{ incident.type }}</li>
            <li><strong>Priority:</strong> {{ incident.priority }}</li>
            <li><strong>Created:</strong> {{ incident.createdAt }}</li>
            <li><strong>Assigned To:</strong> {{ incident.assignedTo }}</li>
          </ul>
        </div>

        <div class="card">
          <h3>Location</h3>
          <p>{{ incident.location }}</p>
        </div>
      </section>

      <section class="card">
        <h3>Description</h3>
        <p>{{ incident.description }}</p>
      </section>
    </div>

    <div v-else class="empty-state">
      Loading incident details...
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const incident = ref(null)

onMounted(() => {
  const incidentId = route.params.id

  incident.value = {
    id: incidentId || 'INC-1024',
    title: 'Vehicle breakdown',
    type: 'Traffic',
    status: 'Open',
    priority: 'High',
    createdAt: '2024-01-15 10:30',
    assignedTo: 'Dispatcher A',
    location: 'Main Street and 4th Avenue',
    description:
      'A vehicle has broken down on the roadside and requires an emergency response team to secure the area and assist the driver.'
  }
})

function goBack() {
  router.back()
}
</script>

<style scoped>
.incident-details {
  padding: 24px;
  color: #1f2937;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6b7280;
}

h1 {
  margin: 0;
  font-size: 2rem;
}

.back-btn {
  border: none;
  border-radius: 8px;
  background: #e5e7eb;
  color: #111827;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 600;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 20px;
}

.summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  margin: 0 0 6px;
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  font-size: 1.75rem;
}

.status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.status.open {
  background: #dcfce7;
  color: #166534;
}

.status.in-progress {
  background: #dbeafe;
  color: #1d4ed8;
}

.status.resolved {
  background: #f3e8ff;
  color: #7c3aed;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 1.1rem;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

li {
  color: #374151;
}

p {
  margin: 0;
  line-height: 1.6;
  color: #374151;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  color: #6b7280;
  background: #f9fafb;
}
</style>

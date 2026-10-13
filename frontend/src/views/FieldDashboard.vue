<template>
  <div class="field-dashboard">
    <header class="topbar">
      <div>
        <p class="eyebrow">Operations</p>
        <h1>Field Dashboard</h1>
      </div>
      <button class="sync-button">Sync Data</button>
    </header>

    <section class="stats-grid">
      <div v-for="stat in stats" :key="stat.label" class="stat-card">
        <span class="label">{{ stat.label }}</span>
        <strong class="value">{{ stat.value }}</strong>
      </div>
    </section>

    <section class="panel">
      <h2>Recent Activity</h2>
      <ul class="activity-list">
        <li v-for="item in activities" :key="item.id">
          <span class="dot"></span>
          <div>
            <p>{{ item.title }}</p>
            <small>{{ item.time }}</small>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script>
export default {
  name: 'FieldDashboard',
  data() {
    return {
      stats: [
        { label: 'Active Fields', value: '24' },
        { label: 'Open Alerts', value: '6' },
        { label: 'Completed Tasks', value: '118' },
        { label: 'Team Online', value: '12' }
      ],
      activities: [
        { id: 1, title: 'Water pump inspected at North Ridge', time: '10 minutes ago' },
        { id: 2, title: 'Safety briefing completed for Crew A', time: '1 hour ago' },
        { id: 3, title: 'New incident reported in Sector 4', time: '2 hours ago' }
      ]
    };
  }
};
</script>

<style scoped>
.field-dashboard {
  padding: 24px;
  background: #f5f7fb;
  min-height: 100vh;
  color: #1f2937;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6b7280;
}

h1 {
  margin: 4px 0 0;
  font-size: 2rem;
}

.sync-button {
  border: none;
  background: #2563eb;
  color: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card,
.panel {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  padding: 20px;
}

.label {
  display: block;
  color: #6b7280;
  margin-bottom: 8px;
}

.value {
  font-size: 1.8rem;
}

.panel h2 {
  margin-top: 0;
  margin-bottom: 16px;
}

.activity-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.activity-list li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #e5e7eb;
}

.activity-list li:last-child {
  border-bottom: none;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  margin-top: 6px;
  flex-shrink: 0;
}

.activity-list p {
  margin: 0 0 4px;
}

.activity-list small {
  color: #6b7280;
}
</style>

<template>
  <aside class="sidebar">
    <div class="logo">
      ResQ-OS
    </div>

    <nav class="sidebar-nav">
      <RouterLink
        to="/dispatcher"
        end
        class="sidebar-link"
      >
        <LayoutDashboard :size="20" />
        <span>Dashboard</span>
      </RouterLink>

      <RouterLink
        to="/dispatcher/incidents"
        class="sidebar-link"
      >
        <Siren :size="20" />
        <span>Incidents</span>
      </RouterLink>

      <RouterLink
        to="/dispatcher/resources"
        class="sidebar-link"
      >
        <Ambulance :size="20" />
        <span>Resources</span>
      </RouterLink>

      <RouterLink
        to="/dispatcher/command-center"
        class="sidebar-link"
      >
        <MapPinned :size="20" />
        <span>Command Center</span>
      </RouterLink>

      <RouterLink
        to="/dispatcher/alerts"
        class="sidebar-link"
      >
        <Bell :size="20" />
        <span>Alerts</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<script setup>
import {
  LayoutDashboard,
  Siren,
  Ambulance,
  MapPinned,
  Bell
} from 'lucide-vue-next'
</script>

<style scoped>

.sidebar {
  box-sizing: border-box;
  width: 250px;
  min-height: 100vh;
  background: #0f172a;
  color: #f8fafc;
}

.logo {
  padding: 24px 20px;
  font-size: 22px;
  font-weight: 700;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 12px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  color: #cbd5e1;
  text-decoration: none;
  transition: background-color 0.2s, color 0.2s;
}

.sidebar-link:hover {
  background-color: #334155;
  color: white;
}

.sidebar-link.router-link-active {
  background-color: #4f46e5;
  color: white;
}

.sidebar-link svg {
  flex-shrink: 0;
}
</style>
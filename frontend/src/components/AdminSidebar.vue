<template>
  <aside class="sidebar">
    <div class="logo">ResQ-OS <small>Admin</small></div>

    <nav class="sidebar-nav">
      <RouterLink to="/admin" end class="sidebar-link"><LayoutDashboard :size="20" /><span>Overview</span></RouterLink>
      <RouterLink to="/admin/users" class="sidebar-link"><Users :size="20" /><span>Accounts</span></RouterLink>
      <RouterLink to="/admin/units" class="sidebar-link"><Ambulance :size="20" /><span>Units</span></RouterLink>
      <RouterLink to="/admin/equipment" class="sidebar-link"><Wrench :size="20" /><span>Equipment</span></RouterLink>
      <RouterLink to="/admin/audit" class="sidebar-link"><ScrollText :size="20" /><span>Activity log</span></RouterLink>

      <div class="divider"></div>
      <RouterLink to="/dispatcher" class="sidebar-link"><MapPinned :size="20" /><span>Dispatcher view</span></RouterLink>
    </nav>
  </aside>
</template>

<script setup>
import { LayoutDashboard, Users, Ambulance, Wrench, ScrollText, MapPinned } from 'lucide-vue-next'
</script>

<style scoped>
.sidebar { box-sizing: border-box; width: 250px; min-height: 100vh; background: #0f172a; color: #f8fafc; }
.logo { padding: 24px 20px; font-size: 22px; font-weight: 700; }
.logo small { margin-left: 6px; border-radius: 6px; padding: 2px 6px; background: #4f46e5; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; vertical-align: middle; }
.sidebar-nav { display: flex; flex-direction: column; gap: 8px; padding: 16px 12px; }
.sidebar-link { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 8px; color: #cbd5e1; text-decoration: none; transition: background-color 0.2s, color 0.2s; }
.sidebar-link:hover { background-color: #334155; color: white; }
.sidebar-link.router-link-active { background-color: #4f46e5; color: white; }
.sidebar-link svg { flex-shrink: 0; }
.divider { height: 1px; margin: 8px 4px; background: #1e293b; }
</style>

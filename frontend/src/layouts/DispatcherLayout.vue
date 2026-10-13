<template>
  <div class="dispatcher-layout">
    <AppSidebar />

    <div class="main-section">
      <AppNavbar />

      <main class="page-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import AppSidebar from '../components/AppSidebar.vue'
import AppNavbar from '../components/AppNavbar.vue'
</script>

<style>
.dispatcher-layout {
  display: flex;
  min-height: 100vh;
  width: 100%;
  background: #f3f4f6;
}

.dispatcher-layout .sidebar {
  width: 250px;
  min-width: 250px;
  min-height: 100vh;
  align-self: stretch;
  background: #0f172a;
  color: #f8fafc;
}

.main-section {
  flex: 1;
  min-width: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-content {
  flex: 1;
  min-width: 0;
  padding: 24px;
  background: #f3f4f6;
}

@media (max-width: 768px) {
  .dispatcher-layout .sidebar {
    width: 190px;
    min-width: 190px;
  }

  .page-content {
    padding: 16px;
  }
}
</style>

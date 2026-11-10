<template>
  <div class="dispatcher-layout">
    <AdminSidebar />

    <div class="main-section">
      <AppNavbar title="Administration" />

      <main class="page-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import AdminSidebar from '../components/AdminSidebar.vue'
import AppNavbar from '../components/AppNavbar.vue'
import '../styles/console.css'
</script>

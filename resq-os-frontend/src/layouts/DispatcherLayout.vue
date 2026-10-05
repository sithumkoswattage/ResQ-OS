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
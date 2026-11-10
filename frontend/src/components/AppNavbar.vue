<template>
  <header class="navbar">

    <div>
      <h2>{{ title }}</h2>
    </div>

    <div class="user-info">
      <span>{{ username || roleLabel }}</span>
      <button type="button" @click="handleLogout" class="logout-btn">
        Sign Out
      </button>
    </div>

  </header>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { clearSession } from '../services/session'

const router = useRouter()
const username = ref('')
const roleLabel = ref('')

onMounted(() => {
  const user = getUser()
  username.value = user?.username || ''
  roleLabel.value = user?.role === 'admin' ? 'Administrator' : 'Dispatcher'
})

const handleLogout = () => {
  clearSession()
  router.push('/')
}
</script>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.logout-btn {
  background: rgba(225, 29, 72, 0.2);
  color: #fda4af;
  border: 1px solid rgba(225, 29, 72, 0.4);
  padding: 0.35rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}
.logout-btn:hover {
  background: rgba(225, 29, 72, 0.35);
  color: #fff;
}
</style>
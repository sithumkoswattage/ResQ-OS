<template>
  <header class="navbar">

    <div>
      <h2>Emergency Command Center</h2>
    </div>

    <div class="user-info">
      <span>{{ username || 'Dispatcher' }}</span>
      <button type="button" @click="handleLogout" class="logout-btn">
        Sign Out
      </button>
    </div>

  </header>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')

onMounted(() => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      username.value = user.username || ''
    } catch {
      // ignore
    }
  }
})

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
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
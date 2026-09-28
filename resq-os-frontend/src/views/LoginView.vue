<template>
  <div class="login-page">

    <div class="login-container">

      <div class="login-header">
        <h1>ResQ-OS</h1>
        <p>Emergency Response & Resource Dispatch</p>
      </div>

      <div class="login-card">

        <h2>Welcome Back</h2>
        <p class="login-subtitle">
          Sign in to access the emergency response system
        </p>

        <form @submit.prevent="handleLogin">

          <div class="form-group">
            <label for="role">Login As</label>

            <select id="role" v-model="role">
              <option value="dispatcher">Dispatcher</option>
              <option value="field">Field Unit</option>
            </select>
          </div>

          <div class="form-group">
            <label for="username">Username</label>

            <input
              id="username"
              v-model="username"
              type="text"
              placeholder="Enter your username"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>

            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="Enter your password"
            />
          </div>

          <div class="login-options">

            <label class="remember">
              <input
                type="checkbox"
                v-model="rememberMe"
              />

              <span>Remember me</span>
            </label>

            <a href="#" @click.prevent>
              Forgot password?
            </a>

          </div>

          <button type="submit">
            Login
          </button>

        </form>

      </div>

      <p class="login-footer">
        ResQ-OS Emergency Response Platform
      </p>

    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'

const username = ref('')
const password = ref('')
const rememberMe = ref(false)
const role = ref('dispatcher')

const handleLogin = () => {
  const handleLogin = () => {
  if (role.value === 'dispatcher') {
    console.log('Dispatcher login')
  } else {
    console.log('Field unit login')
  }
}
}
</script>
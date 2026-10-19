<template>
  <div class="min-h-screen w-full relative overflow-hidden flex items-center justify-center lg:justify-end px-6 py-12 sm:px-12 lg:pr-[10%] text-slate-200">
    <!-- Background Layer 1: Dispatcher (Command Center) -->
    <div
      class="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-out pointer-events-none transform"
      :class="role === 'dispatcher' ? 'opacity-100 scale-100' : 'opacity-0 scale-105'"
      :style="{ backgroundImage: `url('${loginBg}')` }"
    ></div>

    <!-- Background Layer 2: Field Unit (Emergency Operations) -->
    <div
      class="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-out pointer-events-none transform"
      :class="role === 'responder' ? 'opacity-100 scale-100' : 'opacity-0 scale-105'"
      :style="{ backgroundImage: `url('${fieldBg}')` }"
    ></div>

    <!-- Dynamic Atmospheric Vignette & Tone Shifting -->
    <div
      class="absolute inset-0 transition-colors duration-1000 pointer-events-none"
      :class="role === 'dispatcher' ? 'bg-[#0d1322]/35' : 'bg-[#1a0709]/45'"
    ></div>
    <div class="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/40 pointer-events-none"></div>

    <!-- The form wrapper -->
    <main class="relative z-10 w-full max-w-120">

      <!-- Logo -->
      <div class="flex items-center gap-3 mb-7 px-2">
        <div
          class="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500"
          :class="role === 'dispatcher'
            ? 'bg-linear-to-br from-rose-600 to-orange-600 shadow-rose-900/40'
            : 'bg-linear-to-br from-amber-600 to-rose-600 shadow-amber-900/40'"
        >
          <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        <div>
          <h2 class="text-3xl font-extrabold tracking-tight text-white leading-none">
            ResQ<span class="transition-colors duration-500" :class="role === 'dispatcher' ? 'text-rose-600' : 'text-amber-500'">-OS</span>
          </h2>
          <p class="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Emergency Response & Resource Dispatch Platform
          </p>
        </div>
      </div>

      <!-- The Frosted Glass Box -->
      <div
        class="relative w-full rounded-[26px] bg-[#0d1322]/60 backdrop-blur-xl border border-white/12 shadow-[0_24px_60px_rgba(0,0,0,0.50)] p-7 sm:p-9 overflow-hidden transition-all duration-500"
      >
        <!-- Glass highlight -->
        <div class="absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-white/25 to-transparent"></div>

        <h2 class="text-3xl font-bold tracking-tight text-white">Sign in to ResQ-OS</h2>
        <div class="mt-2 text-sm text-slate-300 flex items-center gap-2">
          <span
            class="inline-block w-2 h-2 rounded-full animate-ping"
            :class="role === 'dispatcher' ? 'bg-emerald-400' : 'bg-amber-400'"
          ></span>
          <span class="font-medium">
            {{ role === 'dispatcher' ? 'Access Emergency Command Center' : 'Access Tactical Mobile Field Operations' }}
          </span>
        </div>

        <form class="mt-5 space-y-4" @submit.prevent="handleLogin">
          <!-- Fluid Segmented Role Tabs -->
          <div class="relative rounded-2xl border border-white/12 bg-black/40 backdrop-blur-md p-1.5 overflow-hidden">
            <!-- Animated sliding pill indicator -->
            <div
              class="absolute top-1.5 bottom-1.5 rounded-xl transition-all duration-300 ease-out shadow-lg"
              :class="role === 'dispatcher'
                ? 'left-1.5 w-[calc(50%-6px)] bg-linear-to-r from-rose-600 to-orange-600 shadow-rose-950/60 border border-white/20'
                : 'left-[calc(50%+3px)] w-[calc(50%-9px)] bg-linear-to-r from-amber-600 to-rose-600 shadow-amber-950/60 border border-white/20'"
            ></div>

            <div class="relative z-10 flex">
              <button
                v-for="r in roles"
                :key="r.value"
                type="button"
                @click="setRole(r.value)"
                class="flex-1 flex items-center justify-center gap-2.5 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer select-none rounded-xl"
                :class="role === r.value ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'"
              >
                <svg
                  class="w-5 h-5 transition-transform duration-300"
                  :class="role === r.value ? 'scale-110 drop-shadow' : 'scale-95 opacity-70'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  v-html="r.icon"
                ></svg>
                <span>{{ r.label }}</span>
              </button>
            </div>
          </div>

          <!-- Operator ID -->
          <div class="relative">
            <input
              v-model="username"
              type="text"
              autocomplete="username"
              placeholder="Operator ID / Email address"
              required
              class="w-full h-14.5 rounded-2xl
                    border border-white/12
                    bg-black/20
                    focus:bg-black/30
                    pl-4 pr-12
                    text-base text-white
                    placeholder-slate-400
                    outline-none
                    transition-all
                    focus:border-rose-500
                    focus:ring-4 focus:ring-rose-500/15"
            />
            <svg class="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </div>

          <!-- Password -->
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="Password"
              required
              class="w-full h-14.5 rounded-2xl
                  border border-white/12
                  bg-black/20
                  focus:bg-black/30
                  pl-4 pr-12
                  text-base text-white
                  placeholder-slate-400
                  outline-none
                  transition-all
                  focus:border-rose-500
                  focus:ring-4 focus:ring-rose-500/15"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
            >
              <svg v-if="!showPassword" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
                <path d="M3 3l18 18" />
              </svg>
            </button>
          </div>

          <div
            v-if="route.query.redirect"
            class="rounded-xl border border-sky-500/30 bg-sky-950/30 px-4 py-3 text-sm text-sky-100"
            role="status"
          >
            Sign in with a dispatcher account to access the command center.
          </div>

          <!-- Error Message Alert -->
          <div
            v-if="errorMessage"
            class="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200 flex items-center gap-2"
            role="alert"
          >
            <svg class="w-5 h-5 shrink-0 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Options -->
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-3 cursor-pointer group">
              <input
                v-model="rememberMe"
                type="checkbox"
                class="w-6 h-6 rounded-md border-2 border-slate-600 bg-transparent accent-rose-600 cursor-pointer"
              />
              <span class="text-base text-slate-400 group-hover:text-slate-200 transition-colors">Remember Me</span>
            </label>
            <a href="#" class="text-base font-semibold text-rose-600 hover:text-rose-400 transition-colors">
              Forgot Password?
            </a>
          </div>

          <!-- Submit Button with Dynamic Theme -->
          <button
            type="submit"
            :disabled="isSubmitting"
            class="w-full h-14.5 rounded-xl text-base font-bold text-white flex items-center justify-center gap-3 shadow-lg transition-all duration-300 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            :class="role === 'dispatcher'
              ? 'bg-linear-to-r from-rose-600 to-orange-600 shadow-rose-900/35 hover:shadow-rose-600/30'
              : 'bg-linear-to-r from-amber-600 to-rose-600 shadow-amber-900/35 hover:shadow-amber-600/30'"
          >
            <span>{{ isSubmitting ? 'Authenticating...' : (role === 'dispatcher' ? 'Sign in to Command Center' : 'Sign in to Field Operations') }}</span>
            <svg v-if="!isSubmitting" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
            <svg v-else class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
          </button>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import loginBg from '../assets/login-bg.jpg'
import fieldBg from '../assets/field-bg.jpg'

const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const role = ref('dispatcher')
const rememberMe = ref(false)
const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

const setRole = (newRole) => {
  role.value = newRole
  errorMessage.value = ''
}

const roles = [
  {
    value: 'dispatcher',
    label: 'Dispatcher',
    icon: '<path d="M4 4h16v12H4z"/><path d="M8 20h8"/><path d="M12 16v4"/>'
  },
  {
    value: 'responder',
    label: 'Field Unit',
    icon: '<path d="M5 11h14v8H5z"/><path d="M7 11V7h10v4"/><circle cx="8" cy="19" r="1.5"/><circle cx="16" cy="19" r="1.5"/>'
  }
]

const handleLogin = async () => {
  errorMessage.value = ''
  if (!username.value.trim() || !password.value) {
    errorMessage.value = 'Please enter your Operator ID/Email and Password.'
    return
  }

  isSubmitting.value = true
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: username.value.trim(),
        password: password.value,
        role: role.value
      })
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Sign in failed. Please check your credentials.')
    }

    const storage = rememberMe.value ? localStorage : sessionStorage
    storage.setItem('token', data.token)
    storage.setItem('user', JSON.stringify(data.user || { username: data.username, role: data.role }))

    const userRole = data.user?.role ?? data.role ?? role.value

    if (userRole === 'dispatcher') {
      const redirect = route.query.redirect
      const target = typeof redirect === 'string' &&
        (redirect === '/dispatcher' || redirect.startsWith('/dispatcher/'))
        ? redirect
        : '/dispatcher'

      await router.push(target)
    } else if (userRole === 'responder') {
      errorMessage.value = 'Field responder portal is currently undergoing scheduled maintenance.'
    } else {
      await router.push('/dispatcher')
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Unable to connect to the server.'
  } finally {
    isSubmitting.value = false
  }
}
</script>
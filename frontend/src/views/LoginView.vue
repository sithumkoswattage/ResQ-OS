<template>
  <div class="min-h-screen w-full relative overflow-hidden flex items-center justify-center lg:justify-end px-6 py-12 sm:px-12 lg:pr-[10%] text-slate-200">
    <!-- Background -->
    <div
      class="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
      :style="{ backgroundImage: `url('${loginBg}')` }"
    ></div>

    <!-- Dynamic Atmospheric Vignette & Tone Shifting -->
    <div
      class="absolute inset-0 bg-[#0d1322]/35 pointer-events-none"
    ></div>
    <div class="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/40 pointer-events-none"></div>

    <!-- The form wrapper -->
    <main class="relative z-10 w-full max-w-120">

      <!-- Logo -->
      <div class="flex items-center gap-3 mb-7 px-2">
        <div
          class="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg bg-linear-to-br from-rose-600 to-orange-600 shadow-rose-900/40"
        >
          <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        <div>
          <h2 class="text-3xl font-extrabold tracking-tight text-white leading-none">
            ResQ<span class="text-rose-600">-OS</span>
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
          <span class="inline-block w-2 h-2 rounded-full animate-ping bg-emerald-400"></span>
          <span class="font-medium">Secure access for dispatch, field and administration teams</span>
        </div>

        <form class="mt-5 space-y-4" @submit.prevent="handleLogin">
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
            v-if="sessionNotice"
            class="rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100"
            role="status"
          >
            {{ sessionNotice }}
          </div>

          <div
            v-else-if="route.query.redirect"
            class="rounded-xl border border-sky-500/30 bg-sky-950/30 px-4 py-3 text-sm text-sky-100"
            role="status"
          >
            {{ String(route.query.redirect).startsWith('/field')
              ? 'Sign in with your field unit account to continue.'
              : 'Your session has ended. Sign in again to continue.' }}
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
            class="w-full h-14.5 rounded-xl text-base font-bold text-white flex items-center justify-center gap-3 shadow-lg transition-all duration-300 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed bg-linear-to-r from-rose-600 to-orange-600 shadow-rose-900/35 hover:shadow-rose-600/30"
          >
            <span>{{ isSubmitting ? 'Authenticating...' : 'Sign in' }}</span>
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
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import loginBg from '../assets/login-bg.jpg'
import fieldBg from '../assets/field-bg.jpg'
import api from '../services/api'
import { clearSession, getRole, homeFor } from '../services/session'

const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

// Shown after the app signed you out (expired session or suspended account).
const sessionNotice = computed(() => ({
  expired: 'Your session expired. Please sign in again.',
  suspended: 'This account has been suspended. Please contact an administrator.'
}[route.query.reason] || ''))

const handleLogin = async () => {
  errorMessage.value = ''
  if (!username.value.trim() || !password.value) {
    errorMessage.value = 'Please enter your Operator ID/Email and Password.'
    return
  }

  isSubmitting.value = true
  try {
    const { data } = await api.post('/auth/login', {
      identifier: username.value.trim(),
      password: password.value
    })

    clearSession()
    const storage = rememberMe.value ? localStorage : sessionStorage
    storage.setItem('token', data.token)
    storage.setItem('user', JSON.stringify(data.user || { username: data.username, role: data.role }))

    const home = homeFor(getRole())
    const redirect = route.query.redirect
    const target = typeof redirect === 'string' &&
      (redirect === home || redirect.startsWith(`${home}/`))
      ? redirect
      : home

    await router.push(target)
  } catch (err) {
    if (err.response?.status === 429) {
      errorMessage.value = err.response.data?.message || 'Too many sign-in attempts. Please wait and try again.'
    } else if (err.response) {
      errorMessage.value = err.response.data?.message || err.response.data?.error || 'Sign in failed. Please check your credentials.'
    } else {
      errorMessage.value = 'Unable to connect to the server.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>
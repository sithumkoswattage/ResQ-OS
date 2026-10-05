<template>
    <div 
      class="min-h-screen w-full relative bg-cover bg-center bg-no-repeat flex items-center justify-center lg:justify-end px-6 py-12 sm:px-12 lg:pr-[10%] text-slate-200"
      :style="{ backgroundImage: `url('${loginBg}')` }"
    >
      <!-- Optional slight dark tint over the image -->
      <div class="absolute inset-0 bg-[#0d1322]/20 pointer-events-none"></div>

      <!-- The form wrapper -->
      <main class="relative z-10 w-full max-w-[480px]">

        <!-- Logo -->
        <div class="flex items-center gap-3 mb-7 px-2">

          <div
            class="w-14 h-14 rounded-xl
                  bg-gradient-to-br from-rose-600 to-orange-600
                  flex items-center justify-center
                  shadow-lg shadow-rose-900/40"
          >
            <!-- SVG -->
          </div>

          <div>
            <h2 class="text-3xl font-extrabold tracking-tight text-white leading-none">
              ResQ<span class="text-rose-600">-OS</span>
            </h2>

            <p class="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-870">
              Emergency Response & Resource Dispatch Platform
            </p>
          </div>

        </div>

        
        <!-- The Frosted Glass Box -->
        <div
          class="relative w-full rounded-[26px]
                bg-[#0d1322]/55
                backdrop-blur-xl
                border border-white/[0.12]
                shadow-[0_24px_60px_rgba(0,0,0,0.40)]
                p-7 sm:p-9
                overflow-hidden"
        >

        <!-- Glass highlight -->
        <div
          class="absolute inset-x-6 top-0 h-px
                bg-gradient-to-r
                from-transparent
                via-white/20
                to-transparent"
        ></div>

        <!-- Mobile-only logo -->
        <div class="lg:hidden flex items-center gap-3 mb-10">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-600 to-orange-600 flex items-center justify-center">
            <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <span class="text-2xl font-extrabold text-white">ResQ<span class="text-rose-600">-OS</span></span>
        </div>

        <h2 class="text-3xl font-bold tracking-tight text-white">Sign in to ResQ-OS</h2>
        <p class="mt-2 text-lg text-slate-400">Access the Emergency Response Command Center</p>

        <form class="mt-5 space-y-4" @submit.prevent="handleLogin">

          <!-- Role tabs -->
          <div class="flex gap-1 rounded-2xl border border-white/[0.10] bg-black/20 backdrop-blur-md p-1.5">
            <button
              v-for="r in roles"
              :key="r.value"
              type="button"
              @click="role = r.value"
              :class="[
                'flex-1 flex items-center justify-center gap-2.5 rounded-xl border py-2.5 text-sm font-semibold transition-all duration-200',
                role === r.value
                ? 'bg-white/[0.10] border-white/[0.20] text-white shadow-lg shadow-black/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
              ]"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="r.icon"></svg>
              <span>{{ r.label }}</span>
            </button>
          </div>

          <!-- Email -->
          <div class="relative">
            <input
              v-model="username"
              type="email"
              autocomplete="email"
              placeholder="Email address"
              required
              class="w-full h-[58px] rounded-2xl
                    border border-white/[0.12]
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
              class="w-full h-[58px] rounded-2xl
                  border border-white/[0.12]
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

          <p v-if="errorMessage" class="text-sm text-rose-300" role="alert">
            {{ errorMessage }}
          </p>

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

          <!-- Submit -->
          <button
            type="submit"
            :disabled="isSubmitting"
            class="w-full h-[58px] rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 text-base font-bold text-white flex items-center justify-center gap-3 shadow-lg shadow-rose-900/30 transition-all duration-300 hover:brightness-110 hover:shadow-rose-600/30 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70">
            <span>{{ isSubmitting ? 'Signing in...' : 'Sign In' }}</span>
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import loginBg from '../assets/login-bg.jpg'

const router = useRouter()
const username = ref('')
const password = ref('')
const role = ref('dispatcher')
const rememberMe = ref(false)
const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

const roles = [
  {
    value: 'dispatcher',
    label: 'Dispatcher',
    icon: '<path d="M4 4h16v12H4z"/><path d="M8 20h8"/><path d="M12 16v4"/>'
  },
  {
    value: 'field',
    label: 'Field Unit',
    icon: '<path d="M5 11h14v8H5z"/><path d="M7 11V7h10v4"/><circle cx="8" cy="19" r="1.5"/><circle cx="16" cy="19" r="1.5"/>'
  }
]

const handleLogin = async () => {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username.value, password: password.value }),
    })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Unable to sign in.')
    }
    if (data.role !== role.value) {
      throw new Error('This account does not have the selected role.')
    }
    if (data.role !== 'dispatcher') {
      throw new Error('Field unit access is not available yet.')
    }

    sessionStorage.setItem('token', data.token)
    await router.push('/dispatcher')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to sign in.'
  } finally {
    isSubmitting.value = false
  }
}
</script>
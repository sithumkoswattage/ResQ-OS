import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/Dispatcher/DashboardView.vue'
import DispatcherLayout from '../layouts/DispatcherLayout.vue'

const routes = [
  {
    path: '/',
    name: 'login',
    component: LoginView
  },

  {
    path: '/dispatcher',
    component: DispatcherLayout,

    children: [
      {
        path: '',
        name: 'dispatcher',
        component: DashboardView
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')

  if (to.path.startsWith('/dispatcher') && !token) {
    next({ name: 'login' })
  } else if (to.path === '/' && token) {
    // If already logged in and visiting login page, redirect to dashboard
    next({ name: 'dispatcher' })
  } else {
    next()
  }
})

export default router
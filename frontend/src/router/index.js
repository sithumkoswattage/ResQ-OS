import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DispatcherDashboardView.vue'
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

export default router

/*
router.beforeEach((to, from, next) => {
  const publicPages = ['/', '/login']
  const authRequired = !publicPages.includes(to.path)
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')

  if (authRequired && !token) {
    return next('/')
  }
  next()
})
  */
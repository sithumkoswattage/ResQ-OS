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

export default router
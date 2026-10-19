
import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import DispatcherLayout from '../layouts/DispatcherLayout.vue'
import DashboardView from '../views/DispatcherDashboardView.vue'
import IncidentsView from '../views/IncidentsView.vue'
import IncidentDetailsView from '../views/IncidentDetailsView.vue'
import ResourcesView from '../views/ResourcesView.vue'
import CommandCenterView from '../views/CommandCenterView.vue'

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
      },
      {
        path: 'incidents',
        name: 'incidents',
        component: IncidentsView
      },
      {
        path: 'incidents/:id',
        name: 'incident-details',
        component: IncidentDetailsView
      },
      {
        path: 'resources',
        name: 'resources',
        component: ResourcesView
      },
      {
        path: 'command-center',
        name: 'command-center',
        component: CommandCenterView
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
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.path === '/' && token) {
    next({ name: 'dispatcher' })
  } else {
    next()
  }
})

export default router

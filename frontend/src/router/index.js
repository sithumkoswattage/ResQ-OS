
import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import DispatcherLayout from '../layouts/DispatcherLayout.vue'
import DashboardView from '../views/DispatcherDashboardView.vue'
import IncidentsView from '../views/IncidentsView.vue'
import IncidentDetailsView from '../views/IncidentDetailsView.vue'
import ResourcesView from '../views/ResourcesView.vue'

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
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

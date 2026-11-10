import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import DispatcherLayout from '../layouts/DispatcherLayout.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import DashboardView from '../views/DispatcherDashboardView.vue'
import IncidentsView from '../views/IncidentsView.vue'
import IncidentDetailsView from '../views/IncidentDetailsView.vue'
import ResourcesView from '../views/ResourcesView.vue'
import CommandCenterView from '../views/CommandCenterView.vue'
import AlertsView from '../views/AlertsView.vue'
import FieldDashboard from '../views/FieldDashboard.vue'
import { clearSession, getRole, getToken, homeFor } from '../services/session'

const routes = [
  {
    path: '/',
    name: 'login',
    component: LoginView
  },
  {
    path: '/dispatcher',
    component: DispatcherLayout,
    meta: { role: 'dispatcher' },
    children: [
      { path: '', name: 'dispatcher', component: DashboardView },
      { path: 'incidents', name: 'incidents', component: IncidentsView },
      { path: 'incidents/:id', name: 'incident-details', component: IncidentDetailsView },
      { path: 'resources', name: 'resources', component: ResourcesView },
      { path: 'command-center', name: 'command-center', component: CommandCenterView },
      { path: 'alerts', name: 'alerts', component: AlertsView }
    ]
  },
  {
    path: '/field',
    name: 'field',
    component: FieldDashboard,
    meta: { role: 'responder' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const token = getToken()
  const role = getRole()
  const requiredRole = to.matched.find((record) => record.meta.role)?.meta.role

  if (requiredRole) {
    if (!token || !role) {
      clearSession()
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (role !== requiredRole) return homeFor(role)
  } else if (to.name === 'login' && token && role) {
    return homeFor(role)
  }
  return true
})

export default router

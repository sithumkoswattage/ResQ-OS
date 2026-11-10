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
import AdminOverviewView from '../views/admin/AdminOverviewView.vue'
import AdminUsersView from '../views/admin/AdminUsersView.vue'
import AdminUnitsView from '../views/admin/AdminUnitsView.vue'
import AdminEquipmentView from '../views/admin/AdminEquipmentView.vue'
import AdminAuditView from '../views/admin/AdminAuditView.vue'
import { getRole, getToken, homeFor } from '../services/session'

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
      { path: '', name: 'dispatcher', component: DashboardView },
      { path: 'incidents', name: 'incidents', component: IncidentsView },
      { path: 'incidents/:id', name: 'incident-details', component: IncidentDetailsView },
      { path: 'resources', name: 'resources', component: ResourcesView },
      { path: 'command-center', name: 'command-center', component: CommandCenterView },
      { path: 'alerts', name: 'alerts', component: AlertsView }
    ]
  },
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      { path: '', name: 'admin', component: AdminOverviewView },
      { path: 'users', name: 'admin-users', component: AdminUsersView },
      { path: 'units', name: 'admin-units', component: AdminUnitsView },
      { path: 'equipment', name: 'admin-equipment', component: AdminEquipmentView },
      { path: 'audit', name: 'admin-audit', component: AdminAuditView }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Dispatcher pages: dispatchers and admins. Admin pages: admins only.
router.beforeEach((to) => {
  const token = getToken()
  const role = getRole()
  const inAdmin = to.path === '/admin' || to.path.startsWith('/admin/')
  const inDispatcher = to.path === '/dispatcher' || to.path.startsWith('/dispatcher/')

  if ((inAdmin || inDispatcher) && !token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (inAdmin && role !== 'admin') {
    return role === 'dispatcher' ? { name: 'dispatcher' } : { name: 'login' }
  }
  if (inDispatcher && role !== 'dispatcher' && role !== 'admin') {
    return { name: 'login' }
  }
  if (to.path === '/' && token && homeFor(role) !== '/') {
    return homeFor(role)
  }
  return true
})

export default router

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
import AdminOverviewView from '../views/admin/AdminOverviewView.vue'
import AdminUsersView from '../views/admin/AdminUsersView.vue'
import AdminUnitsView from '../views/admin/AdminUnitsView.vue'
import AdminAuditView from '../views/admin/AdminAuditView.vue'
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
    meta: { roles: ['dispatcher', 'admin'] },
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
    meta: { roles: ['admin'] },
    children: [
      { path: '', name: 'admin', component: AdminOverviewView },
      { path: 'users', name: 'admin-users', component: AdminUsersView },
      { path: 'units', name: 'admin-units', component: AdminUnitsView },
      { path: 'audit', name: 'admin-audit', component: AdminAuditView }
    ]
  },
  {
    path: '/field',
    name: 'field',
    component: FieldDashboard,
    meta: { roles: ['responder'] }
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
  const allowed = to.matched.find((record) => record.meta.roles)?.meta.roles

  if (allowed) {
    if (!token || !role) {
      clearSession()
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (!allowed.includes(role)) return homeFor(role)
  } else if (to.name === 'login' && token && role) {
    return homeFor(role)
  }
  return true
})

export default router

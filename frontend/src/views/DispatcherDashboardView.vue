<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            ResQ-OS
          </h1>
          <p class="text-sm text-gray-500">
            Emergency Response Command Center
          </p>
        </div>

        <div class="flex items-center gap-4">
          <button
            class="relative rounded-full p-2 text-gray-500 hover:bg-gray-100"
          >
            🔔
            <span
              class="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"
            ></span>
          </button>

          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 font-semibold text-white"
            >
              D
            </div>

            <div>
              <p class="text-sm font-semibold text-gray-900">
                Dispatcher
              </p>
              <p class="text-xs text-gray-500">
                Command Center
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="p-6">

      <!-- Welcome -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900">
          Good morning, Dispatcher
        </h2>
        <p class="mt-1 text-gray-500">
          Here's the current emergency response situation.
        </p>
      </div>

      <!-- Statistics -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div
          class="rounded-xl bg-white p-5 shadow-sm border border-gray-200"
        >
          <p class="text-sm text-gray-500">Active Incidents</p>
          <p class="mt-2 text-3xl font-bold text-gray-900">
            {{ stats.active }}
          </p>
          <p class="mt-1 text-sm text-red-500">
            Currently active
          </p>
        </div>

        <div
          class="rounded-xl bg-white p-5 shadow-sm border border-gray-200"
        >
          <p class="text-sm text-gray-500">Critical Incidents</p>
          <p class="mt-2 text-3xl font-bold text-red-600">
            {{ stats.critical }}
          </p>
          <p class="mt-1 text-sm text-gray-500">
            Require immediate attention
          </p>
        </div>

        <div
          class="rounded-xl bg-white p-5 shadow-sm border border-gray-200"
        >
          <p class="text-sm text-gray-500">Pending</p>
          <p class="mt-2 text-3xl font-bold text-yellow-600">
            {{ stats.pending }}
          </p>
          <p class="mt-1 text-sm text-gray-500">
            Awaiting response
          </p>
        </div>

        <div
          class="rounded-xl bg-white p-5 shadow-sm border border-gray-200"
        >
          <p class="text-sm text-gray-500">Resolved Today</p>
          <p class="mt-2 text-3xl font-bold text-green-600">
            {{ stats.resolved }}
          </p>
          <p class="mt-1 text-sm text-gray-500">
            Successfully handled
          </p>
        </div>

      </div>

      <!-- Dashboard Grid -->
      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

        <!-- Recent Incidents -->
        <div
          class="rounded-xl bg-white shadow-sm border border-gray-200 lg:col-span-2"
        >
          <div
            class="flex items-center justify-between border-b border-gray-200 px-5 py-4"
          >
            <div>
              <h3 class="font-semibold text-gray-900">
                Recent Incidents
              </h3>
              <p class="text-sm text-gray-500">
                Latest emergency reports
              </p>
            </div>

            <button
              class="text-sm font-medium text-violet-600 hover:text-violet-800"
            >
              View All
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th class="px-5 py-3">Incident</th>
                  <th class="px-5 py-3">Location</th>
                  <th class="px-5 py-3">Priority</th>
                  <th class="px-5 py-3">Status</th>
                </tr>
              </thead>

              <tbody class="divide-y divide-gray-100">
                <tr
                  v-for="incident in incidents"
                  :key="incident.id"
                  class="hover:bg-gray-50"
                >
                  <td class="px-5 py-4">
                    <p class="font-medium text-gray-900">
                      {{ incident.type }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ incident.id }}
                    </p>
                  </td>

                  <td class="px-5 py-4 text-gray-600">
                    {{ incident.location }}
                  </td>

                  <td class="px-5 py-4">
                    <span
                      class="rounded-full px-2.5 py-1 text-xs font-medium"
                      :class="priorityClass(incident.priority)"
                    >
                      {{ incident.priority }}
                    </span>
                  </td>

                  <td class="px-5 py-4">
                    <span
                      class="rounded-full px-2.5 py-1 text-xs font-medium"
                      :class="statusClass(incident.status)"
                    >
                      {{ incident.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Resources -->
        <div
          class="rounded-xl bg-white shadow-sm border border-gray-200"
        >
          <div class="border-b border-gray-200 px-5 py-4">
            <h3 class="font-semibold text-gray-900">
              Resource Status
            </h3>
            <p class="text-sm text-gray-500">
              Available response units
            </p>
          </div>

          <div class="space-y-4 p-5">
            <div
              v-for="resource in resources"
              :key="resource.name"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100"
                >
                  {{ resource.icon }}
                </div>

                <div>
                  <p class="font-medium text-gray-900">
                    {{ resource.name }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ resource.available }} available
                  </p>
                </div>
              </div>

              <span
                class="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
              >
                Available
              </span>
            </div>
          </div>
        </div>

      </div>

    </main>
  </div>
</template>

<script setup>
const stats = {
  active: 12,
  critical: 4,
  pending: 6,
  resolved: 18
}

const incidents = [
  {
    id: 'INC-001',
    type: 'Road Accident',
    location: 'Colombo Fort',
    priority: 'Critical',
    status: 'Responding'
  },
  {
    id: 'INC-002',
    type: 'Medical Emergency',
    location: 'Bambalapitiya',
    priority: 'High',
    status: 'Pending'
  },
  {
    id: 'INC-003',
    type: 'Fire',
    location: 'Dehiwala',
    priority: 'Critical',
    status: 'Responding'
  },
  {
    id: 'INC-004',
    type: 'Flooding',
    location: 'Wellawatte',
    priority: 'Medium',
    status: 'Pending'
  }
]

const resources = [
  {
    name: 'Ambulances',
    available: 4,
    icon: '🚑'
  },
  {
    name: 'Fire Units',
    available: 2,
    icon: '🚒'
  },
  {
    name: 'Police Units',
    available: 5,
    icon: '🚓'
  },
  {
    name: 'Rescue Teams',
    available: 3,
    icon: '🛟'
  }
]

function priorityClass(priority) {
  if (priority === 'Critical') {
    return 'bg-red-100 text-red-700'
  }

  if (priority === 'High') {
    return 'bg-orange-100 text-orange-700'
  }

  return 'bg-yellow-100 text-yellow-700'
}

function statusClass(status) {
  if (status === 'Responding') {
    return 'bg-blue-100 text-blue-700'
  }

  if (status === 'Resolved') {
    return 'bg-green-100 text-green-700'
  }

  return 'bg-gray-100 text-gray-700'
}
</script>
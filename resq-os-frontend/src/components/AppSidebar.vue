<template>
  <aside class="sidebar">

    <div class="logo">
      ResQ-OS
    </div>

    <nav>

      <RouterLink to="/dispatcher">
        Dashboard
      </RouterLink>

      <RouterLink to="/dispatcher/incidents">
        Incidents
      </RouterLink>

      <RouterLink to="/dispatcher/resources">
        Resources
      </RouterLink>

      <RouterLink to="/dispatcher/command-center">
        Command Center
      </RouterLink>

      <RouterLink to="/dispatcher/alerts">
        Alerts
      </RouterLink>

    </nav>

  </aside>
</template>
# ResQ-OS
Emergency Response and Resource Dispatch Platform

## Dispatcher resources and Command Center

The dispatcher Resources, Incidents, and Command Center pages use the authenticated backend API and MongoDB. Start the backend with `npm start` from `backend` and the frontend with `npm run dev` from `frontend`. Configure the backend's `MONGO_URI` and `JWT_SECRET`; the frontend API defaults to `http://localhost:5000/api` and can be overridden with `VITE_API_URL`.

Dispatcher API endpoints (all require a dispatcher bearer token):

- `GET /api/command-center/overview` returns active incidents, resource positions, and availability totals.
- `GET|POST /api/incidents` lists incidents or creates one. `GET /api/incidents/:id` reads a single incident; `PATCH /api/incidents/:id` updates it. Resolving an incident releases its assigned resources.
- `GET|POST /api/resources` lists or creates response units. `PATCH /api/resources/:id` updates an unassigned unit, `PATCH /api/resources/:id/assignment` dispatches or releases it, and `DELETE /api/resources/:id` removes an unassigned unit.

Incidents and resources require latitude and longitude in decimal degrees so they can be plotted. The Command Center map uses OpenStreetMap tiles and needs an internet connection to display the map background.

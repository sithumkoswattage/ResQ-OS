# ResQ-OS
Emergency Response and Resource Dispatch Platform

## Dispatcher resources and Command Center

The dispatcher Resources, Incidents, and Command Center pages use the authenticated backend API and MongoDB. Start the backend with `npm start` from `backend` and the frontend with `npm run dev` from `frontend`. Configure the backend's `MONGO_URI` and `JWT_SECRET`; the frontend API defaults to `http://localhost:5000/api` and can be overridden with `VITE_API_URL`.

## Account registration

`POST /api/auth/register` is public and can create responder accounts only. Attempts to submit another role, including `dispatcher`, are rejected. There are no default credentials. A trusted administrator can provision a dispatcher account by running `node createDispatcher.js` from `backend`; the script hashes the password before saving it.

Dispatcher API endpoints (all require a dispatcher bearer token):

- `GET /api/command-center/overview` returns active incidents, resource positions, and availability totals.
- `GET|POST /api/incidents` lists incidents or creates one. `GET /api/incidents/:id` reads a single incident; `PATCH /api/incidents/:id` updates it. Resolving an incident releases its assigned resources.
- `GET|POST /api/resources` lists or creates response units. `PATCH /api/resources/:id` updates an unassigned unit, `PATCH /api/resources/:id/assignment` dispatches or releases it, and `DELETE /api/resources/:id` removes an unassigned unit.
- `GET /api/alerts?status=all|read|unread&category=all|incidents|resources` lists the current dispatcher’s alerts. `PATCH /api/alerts/:id/read` acknowledges an alert; `PATCH /api/alerts/read-all` marks all current alerts read. Incident and resource changes generate alerts automatically, and the current state of existing records is added to the feed once when the backend starts for the first time.

Incidents and resources require latitude and longitude in decimal degrees so they can be plotted. The Command Center map uses OpenStreetMap tiles and needs an internet connection to display the map background.

### Load initial sample records

For a local development database, run `npm run seed:initial` from `backend` to populate the dashboard with four initial incidents and five response units. The command is repeatable, preserves existing records, and only connects to a local MongoDB server. It does not create or change dispatcher accounts.

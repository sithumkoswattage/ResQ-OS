# ResQ-OS API Contract

Base URL: `/api` (frontend `src/services/api.js` adds the bearer token; dev default `http://localhost:5000/api`).
Errors are always `{ "message": "...", "code"?: "..." }`.

| Status | Meaning |
|---|---|
| 400 | Validation problem (show `message`) |
| **401** | Not signed in / token expired. `code` is `token_missing`, `token_invalid` or `token_expired`. **Clear the token and go to login.** |
| 403 | Signed in but wrong role, **or** `code: "account_suspended"` (an administrator suspended the account: sign out and show `message`) |
| 404 | Not found |
| 409 | Conflict (someone else changed it, wrong state). Show `message`, refresh data |
| 429 | Rate limited (login: 20 / 15 min, register: 10 / hour per IP) |

Roles: `dispatcher` (incidents, resources, command-center, alerts), `responder` (the `/me` field-unit endpoints) and `admin` (everything a dispatcher can do, plus `/admin/*`). All can use `/route` and `/stream`. The server re-checks the account on every request, so suspensions and role changes apply immediately. The login screen has no role picker: `POST /auth/login` takes `identifier` + `password` and returns the account's `role`.

---

## Incidents (dispatcher)

| | |
|---|---|
| `POST /incidents` | Body: `title, type, location, latitude, longitude` (required), `priority` (`low\|medium\|high\|critical`), `description`. 201 with the incident. |
| `GET /incidents`, `GET /incidents/:id` | List (newest first) / one. |
| `PATCH /incidents/:id` | Any of `title, type, description, location, latitude, longitude, priority, status`. `status: "resolved"` releases all assigned units. |

### `GET /incidents/:id/nearby-resources`
Suggests **available** units for an **active** incident (409 otherwise).

Query: `limit` (1-20, default 5), `type` (substring filter, e.g. `ambulance`), `onlineOnly=true` (drop units that have not pinged recently), `routing=true` (re-rank the closest candidates by estimated drive time; slower, uses the routing service).

```json
{
  "incident": { "_id": "...", "code": "INC-...", "latitude": 6.93, "longitude": 79.86 },
  "resources": [
    { "_id": "...", "unitCode": "AMB-01", "name": "Ambulance 1", "type": "Ambulance",
      "status": "available", "latitude": 6.94, "longitude": 79.85,
      "online": true, "lastSeen": "2026-11-08T03:10:00.000Z",
      "distanceKm": 1.42,
      "durationMin": 6.1, "routeDistanceKm": 2.3, "routeSource": "osrm" }
  ]
}
```
- Order: online units first, then nearest (by `distanceKm`, or by `durationMin` when `routing=true`).
- `durationMin`, `routeDistanceKm`, `routeSource` appear only with `routing=true`. `routeSource` is `osrm` or `straight-line` (estimate used when the routing service is unavailable, so show it as approximate).

---

## Resources / units (dispatcher)

| | |
|---|---|
| `GET /resources` | Each unit now also has `online` (bool), `lastSeen`, `progress`, `crew` (`[{id, username, email, onDuty}]`) and `operator` (the first person on duty, else the first on the crew, or `null`; kept for screens that show one name). |
| `POST /resources`, `PATCH /resources/:id`, `DELETE /resources/:id` | Unchanged. Dispatched units cannot be edited or deleted. |
| `PATCH /resources/:id/assignment` | Dispatch `{ "incidentId": "<id>" }` or release `{ "incidentId": null }`. Returns the unit with `assignedIncident` populated. 409 `"This unit was changed by someone else..."` if another dispatcher got there first. |
| `PUT /resources/:id/operator` | Add a responder account to this unit's crew: `{ "email": "unit@x.com" }` (people already on it stay; 409 if that account belongs to another unit). `{ "email": null }` removes the whole crew (409 while dispatched). |
| `DELETE /resources/:id/crew/:userId` | Remove one person from the crew. 409 if the unit is on a dispatch and that person is the last one on duty. An idle unit with nobody left on duty goes `offline`. |

`progress` is `null` (not dispatched), `assigned`, `accepted` or `on_scene`.

`status` is `available`, `dispatched`, `offline` or **`suspended`**. Only an admin can suspend/reactivate (see below); dispatchers cannot set it, edit a suspended unit, or dispatch it (409). `GET /command-center/overview` summary also has `suspendedResources`.

---

## Field unit (responder) — `/me`

A responder account belongs to one unit, and a unit can have a crew of one or more accounts (added by an admin when creating the account or under Units, by a dispatcher via `PUT /resources/:id/operator`, or by `npm run create:responder`). Each person goes **on duty** or **off duty** on their own; a unit is online while anyone on its crew is on duty, and goes `offline` when the last person leaves (unless it is on a dispatch). Until linked, these return 404 `"No unit is linked to this account..."`.

| | |
|---|---|
| `GET /me/unit` | `{ unit, assignment, progress, crew, onDuty }`. `crew` is `[{id, username, email, onDuty}]`; `onDuty` is this person's own flag. `assignment` is the full incident document or `null`. `unit.online` is true if it pinged in the last 60 s. |
| `PATCH /me/status` | `{ "status": "available" \| "offline" }` means **this person goes on duty / off duty** (the unit follows: online while anyone is on duty). Going off duty is 409 on a dispatch if you are the last person on duty. `/me/location` and `/me/assignment` need you to be on duty (409 otherwise). Returns `{ unit, crew, onDuty }`. |
| `POST /me/location` | `{ "latitude": <number>, "longitude": <number> }` (numbers, not strings). Send every ~10-15 s while online. 409 `"Go online before..."` when offline. Returns `{ lastSeen }`. |
| `PATCH /me/assignment` | `{ "progress": "accepted" \| "on_scene" \| "completed" }`. Order: assigned -> accepted -> on_scene -> completed (accepted may be skipped). `completed` frees the unit (status `available`). Returns `{ unit, assignment, progress }`. Does **not** resolve the incident; a dispatcher does that. |
| `GET /me/route` | Route from the unit's last position to its incident: `{ source, distanceKm, durationMin, geometry: [[lat,lng],...], from, to, incidentId }`. 404 if no dispatch. |

## Route lookup (any signed-in user)
`GET /route?fromLat=&fromLng=&toLat=&toLng=` -> `{ source, distanceKm, durationMin, geometry, from, to }`.
`geometry` is `[[lat, lng], ...]`, ready for a Leaflet polyline. `source: "straight-line"` means the routing service was unavailable (two-point line, rough ETA).

---

## Live updates (Server-Sent Events)

1. `POST /stream/ticket` (with the bearer token) -> `{ "ticket": "...", "expiresInSeconds": 30 }`
2. `new EventSource('/api/stream?ticket=' + ticket)` (the ticket is **single-use**).
3. On `error`, close it, request a **new ticket**, reconnect (the browser's auto-reconnect would reuse the spent ticket and fail).

Every event's `data` is JSON.

| Event | Sent to | Payload |
|---|---|---|
| `connected` | the client | `{ role, unitId }` |
| `incident:created` / `incident:updated` | dispatchers | incident |
| `unit:status` | dispatchers | unit (with `online`) |
| `unit:location` | dispatchers | `{ resourceId, latitude, longitude, lastSeen, status }` |
| `unit:removed` | dispatchers | `{ resourceId }` |
| `dispatch:assigned` | that unit's responder | `{ incident, progress: "assigned" }` |
| `dispatch:released` | that unit's responder | `{ incidentId }` (released or incident resolved) |

Alerts (`GET /alerts`...) still work as before; new alert type `resource_progress` ("Dispatch accepted" / "Unit on scene").

---

## Administrator (`/admin`, role `admin` only)

| | |
|---|---|
| `GET /admin/overview` | `{ users: {total, byRole, suspended, online}, units: {total, byStatus, online, withoutOperator (no crew), operatorsWithoutUnit}, incidents: {active, last24h}, onlineUsers: [...], recentActivity: [...15 audit entries] }` |
| `GET /admin/presence` | `{ onlineUsers: [{ userId, username, role, connections, since }] }`: accounts with an open live stream right now. |
| `GET /admin/audit` | Activity log, newest first. Query: `limit` (<=100), `category` (`auth\|incident\|resource\|unit\|user`), `action` (exact, e.g. `user.suspended`), `actorId`, `targetType`, `before` (ISO date; use the returned `nextBefore` to page). Returns `{ entries, nextBefore }`; an entry is `{ _id, actorId, actorName, actorRole, action, targetType, targetId, summary, meta, ip, createdAt }`. |
| `GET /admin/users` | All accounts (no passwords) with `online`, `suspended`, `suspendedReason`, `lastLoginAt` and `unit` (`{unitCode, name, status}`). |
| `POST /admin/users` | `{ username, email, password (8+), role: "dispatcher"\|"responder"\|"admin" }` -> 201. For `responder` also either `createUnit: { unitCode, type, name?, latitude?, longitude? }` (creates the unit and links it in one step; it starts `offline`, named after the username by default, at a default position until the first ping) or `unit: "<unit id>"` (an existing unit; it may already have a crew, and the new person starts off duty). 409 if the username/email or unit code exists; 400 if a non-responder is given a unit. Nothing is created when the request is refused. |
| `PATCH /admin/users/:id` | Any of `username`, `email`, `role`. You cannot change your own role; the last active admin cannot be demoted (409). Moving someone off `responder` unlinks their unit. `unit` (id, or `null` to unlink) links or unlinks a responder's unit: 409 if they are the last person on duty on a unit that is on a dispatch. Moving someone to another unit puts them off duty. |
| `POST /admin/users/:id/suspend` | `{ reason? }`. Signs them out of live streams immediately; their next request gets 403 `account_suspended`. Not allowed on yourself or the last active admin (409). The person goes off duty; the unit goes `offline` only if nobody else on its crew is on duty. A unit on a dispatch with nobody left on duty is left alone and the response carries `unitStillDispatched: "<unitCode>"`. |
| `DELETE /admin/users/:id` | 204. Permanent; prefer suspending. 409 for your own account, the last active admin, or the last person on duty on a unit that is on a dispatch. The unit is kept (an idle one with nobody left on duty goes `offline`) and the activity log keeps the account's name. Open sessions end immediately. |
| `POST /admin/users/:id/reactivate` | Lifts the suspension. |
| `POST /admin/users/:id/reset-password` | `{ password (8+) }`. Existing sessions stay valid until they expire; suspend first to cut them off. |
| `POST /admin/units/:id/suspend` | `{ reason?, force? }`. A dispatched unit returns 409 `code: "unit_dispatched"` unless `force: true`, which releases it from its incident. The unit's operator gets `unit:suspended` (+ `dispatch:released`). |
| `POST /admin/units/:id/reactivate` | Suspended -> `offline` (the crew must go on duty again; suspending takes everyone off duty). |

Registering, editing and deleting units, and linking operators, use the existing `/resources` endpoints, which admins can call too.

### Live events for admins
Admins receive every dispatcher event, plus: `audit:new` (an audit entry), `presence:changed` (`{ userId, username, role, online, connections }`). Any user whose account is suspended receives `account:suspended` and the stream closes. A suspended unit's operator receives `unit:suspended` `{ reason }`.

### Audit actions recorded
`auth.login`, `auth.login_failed`, `auth.login_blocked`, `incident.created|updated|resolved`, `resource.created|updated|deleted|dispatched|released|operator_linked|operator_unlinked`, `unit.status_changed|accepted|on_scene|completed|suspended|reactivated`, `user.created|updated|suspended|reactivated|password_reset|deleted`.

# ResQ-OS API Contract

Base URL: `http://localhost:5000/api` (frontend uses `src/services/api.js`, which adds the bearer token).
All dispatcher endpoints need `Authorization: Bearer <token>` from a `dispatcher` account.
Errors are `{ "message": "..." }` with status 400 (validation), 404, 409 (conflict) or 5xx.

Status legend: **[live]** implemented on `feature/nearest-unit-dispatch`, **[planned]** agreed shape, not built yet.

---

## Incidents

### `POST /incidents` [live]
Body: `title`, `type`, `location`, `latitude`, `longitude` (required); `priority` (`low|medium|high|critical`, default `medium`), `description`.
Returns the created incident (201), including `_id`, `code`, `status: "active"`.

### `GET /incidents` / `GET /incidents/:id` [live]
List (newest first) or single incident.

### `PATCH /incidents/:id` [live]
Any of `title, type, description, location, latitude, longitude, priority, status`.
Setting `status: "resolved"` releases all assigned units.

### `GET /incidents/:id/nearby-resources` [live]
Suggests the nearest **available** units for an active incident.

Query: `limit` (1-20, default 5), `type` (optional, case-insensitive substring, e.g. `ambulance`).

```json
{
  "incident": { "_id": "...", "code": "INC-...", "latitude": 6.93, "longitude": 79.86 },
  "resources": [
    { "_id": "...", "unitCode": "AMB-01", "name": "Ambulance 1", "type": "Ambulance",
      "status": "available", "latitude": 6.94, "longitude": 79.85, "distanceKm": 1.42 }
  ]
}
```
- Sorted nearest first. `distanceKm` is straight-line distance (will become drive time once routing is added).
- 409 if the incident is not active; 404 if it does not exist.

---

## Resources (units)

### `GET /resources`, `POST /resources`, `PATCH /resources/:id`, `DELETE /resources/:id` [live]
Unchanged. A dispatched unit cannot be edited or deleted until released.

### `PATCH /resources/:id/assignment` [live]
Dispatch or release a unit.

- Dispatch: `{ "incidentId": "<incident _id>" }`
- Release: `{ "incidentId": null }`

Returns the updated resource with `assignedIncident` populated (`code`, `title`, `status`).

Errors to show to the dispatcher:
- 409 `"This unit was changed by someone else. Refresh and try again."` another dispatcher got there first; reload the nearby-units list.
- 409 offline unit, or incident not active.

---

## Alerts (dispatcher feed) [live]
`GET /alerts?status=all|read|unread&category=all|incidents|resources&limit=`, `PATCH /alerts/:id/read`, `PATCH /alerts/read-all`.

---

## Planned: field unit side (Phase 2)

Responder accounts get linked to one unit (`User.unit -> Resource`). All routes below require role `responder`.

| Method | Path | Body | Purpose |
|---|---|---|---|
| GET | `/me/unit` | - | The responder's unit plus its current assignment (incident details). |
| PATCH | `/me/status` | `{ "status": "available" \| "offline" }` | Go online/offline. Cannot change while `dispatched`. |
| POST | `/me/location` | `{ "latitude", "longitude" }` | Position ping (every ~10-15 s while online). Updates `lastSeen`. |
| PATCH | `/me/assignment` | `{ "progress": "accepted" \| "on_scene" \| "completed" }` | Progress on the current dispatch. |

A unit counts as **online** if `status !== "offline"` and `lastSeen` is within the last 60 s.

## Planned: real-time (Phase 3)
Socket.IO, authenticated with the same JWT. Dispatchers join room `dispatchers`, each unit joins `unit:<resourceId>`.

| Event | To | Payload |
|---|---|---|
| `unit:location` | dispatchers | `{ resourceId, latitude, longitude, lastSeen }` |
| `unit:status` | dispatchers | updated resource |
| `incident:created` / `incident:updated` | dispatchers | incident |
| `dispatch:assigned` | `unit:<id>` | `{ incident, route? }` |
| `dispatch:released` | `unit:<id>` | `{ incidentId }` |

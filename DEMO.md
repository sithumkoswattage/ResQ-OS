# Running the ResQ-OS demo (Linux + Docker)

Everything runs in Docker: MongoDB, the backend and the frontend. The computer only needs `git` and Docker with the compose plugin. If Docker commands say "permission denied", put `sudo` in front of them (and use `sudo -E docker compose ...` so `JWT_SECRET` is passed through).

## 1. Get the code

```bash
git clone https://github.com/sithumkoswattage/ResQ-OS.git
cd ResQ-OS
```

## 2. Start everything

```bash
export JWT_SECRET=$(openssl rand -hex 32)
docker compose up --build -d
docker compose ps        # mongo, backend and frontend should all be "running"
```

The first run downloads and builds images, which takes a few minutes and needs internet.

## 3. Add demo data (first time only)

The seed scripts only accept a database at `127.0.0.1`, so run them inside MongoDB's network. Find the image and container names first (they follow the folder name, e.g. `resq-os-backend` and `resq-os-mongo-1`):

```bash
docker images | grep backend
docker compose ps mongo
```

Then, replacing the names if yours differ:

```bash
docker run --rm --network container:resq-os-mongo-1 \
  -e MONGO_URI=mongodb://127.0.0.1:27017/resqos \
  resq-os-backend node seedInitialData.js

docker run --rm --network container:resq-os-mongo-1 \
  -e MONGO_URI=mongodb://127.0.0.1:27017/resqos \
  -e DEMO_RESPONDER_PASSWORD='choose-a-password' \
  resq-os-backend node seedDemoResponders.js
```

This creates sample incidents, five units, and field logins `res-101`, `med-103`, `res-104`, `pat-102`, `wtr-101`, all with the password you chose.

Create a dispatcher login (type the answers when asked):

```bash
docker compose exec -it backend node createDispatcher.js
```

## 4. Open the app

http://localhost:8080

- **Dispatcher:** a normal browser window, Dispatcher tab.
- **Field unit:** a private/incognito window, **Field Unit** tab, e.g. `res-104`.
- **Location:** a desktop has no GPS. In the field window press F12, then ⋮ → More tools → **Sensors**, and choose a location (e.g. Colombo). Allow location when the browser asks.
- Use `localhost`, not the computer's IP address: browsers only share location on `localhost` or HTTPS.

## Demo flow

1. Dispatcher: **Incidents → New incident**, click the map to place it, create it.
2. Open the incident: **Nearest available units** lists units by drive time. Click **Dispatch** on `res-104`.
3. Field window: the **New dispatch** banner appears; tap **Accept dispatch → Arrived on scene → Complete dispatch**.
4. Dispatcher: progress updates live on the incident, the **Command Center** and **Alerts**.

## Stopping

```bash
docker compose down       # stop, keep the data
docker compose down -v    # stop and wipe the database
```

## If something goes wrong

- **Map is grey / ETAs say "approx.":** the map tiles and the drive-time routing come from the internet. The app still works without them.
- **A container keeps restarting:** `docker compose logs backend` (or `mongo`, `frontend`).
- **Port 8080 already in use:** change `"8080:80"` in `docker-compose.yml` to e.g. `"8081:80"`, and `CORS_ORIGINS` to match.

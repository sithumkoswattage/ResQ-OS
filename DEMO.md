# Running the ResQ-OS demo (Linux + Docker)

Everything runs in Docker: MongoDB, the backend and the frontend. The computer only needs `git` and Docker with the compose plugin. If Docker commands say "permission denied", put `sudo` in front of them (and use `sudo -E docker compose ...` so `JWT_SECRET` is passed through).

## 1. Get the code

```bash
git clone https://github.com/sithumkoswattage/ResQ-OS.git
cd ResQ-OS
```

## 2. Start everything

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env   # once; .env is not committed
docker compose up --build -d
docker compose ps        # mongo, backend and frontend should all be "running"
```

The first run downloads and builds images, which takes a few minutes and needs internet.

## 3. Add demo data (first time only)

```bash
bash demo-setup.sh 'choose-a-password'
```

This adds sample incidents and five units, plus these logins, all with the password you chose:

- Dispatcher tab: `dispatcher`
- Field Unit tab: `res-101`, `med-103`, `res-104`, `pat-102`, `wtr-101`

It is safe to run again; existing records are kept.

## 4. Open the app

http://localhost:8090

To open it from another computer (e.g. `10.50.80.1`) with location working, tunnel the port so the browser sees `localhost`:

```bash
ssh -L 8090:localhost:8090 user@10.50.80.2    # keep this window open
```

Then browse to `http://localhost:8090` on that computer. Type the `http://` in full; Edge may otherwise switch to https and fail.

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
- **Port 8090 already in use:** change the left number in `"8090:8080"` in `docker-compose.yml` (e.g. `"8095:8080"`), and set `CORS_ORIGINS` to match.

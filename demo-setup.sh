#!/usr/bin/env bash
# One-time demo data for the Docker setup. Run after `docker compose up --build -d`:
#   ./demo-setup.sh 'a-password-of-8+-chars'
# Adds sample incidents and units, the field-unit logins (res-101, med-103,
# res-104, pat-102, wtr-101) and a "dispatcher" login, all with that password.
# Safe to run again: existing records are kept.
set -euo pipefail
cd "$(dirname "$0")"

PASSWORD="${1:-}"
if [ -z "$PASSWORD" ]; then
  read -rsp "Password for the demo logins (8+ characters): " PASSWORD
  echo
fi
if [ "${#PASSWORD}" -lt 8 ]; then
  echo "The password must be at least 8 characters." >&2
  exit 1
fi

MONGO=$(docker compose ps -q mongo)
BACKEND=$(docker compose ps -q backend)
if [ -z "$MONGO" ] || [ -z "$BACKEND" ]; then
  echo "Start the app first: docker compose up --build -d" >&2
  exit 1
fi
IMAGE=$(docker inspect -f '{{.Image}}' "$BACKEND")

# The seed scripts only accept a database at 127.0.0.1, so run them inside
# MongoDB's network namespace, where the database is local.
seed() {
  docker run --rm --network "container:$MONGO" \
    -e MONGO_URI=mongodb://127.0.0.1:27017/resqos \
    -e DEMO_RESPONDER_PASSWORD="$PASSWORD" \
    "$IMAGE" node "$1"
}

echo "== Sample incidents and units"
seed seedInitialData.js
echo "== Field-unit logins"
seed seedDemoResponders.js

echo "== Dispatcher login"
docker compose exec -T -e PW="$PASSWORD" backend node -e "
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const existing = await User.findOne({ username: 'dispatcher' });
  if (existing) {
    console.log('Dispatcher login \"dispatcher\" already exists.');
  } else {
    await User.create({
      username: 'dispatcher',
      email: 'dispatcher@resq.local',
      password: await bcrypt.hash(process.env.PW, 10),
      role: 'dispatcher'
    });
    console.log('Created dispatcher login \"dispatcher\".');
  }
  await mongoose.disconnect();
})().catch((error) => { console.error(error.message); process.exit(1); });
"

echo
echo "Done. Sign in with the password you chose:"
echo "  Dispatcher tab:  dispatcher"
echo "  Field Unit tab:  res-104 (or res-101, med-103, pat-102, wtr-101)"

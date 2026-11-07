// Driving route + ETA between two points using an OSRM-compatible service.
// Set ROUTING_URL to your own OSRM / OpenRouteService-compatible endpoint for
// real use: the public demo server (default) is for light development only.
// If the service is slow or down we fall back to a straight-line estimate so
// dispatch never blocks on routing.
const { haversineKm } = require('./geo');

const FALLBACK_SPEED_KMH = 40;
const CACHE_TTL_MS = 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const BACKOFF_MS = 30 * 1000;

const cache = new Map();
let downUntil = 0;

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;
const cacheKey = (a, b) => [a.lat, a.lng, b.lat, b.lng].map((n) => n.toFixed(3)).join(',');

function straightLine(from, to) {
    const distanceKm = haversineKm(from.lat, from.lng, to.lat, to.lng);
    return {
        source: 'straight-line',
        distanceKm: round2(distanceKm),
        durationMin: round1((distanceKm / FALLBACK_SPEED_KMH) * 60),
        geometry: [[from.lat, from.lng], [to.lat, to.lng]]
    };
}

async function getRoute(from, to, options = {}) {
    const {
        fetchImpl = globalThis.fetch,
        baseUrl = process.env.ROUTING_URL || 'https://router.project-osrm.org',
        timeoutMs = Number(process.env.ROUTING_TIMEOUT_MS) || 4000,
        now = Date.now
    } = options;

    const key = cacheKey(from, to);
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now()) return hit.value;
    if (downUntil > now()) return straightLine(from, to);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const url = `${baseUrl.replace(/\/$/, '')}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
        const response = await fetchImpl(url, { signal: controller.signal, headers: { 'User-Agent': 'ResQ-OS/1.0' } });
        if (!response.ok) throw new Error(`Routing service returned ${response.status}`);
        const body = await response.json();
        const route = body.routes?.[0];
        if (body.code !== 'Ok' || !route) throw new Error('No route found');

        const value = {
            source: 'osrm',
            distanceKm: round2(route.distance / 1000),
            durationMin: round1(route.duration / 60),
            geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        };
        if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value);
        cache.set(key, { value, expiresAt: now() + CACHE_TTL_MS });
        return value;
    } catch {
        downUntil = now() + BACKOFF_MS;
        return straightLine(from, to);
    } finally {
        clearTimeout(timer);
    }
}

function resetRoutingState() {
    cache.clear();
    downUntil = 0;
}

module.exports = { getRoute, straightLine, resetRoutingState };

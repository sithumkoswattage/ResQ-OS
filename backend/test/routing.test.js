const test = require('node:test');
const assert = require('node:assert/strict');
const { getRoute, resetRoutingState } = require('../services/routing');

const from = { lat: 6.9271, lng: 79.8612 };
const to = { lat: 6.9414, lng: 79.8698 };

const osrmResponse = {
    code: 'Ok',
    routes: [{ distance: 2500, duration: 420, geometry: { coordinates: [[79.8612, 6.9271], [79.8698, 6.9414]] } }]
};
const okFetch = (calls) => async (url) => {
    calls.push(url);
    return { ok: true, json: async () => osrmResponse };
};

test('parses an OSRM response into [lat, lng] geometry', async () => {
    resetRoutingState();
    const calls = [];
    const route = await getRoute(from, to, { fetchImpl: okFetch(calls) });
    assert.equal(route.source, 'osrm');
    assert.equal(route.distanceKm, 2.5);
    assert.equal(route.durationMin, 7);
    assert.deepEqual(route.geometry[0], [6.9271, 79.8612]);
    assert.match(calls[0], /79\.8612,6\.9271;79\.8698,6\.9414/, 'OSRM expects lng,lat order');
});

test('caches identical lookups', async () => {
    resetRoutingState();
    const calls = [];
    await getRoute(from, to, { fetchImpl: okFetch(calls) });
    await getRoute(from, to, { fetchImpl: okFetch(calls) });
    assert.equal(calls.length, 1);
});

test('falls back to straight-line when the service fails, then backs off', async () => {
    resetRoutingState();
    let calls = 0;
    const failing = async () => { calls += 1; throw new Error('down'); };
    const first = await getRoute(from, to, { fetchImpl: failing });
    assert.equal(first.source, 'straight-line');
    assert.ok(first.durationMin > 0);
    await getRoute(from, to, { fetchImpl: failing });
    assert.equal(calls, 1, 'second call skips the failing service during back-off');
});

test('falls back on non-OK responses and "no route"', async () => {
    resetRoutingState();
    const bad = await getRoute(from, to, { fetchImpl: async () => ({ ok: false, status: 502 }) });
    assert.equal(bad.source, 'straight-line');
    resetRoutingState();
    const none = await getRoute(from, to, { fetchImpl: async () => ({ ok: true, json: async () => ({ code: 'NoRoute', routes: [] }) }) });
    assert.equal(none.source, 'straight-line');
    resetRoutingState();
});

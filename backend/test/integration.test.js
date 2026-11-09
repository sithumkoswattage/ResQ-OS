// End-to-end API tests against a real MongoDB. Skipped unless TEST_MONGO_URI is
// set, e.g.  TEST_MONGO_URI=mongodb://localhost:27017 npm test
// Each run uses a throwaway database that is dropped afterwards.
const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

const MONGO = process.env.TEST_MONGO_URI;
const skip = MONGO ? false : 'set TEST_MONGO_URI to run integration tests';

test('API integration', { skip }, async (t) => {
    process.env.JWT_SECRET = 'integration-test-secret-0123456789';
    const mongoose = require('mongoose');
    const app = require('../app');
    const User = require('../models/User');

    await mongoose.connect(MONGO, { dbName: `resqos_test_${Date.now()}` });
    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}/api`;
    t.after(async () => {
        server.close();
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });

    const call = async (method, path, { token, body } = {}) => {
        const response = await fetch(base + path, {
            method,
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        const text = await response.text();
        return { status: response.status, data: text ? JSON.parse(text) : null };
    };
    const login = async (identifier, password) => (await call('POST', '/auth/login', { body: { identifier, password } })).data.token;

    const password = 'correct-horse-battery';
    const hashed = await bcrypt.hash(password, 4);
    await User.create({ username: 'disp', email: 'disp@test.local', password: hashed, role: 'dispatcher' });
    await User.create({ username: 'unit1', email: 'unit1@test.local', password: hashed, role: 'responder' });
    const dispatcher = await login('disp', password);
    const responder = await login('unit1', password);

    const makeIncident = async (title) => (await call('POST', '/incidents', {
        token: dispatcher,
        body: { title, type: 'Fire', location: 'Colombo', latitude: 6.93, longitude: 79.85, priority: 'high' }
    })).data;
    const makeUnit = async (unitCode, latitude, longitude) => (await call('POST', '/resources', {
        token: dispatcher,
        body: { unitCode, name: unitCode, type: 'Ambulance', latitude, longitude }
    })).data;

    await t.test('bad token is 401, wrong role is 403', async () => {
        assert.equal((await call('GET', '/incidents', { token: 'junk' })).status, 401);
        assert.equal((await call('GET', '/incidents', { token: responder })).status, 403);
    });

    await t.test('nearby units are sorted nearest first', async () => {
        const incident = await makeIncident('Sorted');
        await makeUnit('FAR-1', 7.29, 80.63);
        await makeUnit('NEAR-1', 6.931, 79.851);
        const { status, data } = await call('GET', `/incidents/${incident._id}/nearby-resources?limit=2`, { token: dispatcher });
        assert.equal(status, 200);
        assert.equal(data.resources[0].unitCode, 'NEAR-1');
        assert.ok(data.resources[0].distanceKm < data.resources[1].distanceKm);
    });

    await t.test('two dispatchers cannot claim the same unit', async () => {
        const [a, b] = [await makeIncident('Race A'), await makeIncident('Race B')];
        const unit = await makeUnit('RACE-1', 6.93, 79.85);
        const results = await Promise.all([a, b].map((incident) =>
            call('PATCH', `/resources/${unit._id}/assignment`, { token: dispatcher, body: { incidentId: incident._id } })));
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    });

    await t.test('responder flow: link, go online, ping, dispatch, progress, complete', async () => {
        const unit = await makeUnit('FLOW-1', 6.93, 79.85);
        assert.equal((await call('GET', '/me/unit', { token: responder })).status, 404, 'not linked yet');

        const link = await call('PUT', `/resources/${unit._id}/operator`, { token: dispatcher, body: { email: 'unit1@test.local' } });
        assert.equal(link.status, 200);

        assert.equal((await call('POST', '/me/location', { token: responder, body: { latitude: 6.94, longitude: 79.86 } })).status, 200);
        assert.equal((await call('PATCH', '/me/status', { token: responder, body: { status: 'offline' } })).status, 200);
        assert.equal((await call('POST', '/me/location', { token: responder, body: { latitude: 6.94, longitude: 79.86 } })).status, 409, 'offline units cannot ping');
        assert.equal((await call('PATCH', '/me/status', { token: responder, body: { status: 'available' } })).status, 200);
        assert.equal((await call('POST', '/me/location', { token: responder, body: { latitude: 'x', longitude: 1 } })).status, 400);

        const incident = await makeIncident('Flow');
        const near = await call('GET', `/incidents/${incident._id}/nearby-resources`, { token: dispatcher });
        assert.equal(near.data.resources.find((r) => r.unitCode === 'FLOW-1').online, true);

        assert.equal((await call('PATCH', `/resources/${unit._id}/assignment`, { token: dispatcher, body: { incidentId: incident._id } })).status, 200);
        const mine = await call('GET', '/me/unit', { token: responder });
        assert.equal(mine.data.assignment._id, incident._id);
        assert.equal(mine.data.progress, 'assigned');

        assert.equal((await call('PATCH', '/me/status', { token: responder, body: { status: 'offline' } })).status, 409, 'cannot go offline mid-dispatch');
        assert.equal((await call('PATCH', '/me/assignment', { token: responder, body: { progress: 'completed' } })).status, 409, 'must arrive first');
        assert.equal((await call('PATCH', '/me/assignment', { token: responder, body: { progress: 'accepted' } })).status, 200);
        assert.equal((await call('PATCH', '/me/assignment', { token: responder, body: { progress: 'on_scene' } })).status, 200);
        const done = await call('PATCH', '/me/assignment', { token: responder, body: { progress: 'completed' } });
        assert.equal(done.status, 200);
        assert.equal(done.data.unit.status, 'available');
        assert.equal(done.data.assignment, null);
    });
});

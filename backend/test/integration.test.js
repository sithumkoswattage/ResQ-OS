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
    const Resource = require('../models/Resource');

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

    await t.test('admin: manage users, suspend accounts and units, audit trail', async () => {
        await User.create({ username: 'root', email: 'root@test.local', password: hashed, role: 'admin' });
        const admin = await login('root', password);
        assert.equal((await call('GET', '/admin/overview', { token: dispatcher })).status, 403, 'dispatchers are not admins');
        assert.equal((await call('GET', '/admin/overview', { token: admin })).status, 200);

        // create + suspend a dispatcher: the existing token stops working immediately
        const created = await call('POST', '/admin/users', { token: admin, body: { username: 'temp', email: 'temp@test.local', password, role: 'dispatcher' } });
        assert.equal(created.status, 201);
        const tempToken = await login('temp', password);
        assert.equal((await call('GET', '/incidents', { token: tempToken })).status, 200);
        assert.equal((await call('POST', `/admin/users/${created.data._id}/suspend`, { token: admin, body: { reason: 'test' } })).status, 200);
        const blocked = await call('GET', '/incidents', { token: tempToken });
        assert.equal(blocked.status, 403);
        assert.equal(blocked.data.code, 'account_suspended');
        assert.equal((await call('POST', '/auth/login', { body: { identifier: 'temp', password } })).status, 403);
        assert.equal((await call('POST', `/admin/users/${created.data._id}/reactivate`, { token: admin })).status, 200);

        // safety rails
        const self = (await call('GET', '/admin/users', { token: admin })).data.find((u) => u.username === 'root');
        assert.equal((await call('POST', `/admin/users/${self._id}/suspend`, { token: admin })).status, 409, 'cannot suspend yourself');

        // unit suspension: needs force when dispatched, then blocks dispatching
        const unit = await makeUnit('SUSP-1', 6.93, 79.85);
        const incident = await makeIncident('Suspension');
        await call('PATCH', `/resources/${unit._id}/assignment`, { token: dispatcher, body: { incidentId: incident._id } });
        const needsForce = await call('POST', `/admin/units/${unit._id}/suspend`, { token: admin, body: {} });
        assert.equal(needsForce.status, 409);
        assert.equal(needsForce.data.code, 'unit_dispatched');
        assert.equal((await call('POST', `/admin/units/${unit._id}/suspend`, { token: admin, body: { force: true, reason: 'faulty' } })).status, 200);
        assert.equal((await call('PATCH', `/resources/${unit._id}/assignment`, { token: dispatcher, body: { incidentId: incident._id } })).status, 409);
        assert.equal((await call('PATCH', `/resources/${unit._id}`, { token: dispatcher, body: { status: 'available' } })).status, 409, 'dispatchers cannot lift a suspension');
        assert.equal((await call('POST', `/admin/units/${unit._id}/reactivate`, { token: admin })).status, 200);

        // solo unit: creating a field account can create and link its unit in one step
        const solo = await call('POST', '/admin/users', { token: admin, body: {
            username: 'officer1', email: 'officer1@test.local', password, role: 'responder',
            createUnit: { unitCode: 'pc-solo', type: 'Police Officer' }
        } });
        assert.equal(solo.status, 201);
        assert.equal(solo.data.unit.unitCode, 'PC-SOLO');
        const soloUnit = await Resource.findById(solo.data.unit._id);
        assert.equal(soloUnit.status, 'offline', 'a new unit starts offline until its operator is on duty');
        assert.equal(soloUnit.name, 'officer1', 'the unit is named after the person by default');
        assert.equal((await call('POST', '/admin/users', { token: admin, body: {
            username: 'officer3', email: 'officer3@test.local', password, role: 'dispatcher', unit: String(soloUnit._id)
        } })).status, 400, 'only field accounts take a unit');
        assert.equal(await User.exists({ username: 'officer3' }), null, 'a refused account is not created');

        // a unit on a dispatch cannot change operator; suspending the operator takes an idle unit off the board
        await Resource.updateOne({ _id: soloUnit._id }, { status: 'available' });
        const suspendedOfficer = await call('POST', `/admin/users/${solo.data._id}/suspend`, { token: admin });
        assert.equal(suspendedOfficer.status, 200);
        assert.equal((await Resource.findById(soloUnit._id)).status, 'offline');
        await Resource.updateOne({ _id: soloUnit._id }, { status: 'dispatched' });
        assert.equal((await call('PATCH', `/admin/users/${solo.data._id}`, { token: admin, body: { unit: null } })).status, 409);
        assert.equal((await call('PUT', `/resources/${soloUnit._id}/operator`, { token: dispatcher, body: { email: null } })).status, 409);
        await Resource.updateOne({ _id: soloUnit._id }, { status: 'offline' });
        assert.equal((await call('PATCH', `/admin/users/${solo.data._id}`, { token: admin, body: { unit: null } })).status, 200);

        // deleting accounts: not yourself, not while the operator's unit is on a dispatch; the unit survives
        assert.equal((await call('DELETE', `/admin/users/${self._id}`, { token: admin })).status, 409, 'cannot delete yourself');
        await call('PATCH', `/admin/users/${solo.data._id}`, { token: admin, body: { unit: String(soloUnit._id) } });
        await Resource.updateOne({ _id: soloUnit._id }, { status: 'dispatched' });
        assert.equal((await call('DELETE', `/admin/users/${solo.data._id}`, { token: admin })).status, 409, 'unit is on a dispatch');
        await Resource.updateOne({ _id: soloUnit._id }, { status: 'offline' });
        assert.equal((await call('DELETE', `/admin/users/${solo.data._id}`, { token: admin })).status, 204);
        assert.equal(await User.exists({ _id: solo.data._id }), null);
        assert.ok(await Resource.exists({ _id: soloUnit._id }), 'the unit is kept');
        assert.equal((await call('GET', '/incidents', { token: await login('temp', password) })).status, 200, 'other accounts are unaffected');

        // audit trail records all of it
        const trail = await call('GET', '/admin/audit?limit=100', { token: admin });
        const actions = trail.data.entries.map((e) => e.action);
        for (const expected of ['auth.login', 'user.created', 'user.suspended', 'user.deleted', 'unit.suspended', 'resource.created']) {
            assert.ok(actions.includes(expected), `missing audit action ${expected}`);
        }
    });

    await t.test('responder flow: link, go online, ping, dispatch, progress, complete', async () => {
        const unit = await makeUnit('FLOW-1', 6.93, 79.85);
        assert.equal((await call('GET', '/me/unit', { token: responder })).status, 404, 'not linked yet');

        const link = await call('PUT', `/resources/${unit._id}/operator`, { token: dispatcher, body: { email: 'unit1@test.local' } });
        assert.equal(link.status, 200);

        assert.equal((await call('POST', '/me/location', { token: responder, body: { latitude: 6.94, longitude: 79.86 } })).status, 409, 'must be on duty to ping');
        assert.equal((await call('PATCH', '/me/status', { token: responder, body: { status: 'available' } })).status, 200);
        assert.equal((await call('POST', '/me/location', { token: responder, body: { latitude: 6.94, longitude: 79.86 } })).status, 200);
        assert.equal((await call('PATCH', '/me/status', { token: responder, body: { status: 'offline' } })).status, 200);
        assert.equal((await call('POST', '/me/location', { token: responder, body: { latitude: 6.94, longitude: 79.86 } })).status, 409, 'off duty cannot ping');
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

    await t.test('crew: several people on one unit, each on or off duty', async () => {
        const admin = await login('root', password);
        const unit = await makeUnit('CREW-1', 6.93, 79.85);
        const add = (username) => call('POST', '/admin/users', { token: admin, body: {
            username, email: `${username}@test.local`, password, role: 'responder', unit: String(unit._id)
        } });
        const a = await add('crew-a');
        const b = await add('crew-b');
        assert.equal(a.status, 201);
        assert.equal(b.status, 201, 'a second person can join the same unit');
        const tokenA = await login('crew-a', password);
        const tokenB = await login('crew-b', password);
        const state = async () => (await Resource.findById(unit._id)).status;
        const duty = (token, status) => call('PATCH', '/me/status', { token, body: { status } });

        const listed = (await call('GET', '/resources', { token: dispatcher })).data.find((r) => r.unitCode === 'CREW-1');
        assert.equal(listed.crew.length, 2);
        assert.equal(await state(), 'offline', 'nobody on duty yet');

        // the unit is online while anyone on the crew is on duty
        assert.equal((await duty(tokenA, 'available')).status, 200);
        assert.equal(await state(), 'available');
        assert.equal((await duty(tokenB, 'available')).status, 200);
        assert.equal((await duty(tokenA, 'offline')).status, 200);
        assert.equal(await state(), 'available', 'still online: B is on duty');
        assert.equal((await call('POST', '/me/location', { token: tokenA, body: { latitude: 6.9, longitude: 79.8 } })).status, 409, 'A is off duty so cannot ping');
        assert.equal((await call('POST', '/me/location', { token: tokenB, body: { latitude: 6.91, longitude: 79.81 } })).status, 200);
        assert.equal((await duty(tokenB, 'offline')).status, 200);
        assert.equal(await state(), 'offline', 'last person off duty takes the unit offline');

        // on a dispatch: anyone may leave while another stays; the last person on duty may not
        await duty(tokenA, 'available');
        await duty(tokenB, 'available');
        const incident = await makeIncident('Crew dispatch');
        assert.equal((await call('PATCH', `/resources/${unit._id}/assignment`, { token: dispatcher, body: { incidentId: incident._id } })).status, 200);
        assert.equal((await duty(tokenA, 'offline')).status, 200);
        assert.equal(await state(), 'dispatched');
        assert.equal((await duty(tokenB, 'offline')).status, 409, 'last person on duty cannot leave a dispatch');
        assert.equal((await call('PATCH', '/me/assignment', { token: tokenA, body: { progress: 'accepted' } })).status, 409, 'off duty cannot update the dispatch');
        assert.equal((await call('PATCH', '/me/assignment', { token: tokenB, body: { progress: 'accepted' } })).status, 200);

        // admin rules while dispatched
        assert.equal((await call('DELETE', `/admin/users/${b.data._id}`, { token: admin })).status, 409, 'B is the last on duty');
        assert.equal((await call('PATCH', `/admin/users/${b.data._id}`, { token: admin, body: { unit: null } })).status, 409);
        assert.equal((await call('DELETE', `/admin/users/${a.data._id}`, { token: admin })).status, 204, 'A is off duty and B stays');
        assert.equal((await call('DELETE', `/resources/${unit._id}/crew/${b.data._id}`, { token: dispatcher })).status, 409);

        // finish, then the dispatcher can add and remove crew
        await call('PATCH', '/me/assignment', { token: tokenB, body: { progress: 'on_scene' } });
        await call('PATCH', '/me/assignment', { token: tokenB, body: { progress: 'completed' } });
        await User.create({ username: 'crew-c', email: 'crew-c@test.local', password: hashed, role: 'responder' });
        const added = await call('PUT', `/resources/${unit._id}/operator`, { token: dispatcher, body: { email: 'crew-c@test.local' } });
        assert.equal(added.status, 200);
        assert.equal((await call('GET', '/resources', { token: dispatcher })).data.find((r) => r.unitCode === 'CREW-1').crew.length, 2, 'B and the added person');
        assert.equal((await call('DELETE', `/resources/${unit._id}/crew/${b.data._id}`, { token: dispatcher })).status, 204);
        assert.equal(await state(), 'offline', 'removing the only person on duty takes the idle unit offline');
        assert.equal((await call('GET', '/me/unit', { token: tokenB })).status, 404, 'B no longer has a unit');
    });
});

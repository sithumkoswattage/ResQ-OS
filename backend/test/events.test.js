const test = require('node:test');
const assert = require('node:assert/strict');
const { addClient, publishToDispatchers, publishToUnit, clientCount } = require('../services/events');
const { issueTicket, consumeTicket } = require('../services/streamTickets');
const { isOnline } = require('../services/presence');

function sink() {
    const chunks = [];
    return { chunks, res: { write: (chunk) => chunks.push(chunk) } };
}

test('dispatchers get fleet events; units only get their own', () => {
    const dispatcher = sink();
    const unitA = sink();
    const unitB = sink();
    const removers = [
        addClient({ res: dispatcher.res, role: 'dispatcher' }),
        addClient({ res: unitA.res, role: 'responder', unitId: 'A' }),
        addClient({ res: unitB.res, role: 'responder', unitId: 'B' })
    ];

    publishToDispatchers('unit:status', { id: 1 });
    publishToUnit('A', 'dispatch:assigned', { incident: 'x' });

    assert.equal(dispatcher.chunks.length, 1);
    assert.match(dispatcher.chunks[0], /^event: unit:status\ndata: \{"id":1\}\n\n$/);
    assert.equal(unitA.chunks.length, 1);
    assert.equal(unitB.chunks.length, 0);

    removers.forEach((remove) => remove());
    assert.equal(clientCount(), 0);
});

test('a client whose connection throws is dropped', () => {
    const broken = { write() { throw new Error('closed'); } };
    addClient({ res: broken, role: 'dispatcher' });
    publishToDispatchers('x', {});
    assert.equal(clientCount(), 0);
});

test('stream tickets are single-use and expire', () => {
    const ticket = issueTicket({ role: 'dispatcher' }, 1000);
    assert.deepEqual(consumeTicket(ticket, 1500), { role: 'dispatcher' });
    assert.equal(consumeTicket(ticket, 1500), null, 'already used');
    const stale = issueTicket({ role: 'dispatcher' }, 1000);
    assert.equal(consumeTicket(stale, 1000 + 31_000), null, 'expired');
    assert.equal(consumeTicket('bogus'), null);
});

test('presence: offline or stale units are not online', () => {
    const now = Date.now();
    assert.equal(isOnline({ status: 'available', lastSeen: new Date(now - 5_000) }, now), true);
    assert.equal(isOnline({ status: 'available', lastSeen: new Date(now - 120_000) }, now), false);
    assert.equal(isOnline({ status: 'offline', lastSeen: new Date(now) }, now), false);
    assert.equal(isOnline({ status: 'available', lastSeen: null }, now), false);
});

test('admins receive fleet events too, plus admin-only events', () => {
    const admin = sink();
    const dispatcher = sink();
    const removers = [
        addClient({ res: admin.res, role: 'admin', userId: 'a1', username: 'root' }),
        addClient({ res: dispatcher.res, role: 'dispatcher', userId: 'd1', username: 'dee' })
    ];
    const { publishToAdmins } = require('../services/events');

    publishToDispatchers('incident:created', { id: 1 });
    publishToAdmins('audit:new', { id: 2 });

    assert.equal(admin.chunks.length, 2);
    assert.equal(dispatcher.chunks.length, 1, 'dispatchers never see admin-only events');
    removers.forEach((remove) => remove());
});

test('onlineUsers groups connections per user; disconnectUser closes them', () => {
    const { onlineUsers, disconnectUser, connectionsFor } = require('../services/events');
    const tab1 = sink();
    const tab2 = sink();
    let ended = 0;
    tab1.res.end = () => { ended += 1; };
    tab2.res.end = () => { ended += 1; };
    addClient({ res: tab1.res, role: 'dispatcher', userId: 'u1', username: 'dee' });
    addClient({ res: tab2.res, role: 'dispatcher', userId: 'u1', username: 'dee' });

    const online = onlineUsers();
    assert.equal(online.length, 1);
    assert.equal(online[0].connections, 2);
    assert.equal(connectionsFor('u1'), 2);

    disconnectUser('u1', 'account:suspended', { reason: 'test' });
    assert.match(tab1.chunks[0], /^event: account:suspended/);
    assert.equal(ended, 2);
    assert.equal(connectionsFor('u1'), 0);
    assert.equal(onlineUsers().length, 0);
});

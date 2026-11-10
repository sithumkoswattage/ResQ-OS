// In-process Server-Sent Events hub. Dispatchers and administrators receive
// fleet/incident updates; each responder receives only events for their own
// unit; administrators additionally get audit and presence events.
// Single-instance only: to scale beyond one backend process, replace this
// with a shared pub/sub (e.g. Redis) behind the same functions.
const clients = new Set();

function addClient({ res, role, unitId = null, userId = null, username = null }) {
    const client = {
        res,
        role,
        unitId: unitId ? String(unitId) : null,
        userId: userId ? String(userId) : null,
        username,
        connectedAt: new Date()
    };
    clients.add(client);
    return () => clients.delete(client);
}

function send(client, event, data) {
    try {
        client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
        clients.delete(client);
    }
}

// Fleet and incident events go to dispatchers and administrators.
function publishToDispatchers(event, data) {
    for (const client of clients) {
        if (client.role === 'dispatcher' || client.role === 'admin') send(client, event, data);
    }
}

function publishToAdmins(event, data) {
    for (const client of clients) {
        if (client.role === 'admin') send(client, event, data);
    }
}

function publishToUnit(unitId, event, data) {
    const id = String(unitId);
    for (const client of clients) {
        if (client.role === 'responder' && client.unitId === id) send(client, event, data);
    }
}

function connectionsFor(userId) {
    const id = String(userId);
    let count = 0;
    for (const client of clients) {
        if (client.userId === id) count += 1;
    }
    return count;
}

// One entry per signed-in user with at least one open stream.
function onlineUsers() {
    const byUser = new Map();
    for (const client of clients) {
        if (!client.userId) continue;
        const entry = byUser.get(client.userId) || {
            userId: client.userId,
            username: client.username,
            role: client.role,
            connections: 0,
            since: client.connectedAt
        };
        entry.connections += 1;
        if (client.connectedAt < entry.since) entry.since = client.connectedAt;
        byUser.set(client.userId, entry);
    }
    return [...byUser.values()].sort((a, b) => String(a.username).localeCompare(String(b.username)));
}

// Closes every stream a user has open (used when an account is suspended).
function disconnectUser(userId, event, data) {
    const id = String(userId);
    for (const client of [...clients]) {
        if (client.userId !== id) continue;
        if (event) send(client, event, data);
        try { client.res.end?.(); } catch { /* already closed */ }
        clients.delete(client);
    }
}

function clientCount() {
    return clients.size;
}

module.exports = {
    addClient,
    send,
    publishToDispatchers,
    publishToAdmins,
    publishToUnit,
    connectionsFor,
    onlineUsers,
    disconnectUser,
    clientCount
};

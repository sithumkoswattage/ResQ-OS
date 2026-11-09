// In-process Server-Sent Events hub. Dispatchers receive fleet/incident
// updates; each responder receives only events for their own unit.
// Single-instance only: to scale beyond one backend process, replace this
// with a shared pub/sub (e.g. Redis) behind the same publish functions.
const clients = new Set();

function addClient({ res, role, unitId = null }) {
    const client = { res, role, unitId: unitId ? String(unitId) : null };
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

function publishToDispatchers(event, data) {
    for (const client of clients) {
        if (client.role === 'dispatcher') send(client, event, data);
    }
}

function publishToUnit(unitId, event, data) {
    const id = String(unitId);
    for (const client of clients) {
        if (client.role === 'responder' && client.unitId === id) send(client, event, data);
    }
}

function clientCount() {
    return clients.size;
}

module.exports = { addClient, send, publishToDispatchers, publishToUnit, clientCount };

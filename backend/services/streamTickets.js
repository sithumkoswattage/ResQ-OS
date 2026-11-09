// Browsers' EventSource cannot send an Authorization header, so a logged-in
// client first trades its JWT for a short-lived, single-use ticket and opens
// the stream with ?ticket=... (keeps the JWT out of URLs and server logs).
const { randomBytes } = require('node:crypto');

const TICKET_TTL_MS = 30 * 1000;
const tickets = new Map();

function purgeExpired(now) {
    for (const [ticket, entry] of tickets) {
        if (entry.expiresAt <= now) tickets.delete(ticket);
    }
}

function issueTicket(payload, now = Date.now()) {
    purgeExpired(now);
    const ticket = randomBytes(24).toString('hex');
    tickets.set(ticket, { payload, expiresAt: now + TICKET_TTL_MS });
    return ticket;
}

function consumeTicket(ticket, now = Date.now()) {
    const entry = tickets.get(ticket);
    if (!entry) return null;
    tickets.delete(ticket);
    return entry.expiresAt > now ? entry.payload : null;
}

module.exports = { issueTicket, consumeTicket, TICKET_TTL_MS };

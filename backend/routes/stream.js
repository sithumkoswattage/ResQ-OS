// Server-Sent Events. Flow: POST /api/stream/ticket (with the JWT) ->
// open EventSource('/api/stream?ticket=...'). Tickets are single-use, so on a
// dropped connection the client must request a new ticket before reconnecting.
const express = require('express');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { issueTicket, consumeTicket, TICKET_TTL_MS } = require('../services/streamTickets');
const { addClient, send } = require('../services/events');

const router = express.Router();
const HEARTBEAT_MS = 25 * 1000;

router.post('/ticket', verifyToken, async (req, res) => {
    try {
        let unitId = null;
        if (req.user.role === 'responder') {
            const user = await User.findById(req.user.id).select('unit').lean();
            unitId = user?.unit || null;
        }
        const ticket = issueTicket({ userId: req.user.id, role: req.user.role, unitId });
        return res.status(201).json({ ticket, expiresInSeconds: TICKET_TTL_MS / 1000 });
    } catch (error) {
        console.error('Stream ticket error:', error);
        return res.status(500).json({ message: 'Unable to open the live stream.' });
    }
});

router.get('/', (req, res) => {
    const session = typeof req.query.ticket === 'string' ? consumeTicket(req.query.ticket) : null;
    if (!session) {
        return res.status(401).json({ message: 'Invalid or expired stream ticket.', code: 'ticket_invalid' });
    }

    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
    });
    res.flushHeaders();
    res.write('retry: 3000\n\n');

    const client = { res, role: session.role, unitId: session.unitId };
    const remove = addClient(client);
    send(client, 'connected', { role: session.role, unitId: session.unitId ? String(session.unitId) : null });

    const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
    req.on('close', () => {
        clearInterval(heartbeat);
        remove();
    });
});

module.exports = router;

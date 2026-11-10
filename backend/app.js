const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const resourceRoutes = require('./routes/resources');
const commandCenterRoutes = require('./routes/commandCenter');
const alertRoutes = require('./routes/alerts');
const meRoutes = require('./routes/me');
const routeRoutes = require('./routes/route');
const streamRoutes = require('./routes/stream');
const adminRoutes = require('./routes/admin');
const equipmentRoutes = require('./routes/equipment');
const { verifyToken, requireRole } = require('./middleware/auth');
const { requireActiveAccount } = require('./middleware/account');
const { securityHeaders, buildCorsOptions } = require('./middleware/security');
const { createRateLimiter } = require('./middleware/rateLimit');

const app = express();
app.disable('x-powered-by');
// Behind a reverse proxy (nginx, a cloud load balancer) set TRUST_PROXY=1 so
// rate limiting sees real client IPs.
if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    app.set('trust proxy', Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
}

app.use(securityHeaders);
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: '100kb' }));

const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many sign-in attempts. Please wait a few minutes and try again.'
});
const registerLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many registration attempts. Please try again later.'
});
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);

app.use('/api/auth', authRoutes);
// Dispatchers and administrators share the operational APIs; verifyToken
// checks the JWT, requireActiveAccount re-checks the account (suspension, role).
const staff = [verifyToken, requireActiveAccount, requireRole('dispatcher', 'admin')];
app.use('/api/incidents', ...staff, incidentRoutes);
app.use('/api/resources', ...staff, resourceRoutes);
app.use('/api/command-center', ...staff, commandCenterRoutes);
app.use('/api/alerts', ...staff, alertRoutes);
app.use('/api/equipment', ...staff, equipmentRoutes); // writes are admin-only inside
app.use('/api/admin', verifyToken, requireActiveAccount, requireRole('admin'), adminRoutes);
app.use('/api/me', verifyToken, requireActiveAccount, requireRole('responder'), meRoutes);
app.use('/api/route', verifyToken, requireActiveAccount, routeRoutes);
app.use('/api/stream', streamRoutes); // authenticates itself (ticket flow)
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'ResQ-OS Backend' }));

app.use('/api', (req, res) => res.status(404).json({ message: 'Not found.' }));
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body is not valid JSON.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large.' });
    console.error('Unhandled error:', error);
    return res.status(500).json({ message: 'Unexpected server error.' });
});

module.exports = app;

// Administrator console API. Mounted at /api/admin (role "admin" only).
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Resource = require('../models/Resource');
const Incident = require('../models/Incident');
const Equipment = require('../models/Equipment');
const AuditLog = require('../models/AuditLog');
const audit = require('../services/audit');
const events = require('../services/events');
const { createResourceAlert } = require('../services/alertService');
const { isOnline } = require('../services/presence');

const router = express.Router();
const ROLES = ['dispatcher', 'responder', 'admin'];
const MIN_PASSWORD_LENGTH = 8;

function handleError(res, error) {
    if (error.operationCommitted) {
        console.error('Admin change completed but its alert was not recorded:', error);
        return res.status(503).json({ message: 'The change was saved, but its alert could not be recorded.' });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
        return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
        return res.status(409).json({ message: 'That username or email is already in use.' });
    }
    console.error('Admin API error:', error);
    return res.status(500).json({ message: 'Unable to process the administrator request.' });
}

function publicUser(user, connections = new Map()) {
    const data = user.toObject ? user.toObject() : { ...user };
    delete data.password;
    return { ...data, online: (connections.get(String(data._id)) || 0) > 0 };
}

const countBy = (items, keyFn) => items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
}, {});

// Administrators who are still allowed to sign in, other than `excludeId`.
const otherActiveAdmins = (excludeId) =>
    User.countDocuments({ role: 'admin', suspended: { $ne: true }, _id: { $ne: excludeId } });

// ---------- Overview & live presence ----------

router.get('/overview', async (req, res) => {
    try {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const [users, units, activeIncidents, incidentsLast24h, equipment, recentActivity] = await Promise.all([
            User.find().select('role suspended').lean(),
            Resource.find().select('status lastSeen').lean(),
            Incident.countDocuments({ status: 'active' }),
            Incident.countDocuments({ createdAt: { $gte: dayAgo } }),
            Equipment.find().select('status assignedUnit nextServiceDue').lean(),
            AuditLog.find().sort({ createdAt: -1 }).limit(15).lean()
        ]);
        const onlineUsers = events.onlineUsers();

        return res.json({
            users: {
                total: users.length,
                byRole: countBy(users, (u) => u.role),
                suspended: users.filter((u) => u.suspended).length,
                online: onlineUsers.length
            },
            units: {
                total: units.length,
                byStatus: countBy(units, (u) => u.status),
                online: units.filter((u) => isOnline(u)).length
            },
            incidents: { active: activeIncidents, last24h: incidentsLast24h },
            equipment: {
                total: equipment.length,
                byStatus: countBy(equipment, (e) => e.status),
                unassigned: equipment.filter((e) => !e.assignedUnit && e.status === 'serviceable').length,
                serviceOverdue: equipment.filter((e) => e.status !== 'retired' && e.nextServiceDue && e.nextServiceDue < now).length
            },
            onlineUsers,
            recentActivity
        });
    } catch (error) {
        return handleError(res, error);
    }
});

router.get('/presence', (req, res) => res.json({ onlineUsers: events.onlineUsers() }));

// ---------- Audit log ----------

router.get('/audit', async (req, res) => {
    try {
        const filter = {};
        if (typeof req.query.action === 'string' && req.query.action) filter.action = req.query.action;
        if (typeof req.query.category === 'string' && /^[a-z_]+$/.test(req.query.category)) {
            filter.action = new RegExp(`^${req.query.category}\\.`);
        }
        if (typeof req.query.actorId === 'string' && req.query.actorId) filter.actorId = req.query.actorId;
        if (typeof req.query.targetType === 'string' && req.query.targetType) filter.targetType = req.query.targetType;
        if (typeof req.query.before === 'string' && req.query.before) {
            const before = new Date(req.query.before);
            if (Number.isNaN(before.getTime())) return res.status(400).json({ message: 'before must be an ISO date.' });
            filter.createdAt = { $lt: before };
        }
        const requested = Number.parseInt(req.query.limit, 10);
        const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 100) : 50;

        const entries = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
        return res.json({
            entries,
            nextBefore: entries.length === limit ? entries[entries.length - 1].createdAt : null
        });
    } catch (error) {
        return handleError(res, error);
    }
});

// ---------- Users ----------

router.get('/users', async (req, res) => {
    try {
        const connections = new Map(events.onlineUsers().map((u) => [u.userId, u.connections]));
        const users = await User.find().select('-password').populate('unit', 'unitCode name status').sort({ role: 1, username: 1 });
        return res.json(users.map((user) => publicUser(user, connections)));
    } catch (error) {
        return handleError(res, error);
    }
});

router.post('/users', async (req, res) => {
    try {
        const username = String(req.body.username ?? '').trim();
        const email = String(req.body.email ?? '').trim().toLowerCase();
        const { password, role } = req.body;
        if (!username || !email || typeof password !== 'string') {
            return res.status(400).json({ message: 'Username, email and password are required.' });
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
        }
        if (!ROLES.includes(role)) {
            return res.status(400).json({ message: `Role must be one of: ${ROLES.join(', ')}.` });
        }
        if (await User.exists({ $or: [{ email }, { username }] })) {
            return res.status(409).json({ message: 'A user with that username or email already exists.' });
        }

        const user = await User.create({ username, email, role, password: await bcrypt.hash(password, 10) });
        await audit.fromReq(req, 'user.created', {
            targetType: 'user', targetId: user._id, summary: `Created ${role} account "${username}"`, meta: { role }
        });
        return res.status(201).json(publicUser(user));
    } catch (error) {
        return handleError(res, error);
    }
});

router.patch('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const changes = {};
        if (Object.hasOwn(req.body, 'username')) changes.username = String(req.body.username).trim();
        if (Object.hasOwn(req.body, 'email')) changes.email = String(req.body.email).trim().toLowerCase();
        if (Object.hasOwn(req.body, 'role') && req.body.role !== user.role) {
            if (!ROLES.includes(req.body.role)) {
                return res.status(400).json({ message: `Role must be one of: ${ROLES.join(', ')}.` });
            }
            if (String(user._id) === req.user.id) {
                return res.status(409).json({ message: 'You cannot change your own role.' });
            }
            if (user.role === 'admin' && !(await otherActiveAdmins(user._id))) {
                return res.status(409).json({ message: 'At least one active administrator must remain.' });
            }
            changes.role = req.body.role;
            if (changes.role !== 'responder') changes.unit = null;
        }
        if (!Object.keys(changes).length) return res.status(400).json({ message: 'Nothing to update.' });

        Object.assign(user, changes);
        await user.save();
        await audit.fromReq(req, 'user.updated', {
            targetType: 'user', targetId: user._id, summary: `Updated account "${user.username}"`, meta: changes
        });
        return res.json(publicUser(user));
    } catch (error) {
        return handleError(res, error);
    }
});

router.post('/users/:id/suspend', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });
        if (String(user._id) === req.user.id) {
            return res.status(409).json({ message: 'You cannot suspend your own account.' });
        }
        if (user.role === 'admin' && !user.suspended && !(await otherActiveAdmins(user._id))) {
            return res.status(409).json({ message: 'At least one active administrator must remain.' });
        }
        const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 200) : '';

        user.suspended = true;
        user.suspendedReason = reason || null;
        user.suspendedAt = new Date();
        await user.save();
        events.disconnectUser(user._id, 'account:suspended', { reason });
        await audit.fromReq(req, 'user.suspended', {
            targetType: 'user', targetId: user._id, summary: `Suspended "${user.username}"${reason ? `: ${reason}` : ''}`
        });
        return res.json(publicUser(user));
    } catch (error) {
        return handleError(res, error);
    }
});

router.post('/users/:id/reactivate', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });
        user.suspended = false;
        user.suspendedReason = null;
        user.suspendedAt = null;
        await user.save();
        await audit.fromReq(req, 'user.reactivated', {
            targetType: 'user', targetId: user._id, summary: `Reactivated "${user.username}"`
        });
        return res.json(publicUser(user));
    } catch (error) {
        return handleError(res, error);
    }
});

router.post('/users/:id/reset-password', async (req, res) => {
    try {
        const { password } = req.body;
        if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
        }
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });
        user.password = await bcrypt.hash(password, 10);
        await user.save();
        // Existing sessions keep working until they expire (8 h); suspend first if that matters.
        await audit.fromReq(req, 'user.password_reset', {
            targetType: 'user', targetId: user._id, summary: `Reset password for "${user.username}"`
        });
        return res.json({ message: 'Password updated.' });
    } catch (error) {
        return handleError(res, error);
    }
});

// ---------- Unit suspension ----------
// Registering/editing/deleting units reuses /api/resources (open to admins).

router.post('/units/:id/suspend', async (req, res) => {
    try {
        const unit = await Resource.findById(req.params.id);
        if (!unit) return res.status(404).json({ message: 'Unit not found.' });
        if (unit.status === 'suspended') return res.status(409).json({ message: 'This unit is already suspended.' });
        if (unit.status === 'dispatched' && req.body.force !== true) {
            return res.status(409).json({
                message: 'This unit is on a dispatch. Suspending it will release it from the incident; confirm to continue.',
                code: 'unit_dispatched'
            });
        }
        const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 200) : '';
        const previousIncidentId = unit.assignedIncident ? String(unit.assignedIncident) : null;

        const updated = await Resource.findOneAndUpdate(
            { _id: unit._id, status: { $ne: 'suspended' } },
            { $set: { status: 'suspended', assignedIncident: null, progress: null, suspendedReason: reason || null } },
            { returnDocument: 'after' }
        );
        if (!updated) return res.status(409).json({ message: 'This unit was changed by someone else. Refresh and try again.' });

        await createResourceAlert(updated, 'resource_status_changed');
        await audit.fromReq(req, 'unit.suspended', {
            targetType: 'resource', targetId: unit._id,
            summary: `Suspended ${unit.name} (${unit.unitCode})${reason ? `: ${reason}` : ''}`,
            meta: { releasedIncident: previousIncidentId }
        });
        events.publishToDispatchers('unit:status', { ...updated.toObject(), online: false });
        events.publishToUnit(unit._id, 'unit:suspended', { reason });
        if (previousIncidentId) events.publishToUnit(unit._id, 'dispatch:released', { incidentId: previousIncidentId });
        return res.json(updated);
    } catch (error) {
        return handleError(res, error);
    }
});

router.post('/units/:id/reactivate', async (req, res) => {
    try {
        const updated = await Resource.findOneAndUpdate(
            { _id: req.params.id, status: 'suspended' },
            { $set: { status: 'offline', suspendedReason: null } },
            { returnDocument: 'after' }
        );
        if (!updated) {
            const exists = await Resource.exists({ _id: req.params.id });
            return res.status(exists ? 409 : 404).json({ message: exists ? 'This unit is not suspended.' : 'Unit not found.' });
        }
        await createResourceAlert(updated, 'resource_status_changed');
        await audit.fromReq(req, 'unit.reactivated', {
            targetType: 'resource', targetId: updated._id, summary: `Reactivated ${updated.name} (${updated.unitCode}); it is offline until its operator goes online`
        });
        events.publishToDispatchers('unit:status', { ...updated.toObject(), online: false });
        return res.json(updated);
    } catch (error) {
        return handleError(res, error);
    }
});

module.exports = router;

// Endpoints for the field-unit app. Mounted at /api/me for role "responder".
const express = require('express');
const User = require('../models/User');
const Resource = require('../models/Resource');
const { createResourceAlert } = require('../services/alertService');
const { publishToDispatchers } = require('../services/events');
const { getRoute } = require('../services/routing');
const { isOnline } = require('../services/presence');

const router = express.Router();

// What each progress step may follow. A freshly dispatched unit is "assigned".
const TRANSITIONS = {
    accepted: ['assigned'],
    on_scene: ['assigned', 'accepted'],
    completed: ['accepted', 'on_scene']
};

function handleError(res, error) {
    if (error.operationCommitted) {
        console.error('Unit change completed but its alert was not recorded:', error);
        return res.status(503).json({ message: 'The change was saved, but its alert could not be recorded.' });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
        return res.status(400).json({ message: error.message });
    }
    console.error('Unit API error:', error);
    return res.status(500).json({ message: 'Unable to process the unit request.' });
}

// Loads the responder's linked unit (assignedIncident populated) or answers 404.
async function loadUnit(req, res) {
    const user = await User.findById(req.user.id).select('unit').lean();
    if (!user?.unit) {
        res.status(404).json({ message: 'No unit is linked to this account. Ask a dispatcher to link one.' });
        return null;
    }
    const unit = await Resource.findById(user.unit).populate('assignedIncident');
    if (!unit) {
        res.status(404).json({ message: 'The unit linked to this account no longer exists.' });
        return null;
    }
    return unit;
}

function serialize(unit) {
    const data = unit.toObject();
    const incident = data.assignedIncident || null;
    data.assignedIncident = incident?._id ?? null;
    return {
        unit: { ...data, online: isOnline(data) },
        assignment: incident,
        progress: incident ? (data.progress || 'assigned') : null
    };
}

router.get('/unit', async (req, res) => {
    try {
        const unit = await loadUnit(req, res);
        if (!unit) return;
        return res.json(serialize(unit));
    } catch (error) {
        return handleError(res, error);
    }
});

router.patch('/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['available', 'offline'].includes(status)) {
            return res.status(400).json({ message: 'Status must be "available" or "offline".' });
        }
        const unit = await loadUnit(req, res);
        if (!unit) return;
        if (unit.status === 'dispatched') {
            return res.status(409).json({ message: 'Finish your current dispatch before changing availability.' });
        }

        const update = { status };
        if (status === 'available') update.lastSeen = new Date();
        const updated = await Resource.findOneAndUpdate(
            { _id: unit._id, status: { $ne: 'dispatched' } },
            { $set: update },
            { returnDocument: 'after' }
        );
        if (!updated) {
            return res.status(409).json({ message: 'Finish your current dispatch before changing availability.' });
        }
        if (updated.status !== unit.status) {
            await createResourceAlert(updated, 'resource_status_changed');
        }
        publishToDispatchers('unit:status', { ...updated.toObject(), online: isOnline(updated) });
        return res.json({ unit: { ...updated.toObject(), online: isOnline(updated) } });
    } catch (error) {
        return handleError(res, error);
    }
});

router.post('/location', async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const valid = typeof latitude === 'number' && typeof longitude === 'number'
            && Number.isFinite(latitude) && Number.isFinite(longitude)
            && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
        if (!valid) {
            return res.status(400).json({ message: 'Latitude and longitude must be numbers in decimal degrees.' });
        }
        const user = await User.findById(req.user.id).select('unit').lean();
        if (!user?.unit) return res.status(404).json({ message: 'No unit is linked to this account.' });

        const lastSeen = new Date();
        const updated = await Resource.findOneAndUpdate(
            { _id: user.unit, status: { $ne: 'offline' } },
            { $set: { latitude, longitude, lastSeen } },
            { returnDocument: 'after' }
        );
        if (!updated) {
            return res.status(409).json({ message: 'Go online before sending location updates.' });
        }
        publishToDispatchers('unit:location', {
            resourceId: updated._id,
            latitude,
            longitude,
            lastSeen,
            status: updated.status
        });
        return res.json({ lastSeen });
    } catch (error) {
        return handleError(res, error);
    }
});

router.patch('/assignment', async (req, res) => {
    try {
        const { progress } = req.body;
        if (!TRANSITIONS[progress]) {
            return res.status(400).json({ message: 'Progress must be "accepted", "on_scene" or "completed".' });
        }
        const unit = await loadUnit(req, res);
        if (!unit) return;
        if (unit.status !== 'dispatched' || !unit.assignedIncident) {
            return res.status(409).json({ message: 'This unit has no active dispatch.' });
        }
        const current = unit.progress || 'assigned';
        if (!TRANSITIONS[progress].includes(current)) {
            return res.status(409).json({ message: `Cannot move from "${current}" to "${progress}".` });
        }

        const incident = unit.assignedIncident;
        const update = progress === 'completed'
            ? { status: 'available', assignedIncident: null, progress: null, lastSeen: new Date() }
            : { progress };
        const updated = await Resource.findOneAndUpdate(
            { _id: unit._id, status: 'dispatched', progress: unit.progress ?? null },
            { $set: update },
            { returnDocument: 'after' }
        );
        if (!updated) {
            return res.status(409).json({ message: 'The dispatch changed. Reload and try again.' });
        }

        await createResourceAlert(updated, progress === 'completed' ? 'resource_released' : 'resource_progress', incident);
        publishToDispatchers('unit:status', { ...updated.toObject(), online: isOnline(updated) });
        await updated.populate('assignedIncident');
        return res.json(serialize(updated));
    } catch (error) {
        return handleError(res, error);
    }
});

// Driving route from the unit's last known position to its assigned incident.
router.get('/route', async (req, res) => {
    try {
        const unit = await loadUnit(req, res);
        if (!unit) return;
        const incident = unit.assignedIncident;
        if (!incident) return res.status(404).json({ message: 'This unit has no active dispatch.' });

        const from = { lat: unit.latitude, lng: unit.longitude };
        const to = { lat: incident.latitude, lng: incident.longitude };
        const route = await getRoute(from, to);
        return res.json({ ...route, from, to, incidentId: incident._id });
    } catch (error) {
        return handleError(res, error);
    }
});

module.exports = router;

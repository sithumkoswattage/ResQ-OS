const express = require('express');
const Incident = require('../models/Incident');
const Resource = require('../models/Resource');
const { createIncidentAlert, createResourceAlert } = require('../services/alertService');
const { rankByDistance } = require('../services/geo');
const { getRoute } = require('../services/routing');
const { isOnline } = require('../services/presence');
const { publishToDispatchers, publishToUnit } = require('../services/events');

const router = express.Router();

function handleError(res, error) {
    if (error.operationCommitted) {
        console.error('Incident saved but its alert was not recorded:', error);
        return res.status(503).json({
            message: 'The incident was saved, but its alert could not be recorded. Refresh the incident before retrying.'
        });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
        return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
        return res.status(409).json({ message: 'An incident with that code already exists.' });
    }
    console.error('Incident API error:', error);
    return res.status(500).json({ message: 'Unable to process the incident request.' });
}

router.get('/', async (req, res) => {
    try {
        const incidents = await Incident.find().sort({ createdAt: -1 }).lean();
        return res.json(incidents);
    } catch (error) {
        return handleError(res, error);
    }
});

router.post('/', async (req, res) => {
    try {
        const incident = await Incident.create({
            title: req.body.title,
            type: req.body.type,
            description: req.body.description,
            location: req.body.location,
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            priority: req.body.priority
        });
        await createIncidentAlert(incident);
        publishToDispatchers('incident:created', incident.toObject());
        return res.status(201).json(incident);
    } catch (error) {
        return handleError(res, error);
    }
});

router.get('/:id', async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id).lean();
        if (!incident) return res.status(404).json({ message: 'Incident not found.' });
        return res.json(incident);
    } catch (error) {
        return handleError(res, error);
    }
});

router.get('/:id/nearby-resources', async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id).lean();
        if (!incident) return res.status(404).json({ message: 'Incident not found.' });
        if (incident.status !== 'active') {
            return res.status(409).json({ message: 'Nearby units are only suggested for active incidents.' });
        }

        const requestedLimit = Number.parseInt(req.query.limit, 10);
        const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 20) : 5;
        const filter = { status: 'available' };
        if (typeof req.query.type === 'string' && req.query.type.trim()) {
            const escaped = req.query.type.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.type = new RegExp(escaped, 'i');
        }

        const available = await Resource.find(filter).lean();
        let pool = available.map((unit) => ({ ...unit, online: isOnline(unit) }));
        if (req.query.onlineOnly === 'true') pool = pool.filter((unit) => unit.online);

        // Online units first, then nearest. The straight-line pass is cheap.
        const byProximity = (a, b) => Number(b.online) - Number(a.online) || a.distanceKm - b.distanceKm;
        let resources = rankByDistance(pool, incident.latitude, incident.longitude).sort(byProximity);

        if (req.query.routing === 'true') {
            // Re-rank the closest candidates by estimated drive time.
            const candidates = resources.slice(0, Math.min(limit * 2, 10));
            const routed = await Promise.all(candidates.map(async (unit) => {
                const route = await getRoute(
                    { lat: unit.latitude, lng: unit.longitude },
                    { lat: incident.latitude, lng: incident.longitude }
                );
                return { ...unit, durationMin: route.durationMin, routeDistanceKm: route.distanceKm, routeSource: route.source };
            }));
            resources = routed.sort((a, b) => Number(b.online) - Number(a.online) || a.durationMin - b.durationMin);
        }
        resources = resources.slice(0, limit);
        return res.json({
            incident: {
                _id: incident._id,
                code: incident.code,
                latitude: incident.latitude,
                longitude: incident.longitude
            },
            resources
        });
    } catch (error) {
        return handleError(res, error);
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const currentIncident = await Incident.findById(req.params.id);
        if (!currentIncident) return res.status(404).json({ message: 'Incident not found.' });

        const updates = {};
        for (const field of ['title', 'type', 'description', 'location', 'latitude', 'longitude', 'priority', 'status']) {
            if (Object.hasOwn(req.body, field)) updates[field] = req.body[field];
        }

        const incident = await Incident.findByIdAndUpdate(req.params.id, updates, {
            returnDocument: 'after',
            runValidators: true
        });
        if (incident.status === 'resolved' && currentIncident.status !== 'resolved') {
            const assignedResources = await Resource.find({ assignedIncident: incident._id });
            await Resource.updateMany(
                { assignedIncident: incident._id },
                { $set: { status: 'available', assignedIncident: null, progress: null } }
            );
            await Promise.all(assignedResources.map((resource) =>
                createResourceAlert({ ...resource.toObject(), status: 'available' }, 'resource_released')
            ));
            await createIncidentAlert(incident, 'incident_resolved');
            for (const resource of assignedResources) {
                publishToUnit(resource._id, 'dispatch:released', { incidentId: incident._id });
                publishToDispatchers('unit:status', {
                    ...resource.toObject(),
                    status: 'available',
                    assignedIncident: null,
                    progress: null
                });
            }
        }
        publishToDispatchers('incident:updated', incident.toObject());

        return res.json(incident);
    } catch (error) {
        return handleError(res, error);
    }
});

module.exports = router;

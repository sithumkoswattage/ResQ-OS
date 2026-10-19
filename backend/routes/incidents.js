const express = require('express');
const Incident = require('../models/Incident');
const Resource = require('../models/Resource');
const { createIncidentAlert, createResourceAlert } = require('../services/alertService');

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
                { $set: { status: 'available', assignedIncident: null } }
            );
            await Promise.all(assignedResources.map((resource) =>
                createResourceAlert({ ...resource.toObject(), status: 'available' }, 'resource_released')
            ));
            await createIncidentAlert(incident, 'incident_resolved');
        }

        return res.json(incident);
    } catch (error) {
        return handleError(res, error);
    }
});

module.exports = router;

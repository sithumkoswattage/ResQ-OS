const express = require('express');
const Incident = require('../models/Incident');
const Resource = require('../models/Resource');
const { createResourceAlert } = require('../services/alertService');

const router = express.Router();

function handleError(res, error) {
    if (error.operationCommitted) {
        console.error('Resource change completed but its alert was not recorded:', error);
        return res.status(503).json({
            message: 'The resource change completed, but its alert could not be recorded. Refresh before retrying.'
        });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
        return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
        return res.status(409).json({ message: 'A resource with that unit code already exists.' });
    }
    console.error('Resource API error:', error);
    return res.status(500).json({ message: 'Unable to process the resource request.' });
}

router.get('/', async (req, res) => {
    try {
        const resources = await Resource.find()
            .populate('assignedIncident', 'code title status')
            .sort({ unitCode: 1 })
            .lean();
        return res.json(resources);
    } catch (error) {
        return handleError(res, error);
    }
});

router.post('/', async (req, res) => {
    try {
        if (req.body.status === 'dispatched') {
            return res.status(400).json({ message: 'Assign a resource to an incident to mark it dispatched.' });
        }
        const resource = await Resource.create({
            unitCode: req.body.unitCode,
            name: req.body.name,
            type: req.body.type,
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            status: req.body.status
        });
        await createResourceAlert(resource, 'resource_added');
        return res.status(201).json(resource);
    } catch (error) {
        return handleError(res, error);
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) return res.status(404).json({ message: 'Resource not found.' });
        if (resource.status === 'dispatched') {
            return res.status(409).json({ message: 'Unassign this resource before editing its details.' });
        }

        const previousStatus = resource.status;
        for (const field of ['unitCode', 'name', 'type', 'latitude', 'longitude', 'status']) {
            if (Object.hasOwn(req.body, field)) resource[field] = req.body[field];
        }
        if (resource.status === 'dispatched') {
            return res.status(400).json({ message: 'Assign a resource to an incident to mark it dispatched.' });
        }
        await resource.save();
        if (resource.status !== previousStatus) {
            await createResourceAlert(resource, 'resource_status_changed');
        }
        return res.json(resource);
    } catch (error) {
        return handleError(res, error);
    }
});

router.patch('/:id/assignment', async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) return res.status(404).json({ message: 'Resource not found.' });
        if (!Object.hasOwn(req.body, 'incidentId')) {
            return res.status(400).json({ message: 'Incident ID is required; use null to release a resource.' });
        }

        const incidentId = req.body.incidentId;
        const previousIncidentId = resource.assignedIncident?.toString() || null;
        if (incidentId === null || incidentId === '') {
            resource.assignedIncident = null;
            resource.status = 'available';
        } else {
            if (resource.status === 'offline') {
                return res.status(409).json({ message: 'An offline resource cannot be dispatched.' });
            }
            const incident = await Incident.findById(incidentId);
            if (!incident) return res.status(404).json({ message: 'Incident not found.' });
            if (incident.status !== 'active') {
                return res.status(409).json({ message: 'A resource can only be assigned to an active incident.' });
            }
            resource.assignedIncident = incident._id;
            resource.status = 'dispatched';
        }

        await resource.save();
        const currentIncidentId = resource.assignedIncident?.toString() || null;
        if (previousIncidentId !== currentIncidentId) {
            if (currentIncidentId) {
                const incident = await Incident.findById(currentIncidentId);
                await createResourceAlert(resource, 'resource_dispatched', incident);
            } else if (previousIncidentId) {
                await createResourceAlert(resource, 'resource_released');
            }
        }
        await resource.populate('assignedIncident', 'code title status');
        return res.json(resource);
    } catch (error) {
        return handleError(res, error);
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) return res.status(404).json({ message: 'Resource not found.' });
        if (resource.status === 'dispatched') {
            return res.status(409).json({ message: 'Unassign this resource before removing it.' });
        }
        await resource.deleteOne();
        await createResourceAlert(resource, 'resource_removed');
        return res.status(204).end();
    } catch (error) {
        return handleError(res, error);
    }
});

module.exports = router;

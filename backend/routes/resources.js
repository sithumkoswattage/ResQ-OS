const express = require('express');
const Incident = require('../models/Incident');
const Resource = require('../models/Resource');
const User = require('../models/User');
const Equipment = require('../models/Equipment');
const audit = require('../services/audit');
const { createResourceAlert } = require('../services/alertService');
const { publishToDispatchers, publishToUnit } = require('../services/events');
const { isOnline } = require('../services/presence');

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
        const operators = await User.find({ unit: { $ne: null } }).select('username email unit').lean();
        const operatorByUnit = new Map(operators.map((user) => [String(user.unit), {
            id: user._id,
            username: user.username,
            email: user.email
        }]));
        return res.json(resources.map((resource) => ({
            ...resource,
            online: isOnline(resource),
            operator: operatorByUnit.get(String(resource._id)) || null
        })));
    } catch (error) {
        return handleError(res, error);
    }
});

router.post('/', async (req, res) => {
    try {
        if (req.body.status === 'dispatched') {
            return res.status(400).json({ message: 'Assign a resource to an incident to mark it dispatched.' });
        }
        if (req.body.status === 'suspended') {
            return res.status(400).json({ message: 'Use the administrator suspend action to suspend a unit.' });
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
        await audit.fromReq(req, 'resource.created', {
            targetType: 'resource', targetId: resource._id, summary: `Registered ${resource.name} (${resource.unitCode})`
        });
        publishToDispatchers('unit:status', resource.toObject());
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
        if (resource.status === 'suspended') {
            return res.status(409).json({ message: 'This unit is suspended by an administrator. Reactivate it before editing.' });
        }

        const previousStatus = resource.status;
        for (const field of ['unitCode', 'name', 'type', 'latitude', 'longitude', 'status']) {
            if (Object.hasOwn(req.body, field)) resource[field] = req.body[field];
        }
        if (resource.status === 'dispatched') {
            return res.status(400).json({ message: 'Assign a resource to an incident to mark it dispatched.' });
        }
        if (resource.status === 'suspended') {
            return res.status(400).json({ message: 'Use the administrator suspend action to suspend a unit.' });
        }
        await resource.save();
        if (resource.status !== previousStatus) {
            await createResourceAlert(resource, 'resource_status_changed');
        }
        await audit.fromReq(req, 'resource.updated', {
            targetType: 'resource', targetId: resource._id, summary: `Updated ${resource.name} (${resource.unitCode})`
        });
        publishToDispatchers('unit:status', { ...resource.toObject(), online: isOnline(resource) });
        return res.json(resource);
    } catch (error) {
        return handleError(res, error);
    }
});

router.patch('/:id/assignment', async (req, res) => {
    try {
        let resource = await Resource.findById(req.params.id);
        if (!resource) return res.status(404).json({ message: 'Resource not found.' });
        if (!Object.hasOwn(req.body, 'incidentId')) {
            return res.status(400).json({ message: 'Incident ID is required; use null to release a resource.' });
        }

        const incidentId = req.body.incidentId;
        const previousIncidentId = resource.assignedIncident?.toString() || null;
        const releasing = incidentId === null || incidentId === '';
        let update;
        let dispatchedIncident = null;
        // Compare-and-set on the assignment we just read, so two dispatchers
        // cannot both claim the same unit.
        const guard = { _id: resource._id, assignedIncident: resource.assignedIncident ?? null };
        if (releasing) {
            if (resource.status === 'suspended') {
                return res.status(409).json({ message: 'This unit is suspended by an administrator.' });
            }
            update = { assignedIncident: null, status: 'available', progress: null };
        } else {
            if (resource.status === 'offline' || resource.status === 'suspended') {
                return res.status(409).json({ message: `A ${resource.status} resource cannot be dispatched.` });
            }
            const incident = await Incident.findById(incidentId);
            if (!incident) return res.status(404).json({ message: 'Incident not found.' });
            if (incident.status !== 'active') {
                return res.status(409).json({ message: 'A resource can only be assigned to an active incident.' });
            }
            update = { assignedIncident: incident._id, status: 'dispatched', progress: 'assigned' };
            dispatchedIncident = incident;
            guard.status = { $ne: 'offline' };
        }

        const updated = await Resource.findOneAndUpdate(guard, { $set: update }, {
            returnDocument: 'after',
            runValidators: true
        });
        if (!updated) {
            return res.status(409).json({ message: 'This unit was changed by someone else. Refresh and try again.' });
        }
        resource = updated;
        const currentIncidentId = resource.assignedIncident?.toString() || null;
        if (previousIncidentId !== currentIncidentId) {
            if (currentIncidentId) {
                const incident = await Incident.findById(currentIncidentId);
                await createResourceAlert(resource, 'resource_dispatched', incident);
            } else if (previousIncidentId) {
                await createResourceAlert(resource, 'resource_released');
            }
        }
        publishToDispatchers('unit:status', { ...resource.toObject(), online: isOnline(resource) });
        if (dispatchedIncident) {
            publishToUnit(resource._id, 'dispatch:assigned', {
                incident: dispatchedIncident.toObject(),
                progress: 'assigned'
            });
        } else if (previousIncidentId) {
            publishToUnit(resource._id, 'dispatch:released', { incidentId: previousIncidentId });
        }
        if (dispatchedIncident) {
            await audit.fromReq(req, 'resource.dispatched', {
                targetType: 'resource', targetId: resource._id,
                summary: `Dispatched ${resource.name} (${resource.unitCode}) to ${dispatchedIncident.code}`,
                meta: { incidentId: String(dispatchedIncident._id) }
            });
        } else if (previousIncidentId) {
            await audit.fromReq(req, 'resource.released', {
                targetType: 'resource', targetId: resource._id, summary: `Released ${resource.name} (${resource.unitCode})`
            });
        }
        await resource.populate('assignedIncident', 'code title status');
        return res.json(resource);
    } catch (error) {
        return handleError(res, error);
    }
});

router.put('/:id/operator', async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) return res.status(404).json({ message: 'Resource not found.' });
        if (!Object.hasOwn(req.body, 'email')) {
            return res.status(400).json({ message: 'Email is required; use null to unlink the operator.' });
        }

        if (req.body.email === null) {
            await User.updateMany({ unit: resource._id }, { $set: { unit: null } });
            await audit.fromReq(req, 'resource.operator_unlinked', {
                targetType: 'resource', targetId: resource._id, summary: `Unlinked the operator from ${resource.unitCode}`
            });
            return res.json({ operator: null });
        }

        const email = String(req.body.email).trim();
        const user = await User.findOne({ email, role: 'responder' }).collation({ locale: 'en', strength: 2 });
        if (!user) return res.status(404).json({ message: 'No responder account with that email.' });
        if (user.unit && String(user.unit) !== String(resource._id)) {
            return res.status(409).json({ message: 'That account is already linked to another unit.' });
        }

        // One operator per unit: unlink anyone else first.
        await User.updateMany({ unit: resource._id, _id: { $ne: user._id } }, { $set: { unit: null } });
        user.unit = resource._id;
        await user.save();
        await audit.fromReq(req, 'resource.operator_linked', {
            targetType: 'resource', targetId: resource._id, summary: `Linked "${user.username}" to ${resource.unitCode}`
        });
        return res.json({ operator: { id: user._id, username: user.username, email: user.email } });
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
        await User.updateMany({ unit: resource._id }, { $set: { unit: null } });
        await Equipment.updateMany({ assignedUnit: resource._id }, { $set: { assignedUnit: null } });
        await audit.fromReq(req, 'resource.deleted', {
            targetType: 'resource', targetId: resource._id, summary: `Removed ${resource.name} (${resource.unitCode})`
        });
        publishToDispatchers('unit:removed', { resourceId: resource._id });
        await createResourceAlert(resource, 'resource_removed');
        return res.status(204).end();
    } catch (error) {
        return handleError(res, error);
    }
});

module.exports = router;

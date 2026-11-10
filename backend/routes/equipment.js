// Equipment inventory. Mounted at /api/equipment for dispatchers and admins;
// only admins may change anything.
const express = require('express');
const Equipment = require('../models/Equipment');
const Resource = require('../models/Resource');
const audit = require('../services/audit');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const WRITABLE = ['assetTag', 'name', 'category', 'status', 'quantity', 'notes', 'nextServiceDue'];

function handleError(res, error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
        return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
        return res.status(409).json({ message: 'Equipment with that asset tag already exists.' });
    }
    console.error('Equipment API error:', error);
    return res.status(500).json({ message: 'Unable to process the equipment request.' });
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (typeof req.query.status === 'string' && req.query.status) filter.status = req.query.status;
        if (typeof req.query.category === 'string' && req.query.category) filter.category = req.query.category;
        if (req.query.assignedUnit === 'none') filter.assignedUnit = null;
        else if (typeof req.query.assignedUnit === 'string' && req.query.assignedUnit) filter.assignedUnit = req.query.assignedUnit;
        if (typeof req.query.q === 'string' && req.query.q.trim()) {
            const pattern = new RegExp(escapeRegex(req.query.q.trim()), 'i');
            filter.$or = [{ name: pattern }, { assetTag: pattern }];
        }
        const items = await Equipment.find(filter).populate('assignedUnit', 'unitCode name status').sort({ assetTag: 1 }).lean();
        return res.json(items);
    } catch (error) {
        return handleError(res, error);
    }
});

router.get('/:id', async (req, res) => {
    try {
        const item = await Equipment.findById(req.params.id).populate('assignedUnit', 'unitCode name status').lean();
        if (!item) return res.status(404).json({ message: 'Equipment not found.' });
        return res.json(item);
    } catch (error) {
        return handleError(res, error);
    }
});

router.post('/', requireRole('admin'), async (req, res) => {
    try {
        const data = {};
        for (const field of WRITABLE) if (Object.hasOwn(req.body, field)) data[field] = req.body[field];
        if (req.body.assignedUnit) {
            if (!(await Resource.exists({ _id: req.body.assignedUnit }))) {
                return res.status(404).json({ message: 'Unit not found.' });
            }
            if (data.status && data.status !== 'serviceable') {
                return res.status(409).json({ message: 'Only serviceable equipment can be assigned to a unit.' });
            }
            data.assignedUnit = req.body.assignedUnit;
        }
        const item = await Equipment.create(data);
        await audit.fromReq(req, 'equipment.created', {
            targetType: 'equipment', targetId: item._id, summary: `Registered ${item.name} (${item.assetTag})`
        });
        return res.status(201).json(item);
    } catch (error) {
        return handleError(res, error);
    }
});

router.patch('/:id', requireRole('admin'), async (req, res) => {
    try {
        const item = await Equipment.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Equipment not found.' });
        const changes = {};
        for (const field of WRITABLE) if (Object.hasOwn(req.body, field)) changes[field] = req.body[field];
        if (!Object.keys(changes).length) return res.status(400).json({ message: 'Nothing to update.' });

        Object.assign(item, changes);
        // Gear that is out of service cannot stay on a vehicle.
        if (item.status !== 'serviceable') item.assignedUnit = null;
        await item.save();
        await audit.fromReq(req, 'equipment.updated', {
            targetType: 'equipment', targetId: item._id, summary: `Updated ${item.name} (${item.assetTag})`, meta: changes
        });
        return res.json(item);
    } catch (error) {
        return handleError(res, error);
    }
});

router.post('/:id/assign', requireRole('admin'), async (req, res) => {
    try {
        if (!Object.hasOwn(req.body, 'unitId')) {
            return res.status(400).json({ message: 'unitId is required; use null to unassign.' });
        }
        const item = await Equipment.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Equipment not found.' });

        let unit = null;
        if (req.body.unitId) {
            if (item.status !== 'serviceable') {
                return res.status(409).json({ message: 'Only serviceable equipment can be assigned to a unit.' });
            }
            unit = await Resource.findById(req.body.unitId);
            if (!unit) return res.status(404).json({ message: 'Unit not found.' });
        }
        item.assignedUnit = unit ? unit._id : null;
        await item.save();
        await audit.fromReq(req, unit ? 'equipment.assigned' : 'equipment.unassigned', {
            targetType: 'equipment', targetId: item._id,
            summary: unit ? `Assigned ${item.name} (${item.assetTag}) to ${unit.unitCode}` : `Unassigned ${item.name} (${item.assetTag})`
        });
        return res.json(await item.populate('assignedUnit', 'unitCode name status'));
    } catch (error) {
        return handleError(res, error);
    }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
    try {
        const item = await Equipment.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Equipment not found.' });
        await item.deleteOne();
        await audit.fromReq(req, 'equipment.deleted', {
            targetType: 'equipment', targetId: item._id, summary: `Deleted ${item.name} (${item.assetTag})`
        });
        return res.status(204).end();
    } catch (error) {
        return handleError(res, error);
    }
});

module.exports = router;

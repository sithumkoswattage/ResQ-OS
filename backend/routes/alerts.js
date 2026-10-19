const express = require('express');
const mongoose = require('mongoose');
const Alert = require('../models/Alert');

const router = express.Router();

function handleError(res, error) {
    if (error.name === 'CastError' || error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
    }
    console.error('Alerts API error:', error);
    return res.status(500).json({ message: 'Unable to process the alerts request.' });
}

router.get('/', async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const status = req.query.status || 'all';
        const category = req.query.category || 'all';
        if (!['all', 'read', 'unread'].includes(status)) {
            return res.status(400).json({ message: 'Status must be all, read, or unread.' });
        }
        if (!['all', 'incidents', 'resources'].includes(category)) {
            return res.status(400).json({ message: 'Category must be all, incidents, or resources.' });
        }

        const filter = {};
        if (status === 'unread') filter.readBy = { $ne: userId };
        if (status === 'read') filter.readBy = userId;
        if (category === 'incidents') filter.sourceType = 'incident';
        if (category === 'resources') filter.sourceType = 'resource';
        const requestedLimit = Number.parseInt(req.query.limit, 10);
        const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;

        const [alerts, unreadCount] = await Promise.all([
            Alert.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
            Alert.countDocuments({
                readBy: { $ne: userId },
                ...(category === 'all' ? {} : { sourceType: category === 'incidents' ? 'incident' : 'resource' })
            })
        ]);

        return res.json({
            alerts: alerts.map(({ readBy, ...alert }) => ({
                ...alert,
                isRead: readBy.some((reader) => reader.equals(userId))
            })),
            unreadCount
        });
    } catch (error) {
        return handleError(res, error);
    }
});

router.patch('/read-all', async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const result = await Alert.updateMany(
            { readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
        );
        return res.json({ markedRead: result.modifiedCount });
    } catch (error) {
        return handleError(res, error);
    }
});

router.patch('/:id/read', async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const alert = await Alert.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { readBy: userId } },
            { returnDocument: 'after' }
        ).lean();
        if (!alert) return res.status(404).json({ message: 'Alert not found.' });
        const { readBy, ...alertData } = alert;
        return res.json({ ...alertData, isRead: readBy.some((reader) => reader.equals(userId)) });
    } catch (error) {
        return handleError(res, error);
    }
});

module.exports = router;

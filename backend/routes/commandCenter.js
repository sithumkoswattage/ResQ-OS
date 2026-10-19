const express = require('express');
const Incident = require('../models/Incident');
const Resource = require('../models/Resource');

const router = express.Router();

router.get('/overview', async (req, res) => {
    try {
        const [incidents, resources] = await Promise.all([
            Incident.find({ status: 'active' }).sort({ createdAt: -1 }).lean(),
            Resource.find()
                .populate('assignedIncident', 'code title status')
                .sort({ unitCode: 1 })
                .lean()
        ]);

        return res.json({
            incidents,
            resources,
            summary: {
                activeIncidents: incidents.length,
                availableResources: resources.filter((resource) => resource.status === 'available').length,
                dispatchedResources: resources.filter((resource) => resource.status === 'dispatched').length,
                offlineResources: resources.filter((resource) => resource.status === 'offline').length
            }
        });
    } catch (error) {
        console.error('Command Center API error:', error);
        return res.status(500).json({ message: 'Unable to load Command Center data.' });
    }
});

module.exports = router;

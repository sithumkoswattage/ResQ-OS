const { randomUUID } = require('node:crypto');
const Alert = require('../models/Alert');
const Incident = require('../models/Incident');
const Resource = require('../models/Resource');
const mongoose = require('mongoose');

function incidentSeverity(priority) {
    if (priority === 'critical') return 'critical';
    if (priority === 'high') return 'warning';
    return 'info';
}

async function recordAlert(alert) {
    try {
        return await Alert.create({
            ...alert,
            dedupeKey: alert.dedupeKey || randomUUID()
        });
    } catch (error) {
        error.operationCommitted = true;
        throw error;
    }
}

async function createIncidentAlert(incident, type = 'incident_created') {
    const resolved = type === 'incident_resolved';
    return recordAlert({
        type,
        severity: resolved ? 'info' : incidentSeverity(incident.priority),
        title: resolved ? `Incident resolved: ${incident.code}` : `New ${incident.priority} priority incident`,
        message: resolved
            ? `${incident.title} in ${incident.location} was resolved.`
            : `${incident.code}: ${incident.title} reported at ${incident.location}.`,
        sourceType: 'incident',
        sourceId: incident._id
    });
}

async function createResourceAlert(resource, type, incident = null) {
    const messages = {
        resource_added: {
            severity: 'info',
            title: 'Resource added',
            message: `${resource.name} (${resource.unitCode}) was added to the fleet.`
        },
        resource_dispatched: {
            severity: 'warning',
            title: 'Resource dispatched',
            message: incident
                ? `${resource.name} (${resource.unitCode}) was dispatched to ${incident.code}: ${incident.title}.`
                : `${resource.name} (${resource.unitCode}) was dispatched.`
        },
        resource_released: {
            severity: 'info',
            title: 'Resource released',
            message: `${resource.name} (${resource.unitCode}) is available.`
        },
        resource_removed: {
            severity: 'info',
            title: 'Resource removed',
            message: `${resource.name} (${resource.unitCode}) was removed from the fleet.`
        },
        resource_status_changed: {
            severity: resource.status === 'offline' ? 'warning' : 'info',
            title: `Resource ${resource.status}`,
            message: `${resource.name} (${resource.unitCode}) is now ${resource.status}.`
        }
    };
    const details = messages[type];
    if (!details) throw new Error(`Unsupported resource alert type: ${type}`);

    return recordAlert({
        type,
        ...details,
        sourceType: 'resource',
        sourceId: resource._id
    });
}

async function ensureCurrentStateAlerts() {
    const stateCollection = mongoose.connection.collection('systemState');
    const bootstrapKey = 'alerts-initial-state-v1';
    if (await stateCollection.findOne({ _id: bootstrapKey })) return;

    await Alert.init();
    const [incidents, resources] = await Promise.all([
        Incident.find().sort({ createdAt: -1 }).limit(200).lean(),
        Resource.find().sort({ updatedAt: -1 }).limit(200).lean()
    ]);

    const entries = [
        ...incidents.map((incident) => {
            const resolved = incident.status === 'resolved';
            return {
                type: resolved ? 'incident_resolved' : 'incident_created',
                severity: resolved ? 'info' : incidentSeverity(incident.priority),
                title: resolved ? `Incident resolved: ${incident.code}` : `New ${incident.priority} priority incident`,
                message: resolved
                    ? `${incident.title} in ${incident.location} was resolved.`
                    : `${incident.code}: ${incident.title} reported at ${incident.location}.`,
                sourceType: 'incident',
                sourceId: incident._id,
                dedupeKey: `initial:incident:${incident._id}`
            };
        }),
        ...resources.map((resource) => {
            const type = resource.status === 'dispatched'
                ? 'resource_dispatched'
                : resource.status === 'offline'
                    ? 'resource_status_changed'
                    : 'resource_added';
            const details = type === 'resource_dispatched'
                ? {
                    severity: 'warning',
                    title: 'Resource dispatched',
                    message: `${resource.name} (${resource.unitCode}) is currently dispatched.`
                }
                : type === 'resource_status_changed'
                    ? {
                        severity: 'warning',
                        title: 'Resource offline',
                        message: `${resource.name} (${resource.unitCode}) is currently offline.`
                    }
                    : {
                        severity: 'info',
                        title: 'Resource available',
                        message: `${resource.name} (${resource.unitCode}) is currently available.`
                    };
            return {
                type,
                ...details,
                sourceType: 'resource',
                sourceId: resource._id,
                dedupeKey: `initial:resource:${resource._id}`
            };
        })
    ];

    if (entries.length) {
        await Alert.bulkWrite(entries.map((entry) => ({
            updateOne: {
                filter: { dedupeKey: entry.dedupeKey },
                update: { $setOnInsert: entry },
                upsert: true
            }
        })));
    }

    try {
        await stateCollection.insertOne({ _id: bootstrapKey, completedAt: new Date() });
    } catch (error) {
        if (error.code !== 11000) throw error;
    }
}

module.exports = {
    createIncidentAlert,
    createResourceAlert,
    ensureCurrentStateAlerts
};

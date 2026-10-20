require('dotenv').config();

const mongoose = require('mongoose');
const Incident = require('./models/Incident');
const Resource = require('./models/Resource');

const incidents = [
    {
        code: 'INC-1001',
        legacyCode: 'INC-DEMO-001',
        title: 'Residential building fire',
        type: 'Fire',
        description: 'Initial sample incident for the command dashboard.',
        location: 'Grandpass, Colombo',
        latitude: 6.9414,
        longitude: 79.8698,
        priority: 'critical',
        status: 'active'
    },
    {
        code: 'INC-1002',
        legacyCode: 'INC-DEMO-002',
        title: 'Medical emergency',
        type: 'Medical',
        description: 'Initial sample incident for the command dashboard.',
        location: 'Cinnamon Gardens, Colombo',
        latitude: 6.9098,
        longitude: 79.868,
        priority: 'high',
        status: 'active'
    },
    {
        code: 'INC-1003',
        legacyCode: 'INC-DEMO-003',
        title: 'Multi-vehicle collision',
        type: 'Traffic',
        description: 'Initial sample incident for the command dashboard.',
        location: 'Colombo Fort',
        latitude: 6.9344,
        longitude: 79.8428,
        priority: 'medium',
        status: 'active'
    },
    {
        code: 'INC-1004',
        legacyCode: 'INC-DEMO-004',
        title: 'Localized flooding',
        type: 'Flood',
        description: 'Initial sample incident for the command dashboard.',
        location: 'Wellawatte, Colombo',
        latitude: 6.8741,
        longitude: 79.8607,
        priority: 'low',
        status: 'active'
    }
];

async function ensureInitialRecord(Model, key, recordData) {
    const { legacyCode, ...data } = recordData;
    const existing = await Model.findOne({ [key]: data[key] }).select('_id');
    if (existing) return { status: 'existing', record: existing };

    if (legacyCode) {
        const legacy = await Model.findOne({ [key]: legacyCode, isDemo: true }).select('_id');
        if (legacy) {
            await Model.collection.updateOne(
                { _id: legacy._id, isDemo: true },
                { $set: data, $unset: { isDemo: '' } }
            );
            const migrated = await Model.findById(legacy._id);
            if (migrated?.[key] === data[key]) return { status: 'migrated', record: migrated };
        }
    }

    const created = await Model.create(data);
    return { status: 'inserted', record: created };
}

async function main() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is missing from backend/.env.');
    }

    const databaseUrl = new URL(process.env.MONGO_URI);
    if (!['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname)) {
        throw new Error('Initial sample records can only be seeded into a local MongoDB database.');
    }

    await mongoose.connect(process.env.MONGO_URI);
    await Promise.all([Incident.init(), Resource.init()]);

    const incidentIds = new Map();
    const incidentCounts = { inserted: 0, migrated: 0, existing: 0 };
    for (const incident of incidents) {
        const result = await ensureInitialRecord(Incident, 'code', incident);
        incidentCounts[result.status] += 1;
        incidentIds.set(incident.code, result.record._id);
    }

    const resources = [
        {
            unitCode: 'RES-101',
            legacyCode: 'DEMO-RES-01',
            name: 'Rescue 01',
            type: 'Fire & rescue',
            status: 'dispatched',
            latitude: 6.9398,
            longitude: 79.8679,
            assignedIncident: incidentIds.get('INC-1001')
        },
        {
            unitCode: 'MED-103',
            legacyCode: 'DEMO-MED-03',
            name: 'Medical 03',
            type: 'Ambulance',
            status: 'dispatched',
            latitude: 6.9112,
            longitude: 79.8658,
            assignedIncident: incidentIds.get('INC-1002')
        },
        {
            unitCode: 'RES-104',
            legacyCode: 'DEMO-RES-04',
            name: 'Rescue 04',
            type: 'Fire & rescue',
            status: 'available',
            latitude: 6.9271,
            longitude: 79.8612,
            assignedIncident: null
        },
        {
            unitCode: 'PAT-102',
            legacyCode: 'DEMO-PAT-02',
            name: 'Patrol 02',
            type: 'Rapid response',
            status: 'offline',
            latitude: 6.9344,
            longitude: 79.8491,
            assignedIncident: null
        },
        {
            unitCode: 'WTR-101',
            legacyCode: 'DEMO-WTR-01',
            name: 'Water Unit 01',
            type: 'Water rescue',
            status: 'available',
            latitude: 6.8792,
            longitude: 79.8615,
            assignedIncident: null
        }
    ];

    const resourceCounts = { inserted: 0, migrated: 0, existing: 0 };
    for (const resource of resources) {
        const result = await ensureInitialRecord(Resource, 'unitCode', resource);
        resourceCounts[result.status] += 1;
    }

    console.log(`Initial sample records ready in local database "${databaseUrl.pathname.slice(1) || '(default)'}".`);
    console.log(`Incidents: ${incidentCounts.inserted} inserted, ${incidentCounts.migrated} migrated, ${incidentCounts.existing} unchanged.`);
    console.log(`Resources: ${resourceCounts.inserted} inserted, ${resourceCounts.migrated} migrated, ${resourceCounts.existing} unchanged.`);
}

main()
    .catch((error) => {
        console.error('Unable to seed initial records:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });

require('dotenv').config();
const mongoose = require('mongoose');

const app = require('./app');
const { ensureCurrentStateAlerts } = require('./services/alertService');

const PORT = process.env.PORT || 5000;

async function startServer() {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing from the environment.');
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
        throw new Error('JWT_SECRET must be set to a random string of at least 16 characters.');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
    // Databases from before crews have a unique index on User.unit (one person per unit); replace it.
    try {
        await require('./models/User').syncIndexes();
    } catch (error) {
        console.error('Could not update the User indexes (crews of more than one person need this):', error.message);
    }
    // One-time move to crews: people already linked to a live unit start out on duty, so nothing changes under them.
    try {
        const User = require('./models/User');
        const Resource = require('./models/Resource');
        const liveUnits = await Resource.find({ status: { $in: ['available', 'dispatched'] } }).select('_id').lean();
        const migrated = await User.updateMany(
            { onDuty: { $exists: false }, unit: { $in: liveUnits.map((u) => u._id) } },
            { $set: { onDuty: true, onDutyAt: new Date() } }
        );
        if (migrated.modifiedCount) console.log(`Marked ${migrated.modifiedCount} operator(s) on duty for their live units.`);
    } catch (error) {
        console.error('Crew migration skipped:', error.message);
    }
    await ensureCurrentStateAlerts();
    app.listen(PORT, () => console.log(`ResQ-OS Server running on port ${PORT}`));
}

startServer().catch((error) => {
    console.error('Unable to start ResQ-OS Server:', error);
    process.exitCode = 1;
});

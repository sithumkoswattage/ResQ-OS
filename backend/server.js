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
    await ensureCurrentStateAlerts();
    app.listen(PORT, () => console.log(`ResQ-OS Server running on port ${PORT}`));
}

startServer().catch((error) => {
    console.error('Unable to start ResQ-OS Server:', error);
    process.exitCode = 1;
});

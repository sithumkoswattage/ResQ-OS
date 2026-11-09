require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Resource = require('./models/Resource');

// Development helper: creates one responder login per seeded unit so the field
// app can be tried end to end. Run `npm run seed:initial` first, then:
//   DEMO_RESPONDER_PASSWORD=<choose one> npm run seed:responders
// Existing accounts are left untouched. Local databases only.
const UNIT_CODES = ['RES-101', 'MED-103', 'RES-104', 'PAT-102', 'WTR-101'];

async function main() {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing from backend/.env.');
    const password = process.env.DEMO_RESPONDER_PASSWORD;
    if (!password || password.length < 8) {
        throw new Error('Set DEMO_RESPONDER_PASSWORD (at least 8 characters) in the environment first.');
    }
    const databaseUrl = new URL(process.env.MONGO_URI);
    if (!['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname)) {
        throw new Error('Demo responders can only be seeded into a local MongoDB database.');
    }

    await mongoose.connect(process.env.MONGO_URI);
    await User.init();
    const hashed = await bcrypt.hash(password, 10);
    const created = [];

    for (const unitCode of UNIT_CODES) {
        const unit = await Resource.findOne({ unitCode });
        if (!unit) continue;
        const username = unitCode.toLowerCase();
        if (await User.exists({ $or: [{ username }, { unit: unit._id }] })) continue;
        await User.create({
            username,
            email: `${username}@resq.local`,
            password: hashed,
            role: 'responder',
            unit: unit._id
        });
        created.push(username);
    }

    console.log(created.length
        ? `Created responder logins: ${created.join(', ')} (sign in as "Field Unit" with the username).`
        : 'No new responder logins were needed (or no seeded units were found).');
}

main()
    .catch((error) => {
        console.error('Unable to seed demo responders:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });

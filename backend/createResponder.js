require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline/promises');
const { stdin, stdout } = require('process');
const User = require('./models/User');
const Resource = require('./models/Resource');

// Creates a responder account and (optionally) links it to an existing unit.
// Run from backend/:  node createResponder.js
async function main() {
    const rl = readline.createInterface({ input: stdin, output: stdout });

    try {
        const username = (await rl.question('Responder username: ')).trim();
        const email = (await rl.question('Responder email: ')).trim().toLowerCase();
        const password = await rl.question('Responder password: ');
        const unitCode = (await rl.question('Unit code to link (blank to skip): ')).trim().toUpperCase();

        if (!username || !email || !password) {
            throw new Error('Username, email, and password are required.');
        }
        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters.');
        }
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is missing from .env');
        }

        await mongoose.connect(process.env.MONGO_URI);

        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing) {
            throw new Error('That username or email already exists. No account was created.');
        }

        let unit = null;
        if (unitCode) {
            unit = await Resource.findOne({ unitCode });
            if (!unit) throw new Error(`No unit with code ${unitCode}. No account was created.`);
            if (await User.exists({ unit: unit._id })) {
                throw new Error(`Unit ${unitCode} already has an operator. No account was created.`);
            }
        }

        await User.create({
            username,
            email,
            password: await bcrypt.hash(password, 10),
            role: 'responder',
            unit: unit?._id ?? null
        });

        console.log(`Responder "${username}" created${unit ? ` and linked to ${unit.unitCode}` : ' (not linked to a unit yet)'}.`);
    } catch (error) {
        console.error('Error:', error.message);
        process.exitCode = 1;
    } finally {
        rl.close();
        await mongoose.disconnect().catch(() => {});
    }
}

main();

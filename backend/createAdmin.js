
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline/promises');
const { stdin, stdout } = require('process');
const User = require('./models/User');

async function main() {
    const rl = readline.createInterface({ input: stdin, output: stdout });

    try {
        const username = (await rl.question('Admin username: ')).trim();
        const email = (await rl.question('Admin email: ')).trim().toLowerCase();
        const password = await rl.question('Admin password: ');

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

        const existing = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existing) {
            throw new Error(
                'That username or email already exists. No account was created.'
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username,
            email,
            password: hashedPassword,
            role: 'admin'
        });

        console.log(`Admin account "${username}" created successfully.`);
    } catch (error) {
        console.error('Error:', error.message);
        process.exitCode = 1;
    } finally {
        rl.close();
        await mongoose.disconnect().catch(() => {});
    }
}

main();

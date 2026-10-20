
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline/promises');
const { stdin, stdout } = require('process');
const User = require('./models/User');

async function main() {
    const rl = readline.createInterface({ input: stdin, output: stdout });

    try {
        const username = (await rl.question('Dispatcher username: ')).trim();
        const email = (await rl.question('Dispatcher email: ')).trim().toLowerCase();
        const password = await rl.question('Dispatcher password: ');

        if (!username || !email || !password) {
            throw new Error('Username, email, and password are required.');
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
            role: 'dispatcher'
        });

        console.log(`Dispatcher account "${username}" created successfully.`);
    } catch (error) {
        console.error('Error:', error.message);
        process.exitCode = 1;
    } finally {
        rl.close();
        await mongoose.disconnect().catch(() => {});
    }
}

main();

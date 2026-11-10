const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const audit = require('../services/audit');

router.post('/register', async (req, res) => {
    try {
        let { username, email, password, role } = req.body;
        if (!email || !password || !username) {
            return res.status(400).json({ message: "Username, email, and password are required" });
        }
        if (role && role !== 'responder') {
            return res.status(403).json({ message: "Public registration is only available for responder accounts. Contact an administrator to provision a dispatcher account." });
        }

        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) return res.status(400).json({ message: "User with this email or username already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ username, email, password: hashedPassword, role: 'responder' });
        await user.save();

        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, username, identifier, password } = req.body;
        const loginId = identifier || username || email;

        if (!loginId || !password) {
            return res.status(400).json({ message: "Operator ID/Email and password are required" });
        }

        // Query by either email or username
        const user = await User.findOne({
            $or: [{ email: loginId }, { username: loginId }]
        });
        if (!user) {
            await audit.record({ actorName: String(loginId).slice(0, 120), action: 'auth.login_failed', targetType: 'session', ip: req.ip, summary: 'Sign-in with an unknown account' });
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            await audit.record({ actorName: String(loginId).slice(0, 120), action: 'auth.login_failed', targetType: 'session', targetId: user._id, ip: req.ip, summary: `Wrong password for "${user.username}"` });
            return res.status(400).json({ message: "Invalid credentials" });
        }

        if (user.suspended) {
            await audit.record({ actorId: user._id, actorName: user.username, actorRole: user.role, action: 'auth.login_blocked', targetType: 'session', ip: req.ip, summary: `Suspended account "${user.username}" tried to sign in` });
            return res.status(403).json({ message: "This account has been suspended. Please contact an administrator.", code: 'account_suspended' });
        }


        const token = jwt.sign(
            { id: user._id, role: user.role, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        user.lastLoginAt = new Date();
        await user.save();
        await audit.record({ actorId: user._id, actorName: user.username, actorRole: user.role, action: 'auth.login', targetType: 'session', ip: req.ip, summary: `${user.username} signed in` });

        res.json({
            token,
            role: user.role,
            username: user.username,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
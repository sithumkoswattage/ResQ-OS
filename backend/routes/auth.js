const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/register', async (req, res) => {
    try {
        let { username, email, password, role } = req.body;
        if (!email || !password || !username) {
            return res.status(400).json({ message: "Username, email, and password are required" });
        }

        // Normalize 'field' role to 'responder'
        if (role === 'field') {
            role = 'responder';
        }

        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) return res.status(400).json({ message: "User with this email or username already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ username, email, password: hashedPassword, role: role || 'responder' });
        await user.save();

        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, username, identifier, password, role } = req.body;
        const loginId = identifier || username || email;

        if (!loginId || !password) {
            return res.status(400).json({ message: "Operator ID/Email and password are required" });
        }

        // Query by either email or username
        const user = await User.findOne({
            $or: [{ email: loginId }, { username: loginId }]
        });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // Normalize roles for validation if a specific role was selected
        if (role) {
            const normalizedReqRole = role === 'field' ? 'responder' : role;
            const normalizedUserRole = user.role === 'field' ? 'responder' : user.role;
            if (normalizedReqRole !== normalizedUserRole) {
                return res.status(403).json({
                    message: `Access denied: Account is registered as ${user.role}, not ${role}.`
                });
            }
        }

        const token = jwt.sign(
            { id: user._id, role: user.role, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

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
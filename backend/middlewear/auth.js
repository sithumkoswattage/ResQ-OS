const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ message: "Access denied. No token provided." });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Access denied. Token missing." });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: "Invalid token." });
    }
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ message: "Access forbidden: Unauthorized role." });
        }
        next();
    };
};

module.exports = { verifyToken, requireRole };
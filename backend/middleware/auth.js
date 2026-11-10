const jwt = require('jsonwebtoken');

// 401 = the client must log in again (the frontend redirects on it).
// 403 = logged in, but not allowed to do this.
const verifyToken = (req, res, next) => {
    const header = req.header('Authorization');
    if (!header) return res.status(401).json({ message: 'Access denied. No token provided.', code: 'token_missing' });

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ message: 'Access denied. Token missing.', code: 'token_missing' });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        return next();
    } catch (error) {
        const expired = error.name === 'TokenExpiredError';
        return res.status(401).json({
            message: expired ? 'Session expired. Please sign in again.' : 'Invalid token.',
            code: expired ? 'token_expired' : 'token_invalid'
        });
    }
};

// requireRole('dispatcher') or requireRole('dispatcher', 'admin')
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access forbidden: Unauthorized role.' });
    }
    return next();
};

module.exports = { verifyToken, requireRole };

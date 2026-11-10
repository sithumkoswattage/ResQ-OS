const User = require('../models/User');

// Runs after verifyToken. JWTs are stateless, so this is what makes
// suspension and role changes take effect immediately: the account is looked
// up on every request and its *current* role replaces the one in the token.
function createAccountGuard({ findUser }) {
    return async (req, res, next) => {
        try {
            const user = await findUser(req.user?.id);
            if (!user) {
                return res.status(401).json({ message: 'This account no longer exists.', code: 'token_invalid' });
            }
            if (user.suspended) {
                return res.status(403).json({
                    message: 'This account has been suspended. Please contact an administrator.',
                    code: 'account_suspended'
                });
            }
            req.user = { ...req.user, role: user.role, username: user.username };
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

const requireActiveAccount = createAccountGuard({
    findUser: (id) => User.findById(id).select('role username suspended').lean()
});

module.exports = { createAccountGuard, requireActiveAccount };

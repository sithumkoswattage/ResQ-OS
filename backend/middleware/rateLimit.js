// Small fixed-window, in-memory rate limiter (no dependencies).
// Per-process only: fine for one backend instance; use a shared store if you
// ever run several. Behind a reverse proxy set TRUST_PROXY so req.ip is the
// real client address.
function createRateLimiter({
    windowMs,
    max,
    keyFn = (req) => req.ip,
    message = 'Too many requests. Please try again later.',
    now = Date.now
}) {
    const hits = new Map();
    const sweeper = setInterval(() => {
        const current = now();
        for (const [key, entry] of hits) {
            if (entry.resetAt <= current) hits.delete(key);
        }
    }, windowMs);
    sweeper.unref?.();

    const middleware = (req, res, next) => {
        const current = now();
        const key = keyFn(req);
        let entry = hits.get(key);
        if (!entry || entry.resetAt <= current) {
            entry = { count: 0, resetAt: current + windowMs };
            hits.set(key, entry);
        }
        entry.count += 1;
        res.set('RateLimit-Limit', String(max));
        res.set('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
        if (entry.count > max) {
            res.set('Retry-After', String(Math.ceil((entry.resetAt - current) / 1000)));
            return res.status(429).json({ message });
        }
        return next();
    };
    middleware.reset = () => hits.clear();
    return middleware;
}

module.exports = { createRateLimiter };

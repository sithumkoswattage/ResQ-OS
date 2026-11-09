// Security headers suited to a JSON API (a hand-rolled subset of what helmet
// sets; swap in helmet when package installs are available).
function securityHeaders(req, res, next) {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer',
        'Cross-Origin-Resource-Policy': 'same-site',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"
    });
    if (process.env.NODE_ENV === 'production') {
        res.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }
    next();
}

// CORS_ORIGINS is a comma-separated allow-list. Requests with no Origin
// (curl, server-to-server, same-origin) are always allowed.
function buildCorsOptions(env = process.env) {
    const allowed = (env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    return {
        origin(origin, callback) {
            callback(null, !origin || allowed.includes(origin));
        }
    };
}

module.exports = { securityHeaders, buildCorsOptions };

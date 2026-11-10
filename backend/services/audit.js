// Best-effort audit trail. A failed audit write is logged but never fails the
// request that caused it. Each new entry is pushed live to administrators.
const AuditLog = require('../models/AuditLog');
const { publishToAdmins } = require('./events');

async function record(entry) {
    try {
        const doc = await AuditLog.create(entry);
        publishToAdmins('audit:new', doc.toObject());
        return doc;
    } catch (error) {
        console.error('Audit log write failed:', error.message);
        return null;
    }
}

// details: { targetType, targetId, summary, meta }
function fromReq(req, action, details = {}) {
    const user = req.user || {};
    return record({
        actorId: user.id || null,
        actorName: user.username || null,
        actorRole: user.role || null,
        action,
        ip: req.ip,
        ...details,
        targetId: details.targetId == null ? null : String(details.targetId)
    });
}

module.exports = { record, fromReq };

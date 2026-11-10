const mongoose = require('mongoose');

// Append-only record of who did what. Written by services/audit.js.
const auditLogSchema = new mongoose.Schema({
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: null, maxlength: 120 },
    actorRole: { type: String, default: null },
    action: { type: String, required: true, maxlength: 80 },   // e.g. "incident.created"
    targetType: { type: String, default: null, maxlength: 40 }, // incident | resource | user | equipment | session
    targetId: { type: String, default: null, maxlength: 64 },
    summary: { type: String, default: '', maxlength: 300 },
    meta: { type: mongoose.Schema.Types.Mixed, default: undefined },
    ip: { type: String, default: null, maxlength: 64 }
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

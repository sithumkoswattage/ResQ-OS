const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['dispatcher', 'responder', 'admin'], default: 'responder' },
    suspended: { type: Boolean, default: false },
    suspendedReason: { type: String, default: null, maxlength: 200 },
    suspendedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    // Responder accounts operate exactly one unit; dispatchers leave this empty.
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', default: null }
}, { timestamps: true });

userSchema.index({ unit: 1 }, { unique: true, partialFilterExpression: { unit: { $type: 'objectId' } } });

module.exports = mongoose.model('User', userSchema);
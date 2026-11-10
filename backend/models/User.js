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
    // A responder belongs to one unit (its crew can have several people); dispatchers leave this empty.
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', default: null },
    // On duty = this person is working the unit now. A unit is online while anyone on its crew is on duty.
    onDuty: { type: Boolean, default: false },
    onDutyAt: { type: Date, default: null }
}, { timestamps: true });

userSchema.index({ unit: 1 });

module.exports = mongoose.model('User', userSchema);
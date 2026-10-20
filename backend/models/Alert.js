const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: [
            'incident_created',
            'incident_resolved',
            'resource_added',
            'resource_dispatched',
            'resource_released',
            'resource_status_changed',
            'resource_removed'
        ],
        required: true
    },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    sourceType: { type: String, enum: ['incident', 'resource'], required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    dedupeKey: { type: String, required: true, unique: true },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

alertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);

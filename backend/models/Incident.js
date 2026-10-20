const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    type: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    location: { type: String, required: true, trim: true, maxlength: 240 },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['active', 'resolved'], default: 'active' }
}, { timestamps: true });

incidentSchema.pre('validate', function assignIncidentCode() {
    if (!this.code) {
        this.code = `INC-${Date.now()}`;
    }
});

module.exports = mongoose.model('Incident', incidentSchema);

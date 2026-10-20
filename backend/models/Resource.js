const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    unitCode: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 32 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, required: true, trim: true, maxlength: 80 },
    status: { type: String, enum: ['available', 'dispatched', 'offline'], default: 'available' },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    assignedIncident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Resource', resourceSchema);

const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
    assetTag: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 40 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: {
        type: String,
        enum: ['medical', 'firefighting', 'rescue', 'communication', 'protective', 'vehicle', 'other'],
        default: 'other'
    },
    status: { type: String, enum: ['serviceable', 'maintenance', 'retired'], default: 'serviceable' },
    quantity: { type: Number, min: 1, default: 1, validate: { validator: Number.isInteger, message: 'Quantity must be a whole number.' } },
    assignedUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', default: null },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    nextServiceDue: { type: Date, default: null }
}, { timestamps: true });

equipmentSchema.index({ assignedUnit: 1 });

module.exports = mongoose.model('Equipment', equipmentSchema);

const mongoose = require('mongoose');

const uidSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  employeeName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'EMS_UID'
});

// Compound index
uidSchema.index({ uid: 1, isActive: 1 });

module.exports = mongoose.model('UID', uidSchema);
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'RFID_ASSIGNED',
      'RFID_REMOVED',
      'RFID_REMOVED_FOR_REASSIGNMENT',
      'ATTENDANCE_RECORDED',
      'MANUAL_ATTENDANCE',
      'EMPLOYEE_ARCHIVED',
      'EMPLOYEE_RESTORED',
      'SYSTEM_ERROR'
    ]
  },
  employeeId: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  reason: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  performedBy: {
    type: String,
    default: 'System'
  }
}, {
  timestamps: true,
  collection: 'EMS_ActivityLogs'
});

// Index for faster queries
activityLogSchema.index({ employeeId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
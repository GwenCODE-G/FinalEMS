const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    ref: 'Employee' 
  },
  date: {
    type: Date,
    required: true,
  },
  timeIn: {
    type: Date 
  },
  timeOut: {
    type: Date 
  },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Absent', 'Half-day', 'No Work', 'Completed'],
    default: 'Present'
  },
  hoursWorked: {
    type: Number,
    default: 0
  },
  rfidUid: {
    type: String,
    required: true
  },
  lateMinutes: {
    type: Number,
    default: 0
  },
  overtimeMinutes: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  isWorkDay: {
    type: Boolean, 
    default: true
  }
}, {
  timestamps: true,
  collection: 'EMS_Attendance' 
});

// Make the combination of employeeId and date unique to prevent duplicates
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ rfidUid: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
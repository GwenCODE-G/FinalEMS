const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
  date: {
    type: String,
    required: true,
    index: true
  },
  timeIn: {
    type: Date,
    required: true
  },
  timeOut: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Absent', 'Completed', 'Half-day'],
    default: 'Present'
  },
  hoursWorked: {
    type: Number,
    min: 0
  },
  lateMinutes: {
    type: Number,
    default: 0,
    min: 0
  },
  overtimeMinutes: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  collection: 'EMS_Attendance'
});

// Compound index for efficient queries
attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });

// Virtual for formatted date
attendanceSchema.virtual('formattedDate').get(function() {
  return new Date(this.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Method to calculate hours worked
attendanceSchema.methods.calculateHoursWorked = function() {
  if (this.timeIn && this.timeOut) {
    const diff = this.timeOut - this.timeIn;
    return parseFloat((diff / (1000 * 60 * 60)).toFixed(2));
  }
  return 0;
};

// Pre-save middleware to calculate hours worked
attendanceSchema.pre('save', function(next) {
  if (this.timeIn && this.timeOut) {
    this.hoursWorked = this.calculateHoursWorked();
    
    // Update status to Completed if both time in and out are recorded
    if (this.status !== 'Completed') {
      this.status = 'Completed';
    }
  }
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
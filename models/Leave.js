const mongoose = require('mongoose');
const moment = require('moment-timezone');

const PH_TIMEZONE = 'Asia/Manila';

const leaveSchema = new mongoose.Schema({
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
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  leaveType: {
    type: String,
    enum: ['Vacation', 'Sick', 'Emergency', 'Personal', 'Maternity', 'Paternity', 'Bereavement', 'Study', 'Sabbatical'],
    default: 'Vacation'
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Approved'
  },
  approvedBy: {
    type: String,
    default: 'System'
  },
  approvedAt: {
    type: Date,
    default: Date.now
  },
  numberOfDays: {
    type: Number,
    required: true
  },
  collectionName: {
    type: String,
    default: 'EMS_Leaves'
  },
  databaseName: {
    type: String,
    default: 'BrightonSystem'
  }
}, {
  timestamps: true,
  collection: 'EMS_Leaves'
});

// Indexes for better performance
leaveSchema.index({ employeeId: 1, startDate: 1, endDate: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ department: 1 });

// Static method to calculate work days between dates
leaveSchema.statics.calculateWorkDays = function(startDate, endDate) {
  let workDays = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Count only weekdays (Monday to Friday)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workDays;
};

// Static method to check if employee is on leave on specific date
leaveSchema.statics.isEmployeeOnLeave = async function(employeeId, date) {
  try {
    const targetDate = new Date(date);
    
    const leave = await this.findOne({
      employeeId: employeeId,
      startDate: { $lte: targetDate },
      endDate: { $gte: targetDate },
      status: 'Approved'
    });
    
    return !!leave;
  } catch (error) {
    console.error('Error checking leave status:', error);
    return false;
  }
};

// Static method to get employee's active leaves
leaveSchema.statics.getEmployeeLeaves = async function(employeeId, startDate = null, endDate = null) {
  try {
    let filter = { 
      employeeId: employeeId,
      status: 'Approved'
    };
    
    if (startDate && endDate) {
      filter.$or = [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) }
        }
      ];
    }
    
    const leaves = await this.find(filter)
      .sort({ startDate: -1 });
    
    return leaves;
  } catch (error) {
    console.error('Error fetching employee leaves:', error);
    return [];
  }
};

// Static method to get all active leaves within date range
leaveSchema.statics.getActiveLeaves = async function(startDate, endDate) {
  try {
    const leaves = await this.find({
      status: 'Approved',
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) }
        }
      ]
    }).sort({ startDate: 1 });
    
    return leaves;
  } catch (error) {
    console.error('Error fetching active leaves:', error);
    return [];
  }
};

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave;
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
    enum: ['Present', 'Late', 'Absent', 'Completed', 'Half-day', 'Early', 'Overtime'],
    default: 'Present'
  },
  hoursWorked: {
    type: String,
    default: '0h 0m'
  },
  totalMinutes: {
    type: Number,
    default: 0
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
  },
  rfidAssignedDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'EMS_Attendance'
});

attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ employeeId: 1, rfidAssignedDate: 1 });

attendanceSchema.virtual('formattedDate').get(function() {
  return new Date(this.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

attendanceSchema.methods.calculateHoursWorked = function() {
  if (this.timeIn && this.timeOut) {
    const diff = this.timeOut - this.timeIn;
    const totalMinutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    this.totalMinutes = totalMinutes;
    this.hoursWorked = `${hours}h ${minutes}m`;
    
    return { hours, minutes, totalMinutes };
  }
  return { hours: 0, minutes: 0, totalMinutes: 0 };
};

attendanceSchema.statics.getWorkDaysSinceAssignment = async function(employeeId, year, month) {
  try {
    const firstAttendance = await this.findOne({ 
      employeeId: employeeId 
    }).sort({ date: 1 });
    
    if (!firstAttendance) {
      return 0;
    }
    
    const assignmentDate = firstAttendance.rfidAssignedDate || new Date(firstAttendance.date);
    const startDate = new Date(assignmentDate);
    const endDate = new Date(year, month, 0);
    
    if (startDate > endDate) {
      return 0;
    }
    
    let workDays = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workDays;
  } catch (error) {
    console.error('Error calculating work days:', error);
    return 0;
  }
};

attendanceSchema.statics.getMonthlySummaryFromAssignment = async function(employeeId, year, month) {
  try {
    const firstAttendance = await this.findOne({ 
      employeeId: employeeId 
    }).sort({ date: 1 });
    
    if (!firstAttendance) {
      return {
        presentDays: 0,
        absentDays: 0,
        totalHours: 0,
        totalMinutes: 0,
        lateDays: 0,
        totalWorkDays: 0,
        averageHours: 0,
        startDate: null,
        endDate: null,
        assignmentDate: null
      };
    }
    
    const assignmentDate = firstAttendance.rfidAssignedDate || new Date(firstAttendance.date);
    const startDate = new Date(assignmentDate);
    const endDate = new Date(year, month, 0);
    
    if (startDate > endDate) {
      return {
        presentDays: 0,
        absentDays: 0,
        totalHours: 0,
        totalMinutes: 0,
        lateDays: 0,
        totalWorkDays: 0,
        averageHours: 0,
        startDate: startDate,
        endDate: endDate,
        assignmentDate: assignmentDate
      };
    }
    
    const monthStart = new Date(year, month - 1, 1);
    const queryStartDate = startDate > monthStart ? startDate : monthStart;
    
    const startDateStr = queryStartDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const attendance = await this.find({
      employeeId: employeeId,
      date: {
        $gte: startDateStr,
        $lte: endDateStr
      }
    });
    
    const totalWorkDays = await this.getWorkDaysSinceAssignment(employeeId, year, month);
    
    const presentDays = attendance.filter(a => a.timeIn).length;
    const totalMinutes = attendance.reduce((sum, a) => sum + (a.totalMinutes || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const lateDays = attendance.filter(a => a.status === 'Late').length;
    const absentDays = Math.max(0, totalWorkDays - presentDays);
    
    return {
      presentDays,
      absentDays,
      totalHours: totalHours,
      totalMinutes: totalMinutes,
      lateDays,
      totalWorkDays,
      averageHours: presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0,
      startDate: queryStartDate,
      endDate: endDate,
      assignmentDate: assignmentDate,
      actualWorkDays: totalWorkDays,
      attendanceRecords: attendance.length
    };
  } catch (error) {
    console.error('Error in monthly summary calculation:', error);
    throw error;
  }
};

attendanceSchema.statics.getRfidAssignmentDate = async function(employeeId) {
  const firstAttendance = await this.findOne({ 
    employeeId: employeeId 
  }).sort({ date: 1 });
  
  if (!firstAttendance) {
    return null;
  }
  
  return firstAttendance.rfidAssignedDate || new Date(firstAttendance.date);
};

attendanceSchema.pre('save', function(next) {
  if (this.timeIn && this.timeOut) {
    this.calculateHoursWorked();
    
    if (this.status !== 'Completed') {
      this.status = 'Completed';
    }
  }
  
  next();
});

attendanceSchema.statics.setRfidAssignmentDate = async function(employeeId) {
  try {
    const firstAttendance = await this.findOne({ 
      employeeId: employeeId 
    }).sort({ date: 1 });
    
    if (firstAttendance && !firstAttendance.rfidAssignedDate) {
      firstAttendance.rfidAssignedDate = new Date(firstAttendance.date);
      await firstAttendance.save();
    }
    
    return firstAttendance ? firstAttendance.rfidAssignedDate : null;
  } catch (error) {
    console.error('Error setting RFID assignment date:', error);
    return null;
  }
};

module.exports = mongoose.model('Attendance', attendanceSchema);
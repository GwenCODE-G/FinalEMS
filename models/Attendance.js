const mongoose = require('mongoose');
const moment = require('moment-timezone');

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
  dateEmployed: {
    type: Date,
    default: null
  },
  recordType: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'auto'
  },
  recordedBy: {
    type: String,
    default: 'System'
  },
  timeInSource: {
    type: String,
    enum: ['rfid', 'manual'],
    default: 'rfid'
  },
  timeOutSource: {
    type: String,
    enum: ['rfid', 'manual'],
    default: 'rfid'
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'EMS_Attendance',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ employeeId: 1, dateEmployed: 1 });
attendanceSchema.index({ recordType: 1 });
attendanceSchema.index({ 'timeIn': 1 });
attendanceSchema.index({ 'timeOut': 1 });

// ==================== HELPER FUNCTIONS ====================

// All times are already in PH timezone, no conversion needed
function formatTime(date) {
  if (!date) return '';
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
}

// Format date for display
function formatDate(date) {
  if (!date) return '';
  return moment(date).format('YYYY-MM-DD');
}

// Get PH date string from date (already in PH time)
function getPHDateString(date) {
  return moment(date).format('YYYY-MM-DD');
}

// Get today's PH date string
function getTodayPHString() {
  return moment().tz('Asia/Manila').format('YYYY-MM-DD');
}

// ==================== VIRTUALS ====================

// Virtual for formatted date
attendanceSchema.virtual('formattedDate').get(function() {
  return moment(this.date).format('MMMM D, YYYY');
});

// Virtual for checking if attendance is completed
attendanceSchema.virtual('isCompleted').get(function() {
  return !!(this.timeIn && this.timeOut);
});

// No timezone conversion needed - times are already in PH timezone
attendanceSchema.virtual('displayTimeIn').get(function() {
  if (!this.timeIn) return '';
  return formatTime(this.timeIn);
});

attendanceSchema.virtual('displayTimeOut').get(function() {
  if (!this.timeOut) return '';
  return formatTime(this.timeOut);
});

attendanceSchema.virtual('displayDate').get(function() {
  return formatDate(this.date);
});

// ==================== METHODS ====================

// Calculate hours worked method - Uses PH time (already stored as PH time)
attendanceSchema.methods.calculateHoursWorked = function() {
  if (this.timeIn && this.timeOut) {
    // Both times are already in PH timezone
    const timeIn = moment(this.timeIn);
    const timeOut = moment(this.timeOut);
    
    const diff = timeOut.diff(timeIn);
    const totalMinutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    this.totalMinutes = totalMinutes;
    this.hoursWorked = `${hours}h ${minutes}m`;
    
    return { hours, minutes, totalMinutes };
  }
  return { hours: 0, minutes: 0, totalMinutes: 0 };
};

// Enhanced method to check if time out is allowed (10-minute rule) - Works for both RFID and manual
attendanceSchema.methods.canTimeOut = function(proposedTimeOut, source = 'manual') {
  if (!this.timeIn) return { allowed: false, reason: 'No time in recorded' };
  
  // Both times are already in PH timezone
  const timeIn = moment(this.timeIn);
  const timeOut = moment(proposedTimeOut);
  
  const timeDifference = timeOut.diff(timeIn, 'minutes'); // difference in minutes
  
  console.log(`Time validation - Time In: ${timeIn.format('HH:mm:ss')}, Proposed Time Out: ${timeOut.format('HH:mm:ss')}, Difference: ${timeDifference} minutes`);
  
  if (timeDifference < 10) {
    const remainingMinutes = Math.ceil(10 - timeDifference);
    return { 
      allowed: false, 
      reason: `Please wait at least 10 minutes between time in and time out. Wait ${remainingMinutes} more minutes.`,
      remainingMinutes: remainingMinutes
    };
  }
  
  return { allowed: true, reason: 'Time out allowed' };
};

// Enhanced method to update time out with validation for both RFID and manual
attendanceSchema.methods.updateTimeOut = function(timeOut, source = 'manual') {
  const validation = this.canTimeOut(timeOut, source);
  if (!validation.allowed) {
    throw new Error(validation.reason);
  }
  
  this.timeOut = timeOut;
  this.timeOutSource = source;
  this.lastModified = new Date();
  
  // Recalculate hours worked
  this.calculateHoursWorked();
  
  // Update status
  if (this.status !== 'Completed') {
    this.status = 'Completed';
  }
  
  return this;
};

// ==================== STATIC METHODS ====================

// Helper function to calculate work days between two dates (Monday to Friday)
attendanceSchema.statics.calculateWorkDays = function(startDate, endDate) {
  let workDays = 0;
  const currentDate = moment(startDate).startOf('day');
  const today = moment().tz('Asia/Manila').startOf('day');
  
  // Make sure we don't count future dates
  const actualEndDate = moment(endDate).startOf('day');
  const finalEndDate = actualEndDate.isAfter(today) ? today : actualEndDate;
  
  while (currentDate.isSameOrBefore(finalEndDate)) {
    const dayOfWeek = currentDate.day();
    // Count only weekdays (Monday to Friday)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workDays++;
    }
    currentDate.add(1, 'day');
  }
  
  return workDays;
};

// Get today's attendance for an employee - Uses PH time
attendanceSchema.statics.getTodaysAttendance = async function(employeeId) {
  try {
    const todayStr = getTodayPHString();
    
    return await this.findOne({
      employeeId: employeeId,
      date: todayStr
    });
  } catch (error) {
    console.error('Error fetching today attendance:', error);
    return null;
  }
};

// Check if employee has timed in today
attendanceSchema.statics.hasTimedInToday = async function(employeeId) {
  const attendance = await this.getTodaysAttendance(employeeId);
  return !!(attendance && attendance.timeIn);
};

// Check if employee has timed out today
attendanceSchema.statics.hasTimedOutToday = async function(employeeId) {
  const attendance = await this.getTodaysAttendance(employeeId);
  return !!(attendance && attendance.timeOut);
};

// Enhanced method to handle mixed RFID and manual attendance with 10-minute validation
attendanceSchema.statics.processTimeOut = async function(employeeId, timeOut, source = 'manual') {
  try {
    const todayStr = getTodayPHString();
    let attendance = await this.findOne({
      employeeId: employeeId,
      date: todayStr
    });

    if (!attendance || !attendance.timeIn) {
      throw new Error('No time in record found for today');
    }

    if (attendance.timeOut) {
      throw new Error('Time out already recorded for today');
    }

    console.log(`Processing time out for ${employeeId} - Source: ${source}`);
    console.log(`Time In: ${attendance.timeIn}, Proposed Time Out: ${timeOut}`);

    // Validate minimum 10 minutes between time in and time out
    const validation = attendance.canTimeOut(timeOut, source);
    if (!validation.allowed) {
      throw new Error(validation.reason);
    }

    // Update time out
    attendance.timeOut = timeOut;
    attendance.timeOutSource = source;
    attendance.lastModified = new Date();

    // Calculate hours worked
    attendance.calculateHoursWorked();

    // Check for overtime (after 5:00 PM)
    const timeOutPH = moment(timeOut);
    const workEndTime = moment(attendance.timeIn).hour(17).minute(0).second(0);
    
    if (timeOutPH.isAfter(workEndTime)) {
      const overtimeMinutes = timeOutPH.diff(workEndTime, 'minutes');
      attendance.overtimeMinutes = overtimeMinutes;
      console.log(`Overtime detected: ${overtimeMinutes} minutes`);
    }
    
    attendance.status = 'Completed';

    const result = await attendance.save();
    
    console.log(`Time out processed successfully for ${employeeId}`);
    console.log(`Hours worked: ${result.hoursWorked}, Overtime: ${result.overtimeMinutes} minutes`);
    
    return result;

  } catch (error) {
    console.error('Error processing time out:', error);
    throw error;
  }
};

// Enhanced method to process RFID scan with mixed mode support
attendanceSchema.statics.processRfidScan = async function(employeeId, scanTime, action) {
  try {
    const todayStr = getTodayPHString();
    let attendance = await this.findOne({
      employeeId: employeeId,
      date: todayStr
    });

    console.log(`Processing RFID scan for ${employeeId} - Action: ${action}`);
    console.log(`Scan time: ${scanTime}, Today: ${todayStr}`);

    if (action === 'timein') {
      // Handle time in
      if (attendance && attendance.timeIn) {
        throw new Error('Time in already recorded for today');
      }

      const workStartTime = new Date(scanTime);
      workStartTime.setHours(8, 0, 0, 0);
      
      let status = 'Present';
      let lateMinutes = 0;

      if (scanTime > workStartTime) {
        status = 'Late';
        lateMinutes = Math.round((scanTime - workStartTime) / (1000 * 60));
        console.log(`Employee is late by: ${lateMinutes} minutes`);
      }

      if (!attendance) {
        const employee = await mongoose.model('Employee').findOne({ employeeId: employeeId });
        if (!employee) {
          throw new Error('Employee not found');
        }

        attendance = new Attendance({
          employeeId: employee.employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          position: employee.position,
          date: todayStr,
          timeIn: scanTime,
          status: status,
          lateMinutes: lateMinutes,
          dateEmployed: employee.dateEmployed,
          recordType: 'auto',
          timeInSource: 'rfid'
        });
      } else {
        attendance.timeIn = scanTime;
        attendance.status = status;
        attendance.lateMinutes = lateMinutes;
        attendance.timeInSource = 'rfid';
        attendance.recordType = 'auto';
      }

      const result = await attendance.save();
      console.log(`RFID Time In recorded successfully for ${employeeId}`);
      return { type: 'timein', data: result };

    } else if (action === 'timeout') {
      // Handle time out using the enhanced processTimeOut method
      if (!attendance || !attendance.timeIn) {
        throw new Error('No time in record found for today');
      }

      if (attendance.timeOut) {
        throw new Error('Time out already recorded for today');
      }

      const result = await this.processTimeOut(employeeId, scanTime, 'rfid');
      console.log(`RFID Time Out recorded successfully for ${employeeId}`);
      return { type: 'timeout', data: result };

    } else {
      throw new Error('Invalid action. Must be "timein" or "timeout"');
    }

  } catch (error) {
    console.error('Error processing RFID scan:', error);
    throw error;
  }
};

// Real-time summary from employment date until present
attendanceSchema.statics.getRealTimeSummaryFromEmployment = async function(employeeId) {
  try {
    const employee = await mongoose.model('Employee').findOne({ employeeId: employeeId });
    
    if (!employee) {
      return {
        presentDays: 0,
        absentDays: 0,
        totalHours: 0,
        totalMinutes: 0,
        lateDays: 0,
        totalWorkDays: 0,
        averageHours: 0,
        employmentDate: null,
        lastUpdated: new Date(),
        employee: null
      };
    }
    
    const employmentDate = moment(employee.dateEmployed).startOf('day');
    const today = moment().tz('Asia/Manila').startOf('day');
    
    // If employment date is in the future, return zeros
    if (employmentDate.isAfter(today)) {
      return {
        presentDays: 0,
        absentDays: 0,
        totalHours: 0,
        totalMinutes: 0,
        lateDays: 0,
        totalWorkDays: 0,
        averageHours: 0,
        employmentDate: employmentDate.toDate(),
        actualWorkDays: 0,
        attendanceRecords: 0,
        lastUpdated: new Date(),
        employee: {
          name: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          position: employee.position,
          employeeId: employee.employeeId,
          dateEmployed: employee.dateEmployed
        },
        metrics: {
          attendanceRate: 0,
          efficiency: 0,
          hoursUtilization: 0
        }
      };
    }
    
    // Convert dates to string format for query
    const startDateStr = employmentDate.format('YYYY-MM-DD');
    const endDateStr = today.format('YYYY-MM-DD');
    
    // Get ALL attendance records from employment date until today
    const attendanceRecords = await this.find({
      employeeId: employeeId,
      date: {
        $gte: startDateStr,
        $lte: endDateStr
      }
    });
    
    // Calculate total work days from employment date until today
    const totalWorkDays = this.calculateWorkDays(employmentDate.toDate(), today.toDate());
    
    // Calculate present days (days with timeIn)
    const presentDays = attendanceRecords.filter(record => record.timeIn).length;
    
    // Calculate late days
    const lateDays = attendanceRecords.filter(record => record.status === 'Late').length;
    
    // REAL-TIME ABSENT DAYS: work days since employment - present days
    const absentDays = Math.max(0, totalWorkDays - presentDays);
    
    // Calculate total hours and minutes
    const totalMinutes = attendanceRecords.reduce((sum, record) => sum + (record.totalMinutes || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    
    return {
      presentDays,
      absentDays,
      totalHours: totalHours,
      totalMinutes: totalMinutes,
      lateDays,
      totalWorkDays,
      averageHours: presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0,
      employmentDate: employmentDate.toDate(),
      actualWorkDays: totalWorkDays,
      attendanceRecords: attendanceRecords.length,
      lastUpdated: new Date(),
      employee: {
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        position: employee.position,
        employeeId: employee.employeeId,
        dateEmployed: employee.dateEmployed
      },
      metrics: {
        attendanceRate: totalWorkDays > 0 ? Math.round((presentDays / totalWorkDays) * 100 * 10) / 10 : 0,
        efficiency: presentDays > 0 ? Math.round((totalHours / (presentDays * 8)) * 100 * 10) / 10 : 0,
        hoursUtilization: totalWorkDays > 0 ? Math.round((totalHours / (totalWorkDays * 8)) * 100 * 10) / 10 : 0
      },
      period: {
        startDate: employmentDate.toDate(),
        endDate: today.toDate(),
        daysSinceEmployment: today.diff(employmentDate, 'days')
      }
    };
  } catch (error) {
    console.error('Error in real-time summary calculation:', error);
    throw error;
  }
};

// Monthly summary with real-time updates
attendanceSchema.statics.getMonthlySummaryFromEmployment = async function(employeeId, year, month) {
  try {
    const employee = await mongoose.model('Employee').findOne({ employeeId: employeeId });
    
    if (!employee) {
      return {
        presentDays: 0,
        absentDays: 0,
        totalHours: 0,
        totalMinutes: 0,
        lateDays: 0,
        totalWorkDays: 0,
        averageHours: 0,
        employmentDate: null,
        lastUpdated: new Date(),
        employee: null
      };
    }
    
    const employmentDate = moment(employee.dateEmployed).startOf('day');
    const startOfMonth = moment.tz(`${year}-${month}-01`, 'YYYY-M-D', 'Asia/Manila').startOf('day');
    const endOfMonth = moment.tz(`${year}-${month}-01`, 'YYYY-M-D', 'Asia/Manila').endOf('month').startOf('day');
    const today = moment().tz('Asia/Manila').startOf('day');
    
    // Use employment date as the start date if it's after month start
    const queryStartDate = employmentDate.isAfter(startOfMonth) ? employmentDate : startOfMonth;
    
    // If employment date is after end of month, return empty results
    if (queryStartDate.isAfter(endOfMonth)) {
      return {
        presentDays: 0,
        absentDays: 0,
        totalHours: 0,
        totalMinutes: 0,
        lateDays: 0,
        totalWorkDays: 0,
        averageHours: 0,
        employmentDate: employmentDate.toDate(),
        actualWorkDays: 0,
        attendanceRecords: 0,
        lastUpdated: new Date(),
        employee: {
          name: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          position: employee.position,
          employeeId: employee.employeeId,
          dateEmployed: employee.dateEmployed
        },
        metrics: {
          attendanceRate: 0,
          efficiency: 0,
          hoursUtilization: 0
        },
        period: {
          month: parseInt(month),
          year: parseInt(year),
          monthName: startOfMonth.format('MMMM')
        }
      };
    }
    
    // Use today as end date if it's before end of month (REAL-TIME)
    const queryEndDate = today.isBefore(endOfMonth) ? today : endOfMonth;
    
    // Convert dates to string format for query
    const startDateStr = queryStartDate.format('YYYY-MM-DD');
    const endDateStr = queryEndDate.format('YYYY-MM-DD');
    
    // Get attendance records for the period
    const attendanceRecords = await this.find({
      employeeId: employeeId,
      date: {
        $gte: startDateStr,
        $lte: endDateStr
      }
    });
    
    // Calculate total work days from query start date to today (REAL-TIME)
    const totalWorkDays = this.calculateWorkDays(queryStartDate.toDate(), queryEndDate.toDate());
    
    // Calculate present days (days with timeIn)
    const presentDays = attendanceRecords.filter(record => record.timeIn).length;
    
    // Calculate late days
    const lateDays = attendanceRecords.filter(record => record.status === 'Late').length;
    
    // REAL-TIME ABSENT DAYS: work days since start - present days
    const absentDays = Math.max(0, totalWorkDays - presentDays);
    
    // Calculate total hours and minutes
    const totalMinutes = attendanceRecords.reduce((sum, record) => sum + (record.totalMinutes || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    
    return {
      presentDays,
      absentDays,
      totalHours: totalHours,
      totalMinutes: totalMinutes,
      lateDays,
      totalWorkDays,
      averageHours: presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0,
      employmentDate: employmentDate.toDate(),
      actualWorkDays: totalWorkDays,
      attendanceRecords: attendanceRecords.length,
      lastUpdated: new Date(),
      employee: {
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        position: employee.position,
        employeeId: employee.employeeId,
        dateEmployed: employee.dateEmployed
      },
      metrics: {
        attendanceRate: totalWorkDays > 0 ? Math.round((presentDays / totalWorkDays) * 100 * 10) / 10 : 0,
        efficiency: presentDays > 0 ? Math.round((totalHours / (presentDays * 8)) * 100 * 10) / 10 : 0,
        hoursUtilization: totalWorkDays > 0 ? Math.round((totalHours / (totalWorkDays * 8)) * 100 * 10) / 10 : 0
      },
      period: {
        month: parseInt(month),
        year: parseInt(year),
        monthName: startOfMonth.format('MMMM')
      }
    };
  } catch (error) {
    console.error('Error in monthly summary calculation:', error);
    throw error;
  }
};

// Get work days since employment until today (real-time)
attendanceSchema.statics.getWorkDaysSinceEmployment = async function(employeeId) {
  try {
    const employee = await mongoose.model('Employee').findOne({ employeeId: employeeId });
    
    if (!employee) {
      return 0;
    }
    
    const employmentDate = moment(employee.dateEmployed).startOf('day');
    const today = moment().tz('Asia/Manila').startOf('day');
    
    if (employmentDate.isAfter(today)) {
      return 0;
    }
    
    return this.calculateWorkDays(employmentDate.toDate(), today.toDate());
  } catch (error) {
    console.error('Error calculating work days:', error);
    return 0;
  }
};

attendanceSchema.statics.getEmploymentDate = async function(employeeId) {
  const employee = await mongoose.model('Employee').findOne({ employeeId: employeeId });
  
  if (!employee) {
    return null;
  }
  
  return employee.dateEmployed;
};

// Get detailed attendance history with employment date consideration (real-time)
attendanceSchema.statics.getAttendanceHistory = async function(employeeId) {
  try {
    const employee = await mongoose.model('Employee').findOne({ employeeId: employeeId });
    
    if (!employee) {
      return [];
    }
    
    const employmentDate = moment(employee.dateEmployed).startOf('day');
    const today = moment().tz('Asia/Manila').startOf('day');
    
    // If employment date is in the future, return empty array
    if (employmentDate.isAfter(today)) {
      return [];
    }
    
    const startDateStr = employmentDate.format('YYYY-MM-DD');
    const endDateStr = today.format('YYYY-MM-DD');
    
    const attendance = await this.find({
      employeeId: employeeId,
      date: {
        $gte: startDateStr,
        $lte: endDateStr
      }
    }).sort({ date: -1 });
    
    return attendance;
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    return [];
  }
};

// Get attendance statistics for dashboard - Uses PH time
attendanceSchema.statics.getDashboardStats = async function() {
  try {
    const todayStr = getTodayPHString();
    
    const totalEmployees = await mongoose.model('Employee').countDocuments({ status: 'Active' });
    const todayAttendance = await this.find({ date: todayStr });
    
    const present = todayAttendance.filter(a => a.timeIn).length;
    const absent = totalEmployees - present;
    const completed = todayAttendance.filter(a => a.timeOut).length;
    const late = todayAttendance.filter(a => a.status === 'Late').length;
    const onTime = present - late;

    return {
      summary: {
        present,
        absent,
        completed,
        late,
        onTime,
        totalEmployees
      },
      records: todayAttendance,
      date: todayStr,
      phTime: moment().tz('Asia/Manila').format('YYYY-MM-DD hh:mm:ss A')
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      summary: {
        present: 0,
        absent: 0,
        completed: 0,
        late: 0,
        onTime: 0,
        totalEmployees: 0
      },
      records: [],
      date: getTodayPHString(),
      phTime: moment().tz('Asia/Manila').format('YYYY-MM-DD hh:mm:ss A')
    };
  }
};

// ==================== MIDDLEWARE ====================

// Pre-save middleware to update lastModified and calculate hours
attendanceSchema.pre('save', function(next) {
  this.lastModified = new Date();
  
  if (this.timeIn && this.timeOut) {
    this.calculateHoursWorked();
    
    if (this.status !== 'Completed') {
      this.status = 'Completed';
    }
  }
  
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
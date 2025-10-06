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
  dateEmployed: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'EMS_Attendance'
});

attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ employeeId: 1, dateEmployed: 1 });

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

// Helper function to calculate work days between two dates (Monday to Friday)
attendanceSchema.statics.calculateWorkDays = function(startDate, endDate) {
  let workDays = 0;
  const currentDate = new Date(startDate);
  const today = new Date();
  
  // Make sure we don't count future dates
  const actualEndDate = endDate > today ? today : endDate;
  
  while (currentDate <= actualEndDate) {
    const dayOfWeek = currentDate.getDay();
    // Count only weekdays (Monday to Friday) - don't count future dates
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workDays;
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
    
    const employmentDate = new Date(employee.dateEmployed);
    const today = new Date();
    
    // If employment date is in the future, return zeros
    if (employmentDate > today) {
      return {
        presentDays: 0,
        absentDays: 0,
        totalHours: 0,
        totalMinutes: 0,
        lateDays: 0,
        totalWorkDays: 0,
        averageHours: 0,
        employmentDate: employmentDate,
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
    const startDateStr = employmentDate.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];
    
    // Get ALL attendance records from employment date until today
    const attendanceRecords = await this.find({
      employeeId: employeeId,
      date: {
        $gte: startDateStr,
        $lte: endDateStr
      }
    });
    
    // Calculate total work days from employment date until today
    const totalWorkDays = this.calculateWorkDays(employmentDate, today);
    
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
      absentDays, // Real-time absent days calculation
      totalHours: totalHours,
      totalMinutes: totalMinutes,
      lateDays,
      totalWorkDays,
      averageHours: presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0,
      employmentDate: employmentDate,
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
        startDate: employmentDate,
        endDate: today,
        daysSinceEmployment: Math.floor((today - employmentDate) / (1000 * 60 * 60 * 24))
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
    
    const employmentDate = new Date(employee.dateEmployed);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    const today = new Date();
    
    // Use employment date as the start date if it's after month start
    const queryStartDate = employmentDate > startOfMonth ? employmentDate : startOfMonth;
    
    // If employment date is after end of month, return empty results
    if (queryStartDate > endOfMonth) {
      return {
        presentDays: 0,
        absentDays: 0,
        totalHours: 0,
        totalMinutes: 0,
        lateDays: 0,
        totalWorkDays: 0,
        averageHours: 0,
        employmentDate: employmentDate,
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
          monthName: new Date(year, month - 1).toLocaleDateString('en', { month: 'long' })
        }
      };
    }
    
    // Use today as end date if it's before end of month (REAL-TIME)
    const queryEndDate = today < endOfMonth ? today : endOfMonth;
    
    // Convert dates to string format for query
    const startDateStr = queryStartDate.toISOString().split('T')[0];
    const endDateStr = queryEndDate.toISOString().split('T')[0];
    
    // Get attendance records for the period
    const attendanceRecords = await this.find({
      employeeId: employeeId,
      date: {
        $gte: startDateStr,
        $lte: endDateStr
      }
    });
    
    // Calculate total work days from query start date to today (REAL-TIME)
    const totalWorkDays = this.calculateWorkDays(queryStartDate, queryEndDate);
    
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
      absentDays, // Real-time absent days
      totalHours: totalHours,
      totalMinutes: totalMinutes,
      lateDays,
      totalWorkDays,
      averageHours: presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0,
      employmentDate: employmentDate,
      actualWorkDays: totalWorkDays,
      attendanceRecords: attendanceRecords.length,
      lastUpdated: new Date(), // Timestamp for real-time tracking
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
        monthName: new Date(year, month - 1).toLocaleDateString('en', { month: 'long' })
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
    
    const employmentDate = new Date(employee.dateEmployed);
    const today = new Date();
    
    if (employmentDate > today) {
      return 0;
    }
    
    return this.calculateWorkDays(employmentDate, today);
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
    
    const employmentDate = new Date(employee.dateEmployed);
    const today = new Date();
    
    // If employment date is in the future, return empty array
    if (employmentDate > today) {
      return [];
    }
    
    const startDateStr = employmentDate.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];
    
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

attendanceSchema.pre('save', function(next) {
  if (this.timeIn && this.timeOut) {
    this.calculateHoursWorked();
    
    if (this.status !== 'Completed') {
      this.status = 'Completed';
    }
  }
  
  next();
});

module.exports = mongoose.model('Attendance', attendanceModel);
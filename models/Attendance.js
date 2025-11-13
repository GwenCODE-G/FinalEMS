const mongoose = require('mongoose');
const moment = require('moment-timezone');

// Philippine Timezone Configuration
const PH_TIMEZONE = 'Asia/Manila';
const PH_TIMEZONE_DISPLAY = 'Philippine Standard Time (PST)';

// Working Hours Configuration
const WORKING_HOURS = {
  START_HOUR: 6,
  START_MINUTE: 0,
  END_HOUR: 19,
  END_MINUTE: 0,
  TIMEIN_CUTOFF_HOUR: 17,
  TIMEIN_CUTOFF_MINUTE: 0
};

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
    set: function(timeIn) {
      // Convert to PST when setting timeIn
      if (timeIn) {
        return moment(timeIn).tz(PH_TIMEZONE).toDate();
      }
      return timeIn;
    }
  },
  timeOut: {
    type: Date,
    set: function(timeOut) {
      // Convert to PST when setting timeOut
      if (timeOut) {
        return moment(timeOut).tz(PH_TIMEZONE).toDate();
      }
      return timeOut;
    }
  },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Absent', 'Completed', 'Half-day', 'Early', 'Overtime', 'In_Leave', 'No_Work', 'Pending'],
    default: 'Pending'
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
  timezone: {
    type: String,
    default: PH_TIMEZONE
  },
  timezoneDisplay: {
    type: String,
    default: PH_TIMEZONE_DISPLAY
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  collectionName: {
    type: String,
    default: 'EMS_Attendance'
  },
  databaseName: {
    type: String,
    default: 'BrightonSystem'
  },
  leaveDetails: {
    startDate: Date,
    endDate: Date,
    reason: String,
    leaveType: {
      type: String,
      enum: ['Vacation', 'Sick', 'Emergency', 'Personal', 'Maternity', 'Paternity', 'Bereavement', 'Study', 'Sabbatical']
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Approved'
    },
    approvedBy: String,
    approvedAt: Date
  },
  isLeaveRecord: {
    type: Boolean,
    default: false
  },
  isNoWorkDay: {
    type: Boolean,
    default: false
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
attendanceSchema.index({ timeInSource: 1 });
attendanceSchema.index({ timeOutSource: 1 });
attendanceSchema.index({ department: 1 });
attendanceSchema.index({ collectionName: 1 });
attendanceSchema.index({ timezone: 1 });
attendanceSchema.index({ isLeaveRecord: 1 });
attendanceSchema.index({ isNoWorkDay: 1 });
attendanceSchema.index({ 'leaveDetails.status': 1 });

// ==================== PHILIPPINE TIMEZONE HELPER FUNCTIONS ====================

function getCurrentPhilippineTime() {
  return moment().tz(PH_TIMEZONE);
}

function formatTime(date) {
  if (!date) return '';
  const phMoment = moment(date).tz(PH_TIMEZONE);
  const hours = phMoment.hours();
  const minutes = phMoment.minutes().toString().padStart(2, '0');
  const seconds = phMoment.seconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes}:${seconds} ${ampm} (PST)`;
}

function formatDate(date) {
  if (!date) return '';
  return moment(date).tz(PH_TIMEZONE).format('YYYY-MM-DD');
}

function getPHDateString(date) {
  return moment(date).tz(PH_TIMEZONE).format('YYYY-MM-DD');
}

function getTodayPHString() {
  return getCurrentPhilippineTime().format('YYYY-MM-DD');
}

function getPHDateTime(date) {
  return moment(date).tz(PH_TIMEZONE).toDate();
}

function getCurrentPHDateTime() {
  return getCurrentPhilippineTime().toDate();
}

// ==================== WORKING HOURS VALIDATION ====================

function isWithinWorkingHours(date) {
  const phMoment = moment(date).tz(PH_TIMEZONE);
  const hour = phMoment.hour();
  const minute = phMoment.minute();
  
  const currentTime = moment().tz(PH_TIMEZONE).set({ hour, minute, second: 0 });
  const startTime = moment().tz(PH_TIMEZONE).set({ hour: WORKING_HOURS.START_HOUR, minute: WORKING_HOURS.START_MINUTE, second: 0 });
  const endTime = moment().tz(PH_TIMEZONE).set({ hour: WORKING_HOURS.END_HOUR, minute: WORKING_HOURS.END_MINUTE, second: 0 });
  
  return currentTime.isSameOrAfter(startTime) && currentTime.isBefore(endTime);
}

function isTimeInAllowed(date) {
  const phMoment = moment(date).tz(PH_TIMEZONE);
  const hour = phMoment.hour();
  const minute = phMoment.minute();
  
  const currentTime = moment().tz(PH_TIMEZONE).set({ hour, minute, second: 0 });
  const startTime = moment().tz(PH_TIMEZONE).set({ hour: WORKING_HOURS.START_HOUR, minute: WORKING_HOURS.START_MINUTE, second: 0 });
  const cutoffTime = moment().tz(PH_TIMEZONE).set({ hour: WORKING_HOURS.TIMEIN_CUTOFF_HOUR, minute: WORKING_HOURS.TIMEIN_CUTOFF_MINUTE, second: 0 });
  
  return currentTime.isSameOrAfter(startTime) && currentTime.isBefore(cutoffTime);
}

function isTimeOutAllowed(date) {
  const phMoment = moment(date).tz(PH_TIMEZONE);
  const hour = phMoment.hour();
  const minute = phMoment.minute();
  
  const currentTime = moment().tz(PH_TIMEZONE).set({ hour, minute, second: 0 });
  const startTime = moment().tz(PH_TIMEZONE).set({ hour: WORKING_HOURS.START_HOUR, minute: WORKING_HOURS.START_MINUTE, second: 0 });
  const endTime = moment().tz(PH_TIMEZONE).set({ hour: WORKING_HOURS.END_HOUR, minute: WORKING_HOURS.END_MINUTE, second: 0 });
  
  return currentTime.isSameOrAfter(startTime) && currentTime.isBefore(endTime);
}

// ==================== VIRTUALS ====================

attendanceSchema.virtual('formattedDate').get(function() {
  return moment(this.date).tz(PH_TIMEZONE).format('MMMM D, YYYY');
});

attendanceSchema.virtual('isCompleted').get(function() {
  return !!(this.timeIn && this.timeOut);
});

attendanceSchema.virtual('displayTimeIn').get(function() {
  if (this.isLeaveRecord) return 'IN_LEAVE';
  if (this.isNoWorkDay) return 'NO WORK TODAY';
  if (!this.timeIn) return 'Pending';
  return formatTime(this.timeIn);
});

attendanceSchema.virtual('displayTimeOut').get(function() {
  if (this.isLeaveRecord) return 'IN_LEAVE';
  if (this.isNoWorkDay) return 'NO WORK TODAY';
  if (!this.timeOut) return 'Pending';
  return formatTime(this.timeOut);
});

attendanceSchema.virtual('displayDate').get(function() {
  return formatDate(this.date);
});

attendanceSchema.virtual('formattedLateTime').get(function() {
  if (this.isLeaveRecord || this.isNoWorkDay) return 'N/A';
  if (!this.lateMinutes || this.lateMinutes === 0) return '0h 0m';
  const hours = Math.floor(this.lateMinutes / 60);
  const minutes = this.lateMinutes % 60;
  return `${hours}h ${minutes}m`;
});

attendanceSchema.virtual('formattedOvertimeTime').get(function() {
  if (this.isLeaveRecord || this.isNoWorkDay) return 'N/A';
  if (!this.overtimeMinutes || this.overtimeMinutes === 0) return '0h 0m';
  const hours = Math.floor(this.overtimeMinutes / 60);
  const minutes = this.overtimeMinutes % 60;
  return `${hours}h ${minutes}m`;
});

attendanceSchema.virtual('workDuration').get(function() {
  if (this.isLeaveRecord || this.isNoWorkDay) {
    return { hours: 0, minutes: 0, totalMinutes: 0 };
  }
  
  if (this.timeIn && this.timeOut) {
    const timeInPH = moment(this.timeIn).tz(PH_TIMEZONE);
    const timeOutPH = moment(this.timeOut).tz(PH_TIMEZONE);
    const duration = timeOutPH.diff(timeInPH, 'minutes');
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return { hours, minutes, totalMinutes: duration };
  }
  return { hours: 0, minutes: 0, totalMinutes: 0 };
});

attendanceSchema.virtual('phTimeInfo').get(function() {
  return {
    timezone: this.timezone || PH_TIMEZONE,
    timezoneDisplay: this.timezoneDisplay || PH_TIMEZONE_DISPLAY,
    currentPHTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
    displayTimeIn: this.displayTimeIn,
    displayTimeOut: this.displayTimeOut,
    storedTimeIn: this.timeIn ? moment(this.timeIn).tz(PH_TIMEZONE).format() : null,
    storedTimeOut: this.timeOut ? moment(this.timeOut).tz(PH_TIMEZONE).format() : null
  };
});

attendanceSchema.virtual('isOnLeave').get(function() {
  return this.status === 'In_Leave' || this.isLeaveRecord;
});

// ==================== NEW TIME PST HELPER METHODS ====================

attendanceSchema.methods.getTimeInPST = function() {
  if (!this.timeIn) return null;
  return moment(this.timeIn).tz(PH_TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
};

attendanceSchema.methods.getTimeOutPST = function() {
  if (!this.timeOut) return null;
  return moment(this.timeOut).tz(PH_TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
};

attendanceSchema.methods.getTimeInObject = function() {
  if (!this.timeIn) return null;
  const phMoment = moment(this.timeIn).tz(PH_TIMEZONE);
  return {
    date: phMoment.toDate(),
    formatted: phMoment.format('YYYY-MM-DD HH:mm:ss'),
    display: formatTime(this.timeIn),
    iso: phMoment.toISOString(),
    timestamp: phMoment.valueOf()
  };
};

attendanceSchema.methods.getTimeOutObject = function() {
  if (!this.timeOut) return null;
  const phMoment = moment(this.timeOut).tz(PH_TIMEZONE);
  return {
    date: phMoment.toDate(),
    formatted: phMoment.format('YYYY-MM-DD HH:mm:ss'),
    display: formatTime(this.timeOut),
    iso: phMoment.toISOString(),
    timestamp: phMoment.valueOf()
  };
};

// ==================== METHODS ====================

attendanceSchema.methods.calculateLateMinutes = async function() {
  if (this.isOnLeave || this.isNoWorkDay) return 0;
  
  if (!this.timeIn) return 0;
  
  try {
    const employee = await mongoose.model('Employee').findOne({ employeeId: this.employeeId });
    if (!employee || !employee.workSchedule) return 0;
    
    const timeInPH = moment(this.timeIn).tz(PH_TIMEZONE);
    const dayOfWeek = timeInPH.format('dddd');
    const schedule = employee.workSchedule[dayOfWeek];
    
    if (!schedule || !schedule.active) return 0;
    
    const [scheduledHour, scheduledMinute] = schedule.start.split(':').map(Number);
    const scheduledTime = moment(this.timeIn).tz(PH_TIMEZONE).hour(scheduledHour).minute(scheduledMinute).second(0);
    
    if (timeInPH.isAfter(scheduledTime)) {
      return timeInPH.diff(scheduledTime, 'minutes');
    }
    
    return 0;
  } catch (error) {
    console.error('Error calculating late minutes:', error);
    return 0;
  }
};

attendanceSchema.methods.calculateOvertimeMinutes = async function() {
  if (this.isOnLeave || this.isNoWorkDay) return 0;
  
  if (!this.timeOut) return 0;
  
  try {
    const employee = await mongoose.model('Employee').findOne({ employeeId: this.employeeId });
    if (!employee || !employee.workSchedule) return 0;
    
    const timeOutPH = moment(this.timeOut).tz(PH_TIMEZONE);
    const dayOfWeek = timeOutPH.format('dddd');
    const schedule = employee.workSchedule[dayOfWeek];
    
    if (!schedule || !schedule.active) return 0;
    
    const [scheduledHour, scheduledMinute] = schedule.end.split(':').map(Number);
    const scheduledEndTime = moment(this.timeOut).tz(PH_TIMEZONE).hour(scheduledHour).minute(scheduledMinute).second(0);
    
    if (timeOutPH.isAfter(scheduledEndTime)) {
      return timeOutPH.diff(scheduledEndTime, 'minutes');
    }
    
    return 0;
  } catch (error) {
    console.error('Error calculating overtime minutes:', error);
    return 0;
  }
};

attendanceSchema.methods.calculateHoursWorked = async function() {
  if (this.isOnLeave) {
    this.hoursWorked = 'IN_LEAVE';
    this.totalMinutes = 0;
    this.lateMinutes = 0;
    this.overtimeMinutes = 0;
    this.status = 'In_Leave';
    return { 
      hours: 0, 
      minutes: 0, 
      totalMinutes: 0, 
      lateMinutes: 0, 
      overtimeMinutes: 0,
      timezone: PH_TIMEZONE_DISPLAY 
    };
  }

  if (this.isNoWorkDay) {
    this.hoursWorked = 'NO WORK TODAY';
    this.totalMinutes = 0;
    this.lateMinutes = 0;
    this.overtimeMinutes = 0;
    this.status = 'No_Work';
    return { 
      hours: 0, 
      minutes: 0, 
      totalMinutes: 0, 
      lateMinutes: 0, 
      overtimeMinutes: 0,
      timezone: PH_TIMEZONE_DISPLAY 
    };
  }

  if (this.timeIn && this.timeOut) {
    const timeInPH = moment(this.timeIn).tz(PH_TIMEZONE);
    const timeOutPH = moment(this.timeOut).tz(PH_TIMEZONE);
    
    const diff = timeOutPH.diff(timeInPH);
    const totalMinutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    this.totalMinutes = totalMinutes;
    this.hoursWorked = `${hours}h ${minutes}m`;
    
    this.lateMinutes = await this.calculateLateMinutes();
    this.overtimeMinutes = await this.calculateOvertimeMinutes();
    
    if (this.lateMinutes > 0 && !this.timeOut) {
      this.status = 'Late';
    } else if (this.timeOut) {
      this.status = 'Completed';
    } else if (this.timeIn) {
      this.status = 'Present';
    }
    
    return { 
      hours, 
      minutes, 
      totalMinutes, 
      lateMinutes: this.lateMinutes, 
      overtimeMinutes: this.overtimeMinutes,
      timezone: PH_TIMEZONE_DISPLAY 
    };
  }
  
  if (this.timeIn && !this.timeOut) {
    this.lateMinutes = await this.calculateLateMinutes();
    if (this.lateMinutes > 0) {
      this.status = 'Late';
    } else {
      this.status = 'Present';
    }
  }
  
  return { 
    hours: 0, 
    minutes: 0, 
    totalMinutes: 0, 
    lateMinutes: 0, 
    overtimeMinutes: 0,
    timezone: PH_TIMEZONE_DISPLAY 
  };
};

attendanceSchema.methods.canTimeOut = function(proposedTimeOut, source = 'manual') {
  if (this.isOnLeave || this.isNoWorkDay) return { allowed: false, reason: 'Cannot record time out while on leave or no work day' };
  
  if (!this.timeIn) return { allowed: false, reason: 'No time in recorded' };
  
  const timeInPH = moment(this.timeIn).tz(PH_TIMEZONE);
  const timeOutPH = moment(proposedTimeOut).tz(PH_TIMEZONE);
  
  const timeDifference = timeOutPH.diff(timeInPH, 'minutes');
  
  if (timeDifference < 10) {
    const remainingMinutes = Math.ceil(10 - timeDifference);
    return { 
      allowed: false, 
      reason: `Please wait at least 10 minutes between time in and time out. Wait ${remainingMinutes} more minutes.`,
      remainingMinutes: remainingMinutes,
      timezone: PH_TIMEZONE_DISPLAY
    };
  }
  
  return { 
    allowed: true, 
    reason: 'Time out allowed',
    timezone: PH_TIMEZONE_DISPLAY
  };
};

attendanceSchema.methods.updateTimeOut = async function(timeOut, source = 'manual') {
  if (this.isOnLeave || this.isNoWorkDay) {
    throw new Error('Cannot record time out while on leave or no work day');
  }

  const validation = this.canTimeOut(timeOut, source);
  if (!validation.allowed) {
    throw new Error(validation.reason);
  }
  
  // Convert to PST before saving
  this.timeOut = moment(timeOut).tz(PH_TIMEZONE).toDate();
  this.timeOutSource = source;
  this.lastModified = getCurrentPHDateTime();
  this.timezone = PH_TIMEZONE;
  this.timezoneDisplay = PH_TIMEZONE_DISPLAY;
  
  await this.calculateHoursWorked();
  
  if (this.status !== 'Completed') {
    this.status = 'Completed';
  }
  
  return this;
};

// ==================== STATIC METHODS ====================

attendanceSchema.statics.calculateWorkDays = function(startDate, endDate) {
  let workDays = 0;
  const currentDate = moment(startDate).tz(PH_TIMEZONE).startOf('day');
  const today = getCurrentPhilippineTime().startOf('day');
  
  const actualEndDate = moment(endDate).tz(PH_TIMEZONE).startOf('day');
  const finalEndDate = actualEndDate.isAfter(today) ? today : actualEndDate;
  
  while (currentDate.isSameOrBefore(finalEndDate)) {
    const dayOfWeek = currentDate.day();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workDays++;
    }
    currentDate.add(1, 'day');
  }
  
  return workDays;
};

attendanceSchema.statics.processAutomaticTimeOut = async function() {
  try {
    const todayStr = getTodayPHString();
    const now = getCurrentPhilippineTime();
    
    const incompleteAttendance = await this.find({
      date: todayStr,
      timeIn: { $exists: true },
      timeOut: { $exists: false },
      isLeaveRecord: { $ne: true },
      isNoWorkDay: { $ne: true },
      status: { $ne: 'In_Leave' }
    });
    
    const results = {
      processed: 0,
      errors: 0,
      details: [],
      timezone: PH_TIMEZONE_DISPLAY,
      processedAt: now.format('YYYY-MM-DD HH:mm:ss')
    };
    
    for (const attendance of incompleteAttendance) {
      try {
        const employee = await mongoose.model('Employee').findOne({ 
          employeeId: attendance.employeeId 
        });
        
        if (!employee) {
          continue;
        }
        
        const dayOfWeek = now.format('dddd');
        const schedule = employee.workSchedule[dayOfWeek];
        
        let automaticTimeOut = null;
        
        if (schedule && schedule.active) {
          const [endHour, endMinute] = schedule.end.split(':').map(Number);
          automaticTimeOut = now.clone().hour(endHour).minute(endMinute).second(0);
          
          if (now.isAfter(automaticTimeOut)) {
            automaticTimeOut = automaticTimeOut.toDate();
          } else {
            automaticTimeOut = now.toDate();
          }
        } else {
          automaticTimeOut = now.toDate();
        }
        
        const timeInPH = moment(attendance.timeIn).tz(PH_TIMEZONE);
        const timeOutPH = moment(automaticTimeOut).tz(PH_TIMEZONE);
        const timeDifference = timeOutPH.diff(timeInPH, 'minutes');
        
        if (timeDifference < 10) {
          continue;
        }
        
        attendance.timeOut = automaticTimeOut;
        attendance.timeOutSource = 'automatic';
        attendance.lastModified = getCurrentPHDateTime();
        attendance.timezone = PH_TIMEZONE;
        attendance.timezoneDisplay = PH_TIMEZONE_DISPLAY;
        
        await attendance.calculateHoursWorked();
        await attendance.save();
        
        results.processed++;
        results.details.push({
          employeeId: attendance.employeeId,
          employeeName: attendance.employeeName,
          automaticTimeOut: formatTime(automaticTimeOut),
          hoursWorked: attendance.hoursWorked,
          lateMinutes: attendance.lateMinutes,
          overtimeMinutes: attendance.overtimeMinutes,
          timezone: PH_TIMEZONE_DISPLAY
        });
        
      } catch (error) {
        results.errors++;
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('Error in automatic time out process:', error);
    throw error;
  }
};

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

attendanceSchema.statics.hasTimedInToday = async function(employeeId) {
  const attendance = await this.getTodaysAttendance(employeeId);
  return !!(attendance && attendance.timeIn && !attendance.isOnLeave && !attendance.isNoWorkDay);
};

attendanceSchema.statics.hasTimedOutToday = async function(employeeId) {
  const attendance = await this.getTodaysAttendance(employeeId);
  return !!(attendance && attendance.timeOut && !attendance.isOnLeave && !attendance.isNoWorkDay);
};

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

    const Leave = mongoose.model('Leave');
    const isOnLeave = await Leave.isEmployeeOnLeave(employeeId, todayStr);
    if (isOnLeave) {
      throw new Error('Cannot record time out while on leave');
    }

    if (attendance.timeOut) {
      throw new Error('Time out already recorded for today');
    }

    // Convert timeOut to PST for validation and storage
    const timeOutPST = moment(timeOut).tz(PH_TIMEZONE).toDate();
    
    const validation = attendance.canTimeOut(timeOutPST, source);
    if (!validation.allowed) {
      throw new Error(validation.reason);
    }

    attendance.timeOut = timeOutPST; // Store as PST
    attendance.timeOutSource = source;
    attendance.lastModified = getCurrentPHDateTime();
    attendance.timezone = PH_TIMEZONE;
    attendance.timezoneDisplay = PH_TIMEZONE_DISPLAY;

    await attendance.calculateHoursWorked();
    
    attendance.status = 'Completed';

    const result = await attendance.save();
    
    return result;

  } catch (error) {
    console.error('Error processing time out:', error);
    throw error;
  }
};

attendanceSchema.statics.processRfidScan = async function(employeeId, scanTime, action) {
  try {
    const todayStr = getTodayPHString();
    let attendance = await this.findOne({
      employeeId: employeeId,
      date: todayStr
    });

    const Leave = mongoose.model('Leave');
    const isOnLeave = await Leave.isEmployeeOnLeave(employeeId, todayStr);
    if (isOnLeave) {
      throw new Error('Cannot record attendance while on leave');
    }

    // Convert scanTime to PST for validation
    const scanTimePST = moment(scanTime).tz(PH_TIMEZONE);
    
    if (!isWithinWorkingHours(scanTimePST.toDate())) {
      throw new Error('RFID scanning only allowed between 6:00 AM - 7:00 PM Philippines Time EVERYDAY');
    }

    if (action === 'timein') {
      if (!isTimeInAllowed(scanTimePST.toDate())) {
        throw new Error('Time in only allowed between 6:00 AM - 5:00 PM Philippines Time');
      }

      if (attendance && attendance.timeIn) {
        throw new Error('Time in already recorded for today');
      }

      if (!attendance) {
        const employee = await mongoose.model('Employee').findOne({ employeeId: employeeId });
        if (!employee) {
          throw new Error('Employee not found');
        }

        attendance = new this({
          employeeId: employee.employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          position: employee.position,
          date: todayStr,
          timeIn: scanTimePST.toDate(), // Store as PST
          status: 'Present',
          dateEmployed: employee.dateEmployed,
          recordType: 'auto',
          timeInSource: 'rfid',
          timezone: PH_TIMEZONE,
          timezoneDisplay: PH_TIMEZONE_DISPLAY,
          collectionName: 'EMS_Attendance',
          databaseName: 'BrightonSystem',
          isLeaveRecord: false,
          isNoWorkDay: false
        });
      } else {
        attendance.timeIn = scanTimePST.toDate(); // Store as PST
        attendance.status = 'Present';
        attendance.timeInSource = 'rfid';
        attendance.recordType = 'auto';
        attendance.timezone = PH_TIMEZONE;
        attendance.timezoneDisplay = PH_TIMEZONE_DISPLAY;
        attendance.isLeaveRecord = false;
        attendance.isNoWorkDay = false;
      }

      await attendance.calculateHoursWorked();

      const result = await attendance.save();
      return { type: 'timein', data: result };

    } else if (action === 'timeout') {
      if (!isTimeOutAllowed(scanTimePST.toDate())) {
        throw new Error('Time out only allowed between 6:00 AM - 7:00 PM Philippines Time');
      }

      if (!attendance || !attendance.timeIn) {
        throw new Error('No time in record found for today');
      }

      if (attendance.timeOut) {
        throw new Error('Time out already recorded for today');
      }

      const result = await this.processTimeOut(employeeId, scanTimePST.toDate(), 'rfid');
      return { type: 'timeout', data: result };

    } else {
      throw new Error('Invalid action. Must be "timein" or "timeout"');
    }

  } catch (error) {
    console.error('Error processing RFID scan:', error);
    throw error;
  }
};

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
        lastUpdated: getCurrentPHDateTime(),
        employee: null,
        timezone: PH_TIMEZONE_DISPLAY,
        collection: 'EMS_Attendance',
        database: 'BrightonSystem'
      };
    }
    
    const employmentDate = moment(employee.dateEmployed).tz(PH_TIMEZONE).startOf('day');
    const today = getCurrentPhilippineTime().startOf('day');
    
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
        lastUpdated: getCurrentPHDateTime(),
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
        timezone: PH_TIMEZONE_DISPLAY,
        collection: 'EMS_Attendance',
        database: 'BrightonSystem'
      };
    }
    
    const startDateStr = employmentDate.format('YYYY-MM-DD');
    const endDateStr = today.format('YYYY-MM-DD');
    
    const attendanceRecords = await this.find({
      employeeId: employeeId,
      date: {
        $gte: startDateStr,
        $lte: endDateStr
      }
    });
    
    const totalWorkDays = this.calculateWorkDays(employmentDate.toDate(), today.toDate());
    
    const presentDays = attendanceRecords.filter(record => 
      record.timeIn && !record.isOnLeave && !record.isNoWorkDay
    ).length;
    
    const leaveDays = attendanceRecords.filter(record => 
      record.isOnLeave
    ).length;
    
    const noWorkDays = attendanceRecords.filter(record => 
      record.isNoWorkDay
    ).length;
    
    const lateDays = attendanceRecords.filter(record => 
      record.status === 'Late' && !record.isOnLeave && !record.isNoWorkDay
    ).length;
    
    const absentDays = Math.max(0, totalWorkDays - presentDays - leaveDays - noWorkDays);
    
    const totalMinutes = attendanceRecords
      .filter(record => !record.isOnLeave && !record.isNoWorkDay)
      .reduce((sum, record) => sum + (record.totalMinutes || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    
    return {
      presentDays,
      absentDays,
      leaveDays,
      noWorkDays,
      totalHours: totalHours,
      totalMinutes: totalMinutes,
      lateDays,
      totalWorkDays,
      averageHours: presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0,
      employmentDate: employmentDate.toDate(),
      actualWorkDays: totalWorkDays,
      attendanceRecords: attendanceRecords.length,
      lastUpdated: getCurrentPHDateTime(),
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
      },
      timezone: PH_TIMEZONE_DISPLAY,
      currentPHTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
      collection: 'EMS_Attendance',
      database: 'BrightonSystem'
    };
  } catch (error) {
    console.error('Error in real-time summary calculation:', error);
    throw error;
  }
};

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
        lastUpdated: getCurrentPHDateTime(),
        employee: null,
        timezone: PH_TIMEZONE_DISPLAY,
        collection: 'EMS_Attendance',
        database: 'BrightonSystem'
      };
    }
    
    const employmentDate = moment(employee.dateEmployed).tz(PH_TIMEZONE).startOf('day');
    const startOfMonth = moment.tz(`${year}-${month}-01`, 'YYYY-M-D', PH_TIMEZONE).startOf('day');
    const endOfMonth = moment.tz(`${year}-${month}-01`, 'YYYY-M-D', PH_TIMEZONE).endOf('month').startOf('day');
    const today = getCurrentPhilippineTime().startOf('day');
    
    const queryStartDate = employmentDate.isAfter(startOfMonth) ? employmentDate : startOfMonth;
    
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
        lastUpdated: getCurrentPHDateTime(),
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
        },
        timezone: PH_TIMEZONE_DISPLAY,
        collection: 'EMS_Attendance',
        database: 'BrightonSystem'
      };
    }
    
    const queryEndDate = today.isBefore(endOfMonth) ? today : endOfMonth;
    
    const startDateStr = queryStartDate.format('YYYY-MM-DD');
    const endDateStr = queryEndDate.format('YYYY-MM-DD');
    
    const attendanceRecords = await this.find({
      employeeId: employeeId,
      date: {
        $gte: startDateStr,
        $lte: endDateStr
      }
    });
    
    const totalWorkDays = this.calculateWorkDays(queryStartDate.toDate(), queryEndDate.toDate());
    
    const presentDays = attendanceRecords.filter(record => 
      record.timeIn && !record.isOnLeave && !record.isNoWorkDay
    ).length;
    
    const leaveDays = attendanceRecords.filter(record => 
      record.isOnLeave
    ).length;
    
    const noWorkDays = attendanceRecords.filter(record => 
      record.isNoWorkDay
    ).length;
    
    const lateDays = attendanceRecords.filter(record => 
      record.status === 'Late' && !record.isOnLeave && !record.isNoWorkDay
    ).length;
    
    const absentDays = Math.max(0, totalWorkDays - presentDays - leaveDays - noWorkDays);
    
    const totalMinutes = attendanceRecords
      .filter(record => !record.isOnLeave && !record.isNoWorkDay)
      .reduce((sum, record) => sum + (record.totalMinutes || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    
    return {
      presentDays,
      absentDays,
      leaveDays,
      noWorkDays,
      totalHours: totalHours,
      totalMinutes: totalMinutes,
      lateDays,
      totalWorkDays,
      averageHours: presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0,
      employmentDate: employmentDate.toDate(),
      actualWorkDays: totalWorkDays,
      attendanceRecords: attendanceRecords.length,
      lastUpdated: getCurrentPHDateTime(),
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
      },
      timezone: PH_TIMEZONE_DISPLAY,
      currentPHTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
      collection: 'EMS_Attendance',
      database: 'BrightonSystem'
    };
  } catch (error) {
    console.error('Error in monthly summary calculation:', error);
    throw error;
  }
};

attendanceSchema.statics.getWorkDaysSinceEmployment = async function(employeeId) {
  try {
    const employee = await mongoose.model('Employee').findOne({ employeeId: employeeId });
    
    if (!employee) {
      return 0;
    }
    
    const employmentDate = moment(employee.dateEmployed).tz(PH_TIMEZONE).startOf('day');
    const today = getCurrentPhilippineTime().startOf('day');
    
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

attendanceSchema.statics.getAttendanceHistory = async function(employeeId) {
  try {
    const employee = await mongoose.model('Employee').findOne({ employeeId: employeeId });
    
    if (!employee) {
      return [];
    }
    
    const employmentDate = moment(employee.dateEmployed).tz(PH_TIMEZONE).startOf('day');
    const today = getCurrentPhilippineTime().startOf('day');
    
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

attendanceSchema.statics.getDashboardStats = async function() {
  try {
    const todayStr = getTodayPHString();
    
    const totalEmployees = await mongoose.model('Employee').countDocuments({ status: 'Active' });
    const todayAttendance = await this.find({ date: todayStr });
    
    const present = todayAttendance.filter(a => a.timeIn && !a.isOnLeave && !a.isNoWorkDay).length;
    const onLeave = todayAttendance.filter(a => a.isOnLeave).length;
    const noWork = todayAttendance.filter(a => a.isNoWorkDay).length;
    const absent = totalEmployees - present - onLeave - noWork;
    const completed = todayAttendance.filter(a => a.timeOut && !a.isOnLeave && !a.isNoWorkDay).length;
    const late = todayAttendance.filter(a => a.status === 'Late' && !a.isOnLeave && !a.isNoWorkDay).length;
    const onTime = present - late;

    return {
      summary: {
        present,
        absent,
        onLeave,
        noWork,
        completed,
        late,
        onTime,
        totalEmployees
      },
      records: todayAttendance,
      date: todayStr,
      phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
      timezone: PH_TIMEZONE_DISPLAY,
      collection: 'EMS_Attendance',
      database: 'BrightonSystem'
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      summary: {
        present: 0,
        absent: 0,
        onLeave: 0,
        noWork: 0,
        completed: 0,
        late: 0,
        onTime: 0,
        totalEmployees: 0
      },
      records: [],
      date: getTodayPHString(),
      phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
      timezone: PH_TIMEZONE_DISPLAY,
      collection: 'EMS_Attendance',
      database: 'BrightonSystem'
    };
  }
};

attendanceSchema.statics.getAttendanceByDateRange = async function(startDate, endDate, employeeId = null) {
  try {
    let filter = {
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };

    if (employeeId) {
      filter.employeeId = employeeId;
    }

    const attendance = await this.find(filter)
      .sort({ date: -1, timeIn: -1 });

    return {
      success: true,
      data: attendance,
      count: attendance.length,
      period: { startDate, endDate },
      timezone: PH_TIMEZONE_DISPLAY,
      collection: 'EMS_Attendance',
      database: 'BrightonSystem'
    };
  } catch (error) {
    console.error('Error fetching attendance by date range:', error);
    throw error;
  }
};

attendanceSchema.statics.getAttendanceBySource = async function(source, date = null) {
  try {
    let filter = {
      $or: [
        { timeInSource: source },
        { timeOutSource: source }
      ]
    };

    if (date) {
      filter.date = date;
    }

    const attendance = await this.find(filter)
      .sort({ date: -1, timeIn: -1 });

    return {
      success: true,
      data: attendance,
      count: attendance.length,
      source: source,
      timezone: PH_TIMEZONE_DISPLAY,
      collection: 'EMS_Attendance',
      database: 'BrightonSystem'
    };
  } catch (error) {
    console.error('Error fetching attendance by source:', error);
    throw error;
  }
};

attendanceSchema.statics.getMixedAttendance = async function(date = null) {
  try {
    let filter = {
      $or: [
        { timeInSource: 'rfid', timeOutSource: 'manual' },
        { timeInSource: 'manual', timeOutSource: 'rfid' }
      ]
    };

    if (date) {
      filter.date = date;
    }

    const attendance = await this.find(filter)
      .sort({ date: -1, timeIn: -1 });

    return {
      success: true,
      data: attendance,
      count: attendance.length,
      description: 'Records with mixed RFID and manual attendance methods',
      timezone: PH_TIMEZONE_DISPLAY,
      collection: 'EMS_Attendance',
      database: 'BrightonSystem'
    };
  } catch (error) {
    console.error('Error fetching mixed attendance records:', error);
    throw error;
  }
};

attendanceSchema.statics.getDepartmentStats = async function(date = null) {
  try {
    const targetDate = date || getTodayPHString();

    const departmentStats = await this.aggregate([
      { $match: { date: targetDate } },
      {
        $group: {
          _id: '$department',
          totalEmployees: { $addToSet: '$employeeId' },
          present: {
            $sum: {
              $cond: [
                { $and: [
                  { $ifNull: ['$timeIn', false] },
                  { $ne: ['$isLeaveRecord', true] },
                  { $ne: ['$isNoWorkDay', true] }
                ]}, 1, 0]
            }
          },
          completed: {
            $sum: {
              $cond: [
                { $and: [
                  { $ifNull: ['$timeOut', false] },
                  { $ne: ['$isLeaveRecord', true] },
                  { $ne: ['$isNoWorkDay', true] }
                ]}, 1, 0]
            }
          },
          onLeave: {
            $sum: {
              $cond: [{ $eq: ['$isLeaveRecord', true] }, 1, 0]
            }
          },
          noWork: {
            $sum: {
              $cond: [{ $eq: ['$isNoWorkDay', true] }, 1, 0]
            }
          },
          late: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$status', 'Late'] },
                  { $ne: ['$isLeaveRecord', true] },
                  { $ne: ['$isNoWorkDay', true] }
                ]}, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          department: '$_id',
          totalEmployees: { $size: '$totalEmployees' },
          present: 1,
          completed: 1,
          onLeave: 1,
          noWork: 1,
          late: 1,
          absent: {
            $subtract: [
              { $size: '$totalEmployees' },
              { $add: ['$present', '$onLeave', '$noWork'] }
            ]
          },
          attendanceRate: {
            $multiply: [
              {
                $cond: [
                  { $eq: [{ $size: '$totalEmployees' }, 0] },
                  0,
                  {
                    $divide: [
                      '$present',
                      { $size: '$totalEmployees' }
                    ]
                  }
                ]
              },
              100
            ]
          }
        }
      },
      { $sort: { department: 1 } }
    ]);

    return {
      success: true,
      data: departmentStats,
      date: targetDate,
      timezone: PH_TIMEZONE_DISPLAY,
      currentPHTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
      collection: 'EMS_Attendance',
      database: 'BrightonSystem'
    };
  } catch (error) {
    console.error('Error fetching department statistics:', error);
    throw error;
  }
};

// ==================== LEAVE MANAGEMENT METHODS ====================

attendanceSchema.statics.assignLeave = async function(employeeId, startDate, endDate, reason, leaveType, status = 'Approved') {
  try {
    const employee = await mongoose.model('Employee').findOne({ employeeId: employeeId });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    const start = moment(startDate).tz(PH_TIMEZONE).startOf('day');
    const end = moment(endDate).tz(PH_TIMEZONE).startOf('day');
    const today = getCurrentPhilippineTime().startOf('day');

    if (end.isBefore(start)) {
      throw new Error('End date cannot be before start date');
    }

    const numberOfDays = this.calculateWorkDays(start.toDate(), end.toDate());

    const Leave = mongoose.model('Leave');
    const leaveRecord = new Leave({
      employeeId: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      department: employee.department,
      position: employee.position,
      startDate: start.toDate(),
      endDate: end.toDate(),
      reason: reason,
      leaveType: leaveType,
      status: status,
      numberOfDays: numberOfDays,
      approvedBy: 'System',
      approvedAt: getCurrentPHDateTime()
    });

    await leaveRecord.save();

    const leaveRecords = [];
    const errors = [];

    for (let date = moment(start); date.isSameOrBefore(end); date.add(1, 'day')) {
      const dateStr = date.format('YYYY-MM-DD');
      
      if (date.isAfter(today)) {
        continue;
      }

      try {
        let existingRecord = await this.findOne({
          employeeId: employeeId,
          date: dateStr
        });

        if (existingRecord) {
          existingRecord.status = 'In_Leave';
          existingRecord.isLeaveRecord = true;
          existingRecord.timeIn = null;
          existingRecord.timeOut = null;
          existingRecord.hoursWorked = 'IN_LEAVE';
          existingRecord.totalMinutes = 0;
          existingRecord.lateMinutes = 0;
          existingRecord.overtimeMinutes = 0;
          existingRecord.notes = `Leave: ${leaveType} - ${reason}`;
          existingRecord.recordType = 'manual';
          existingRecord.recordedBy = 'Admin';
          existingRecord.leaveDetails = {
            startDate: start.toDate(),
            endDate: end.toDate(),
            reason: reason,
            leaveType: leaveType,
            status: status,
            approvedBy: 'System',
            approvedAt: getCurrentPHDateTime()
          };
          existingRecord.lastModified = getCurrentPHDateTime();

          await existingRecord.save();
          leaveRecords.push(existingRecord);
        } else {
          const leaveAttendanceRecord = new this({
            employeeId: employee.employeeId,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            department: employee.department,
            position: employee.position,
            date: dateStr,
            timeIn: null,
            timeOut: null,
            status: 'In_Leave',
            hoursWorked: 'IN_LEAVE',
            totalMinutes: 0,
            lateMinutes: 0,
            overtimeMinutes: 0,
            notes: `Leave: ${leaveType} - ${reason}`,
            dateEmployed: employee.dateEmployed,
            recordType: 'manual',
            recordedBy: 'Admin',
            timeInSource: 'system',
            timeOutSource: 'system',
            timezone: PH_TIMEZONE,
            timezoneDisplay: PH_TIMEZONE_DISPLAY,
            collectionName: 'EMS_Attendance',
            databaseName: 'BrightonSystem',
            isLeaveRecord: true,
            isNoWorkDay: false,
            leaveDetails: {
              startDate: start.toDate(),
              endDate: end.toDate(),
              reason: reason,
              leaveType: leaveType,
              status: status,
              approvedBy: 'System',
              approvedAt: getCurrentPHDateTime()
            }
          });

          const savedRecord = await leaveAttendanceRecord.save();
          leaveRecords.push(savedRecord);
        }
      } catch (error) {
        errors.push({
          date: dateStr,
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `Leave assigned successfully for ${leaveRecords.length} days`,
      leaveRecords: leaveRecords,
      leaveDocument: leaveRecord,
      errors: errors,
      employee: {
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`
      },
      leaveDetails: {
        startDate: start.toDate(),
        endDate: end.toDate(),
        reason: reason,
        leaveType: leaveType,
        status: status,
        numberOfDays: numberOfDays
      }
    };

  } catch (error) {
    console.error('Error assigning leave:', error);
    throw error;
  }
};

attendanceSchema.statics.getEmployeeLeaves = async function(employeeId, startDate = null, endDate = null) {
  try {
    const Leave = mongoose.model('Leave');
    return await Leave.getEmployeeLeaves(employeeId, startDate, endDate);
  } catch (error) {
    console.error('Error fetching employee leaves:', error);
    throw error;
  }
};

attendanceSchema.statics.removeLeave = async function(employeeId, startDate, endDate) {
  try {
    const start = moment(startDate).tz(PH_TIMEZONE).startOf('day');
    const end = moment(endDate).tz(PH_TIMEZONE).startOf('day');

    const Leave = mongoose.model('Leave');
    const leaveDeletion = await Leave.deleteMany({
      employeeId: employeeId,
      startDate: start.toDate(),
      endDate: end.toDate(),
      status: 'Approved'
    });

    const leaveRecords = await this.find({
      employeeId: employeeId,
      isLeaveRecord: true,
      date: {
        $gte: start.format('YYYY-MM-DD'),
        $lte: end.format('YYYY-MM-DD')
      }
    });

    let deletedCount = 0;
    const errors = [];

    for (const record of leaveRecords) {
      try {
        await this.deleteOne({ _id: record._id });
        deletedCount++;
      } catch (error) {
        errors.push({
          date: record.date,
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `Leave removed for ${deletedCount} days`,
      deletedCount: deletedCount,
      leaveRecordsDeleted: leaveDeletion.deletedCount,
      errors: errors
    };

  } catch (error) {
    console.error('Error removing leave:', error);
    throw error;
  }
};

attendanceSchema.statics.isEmployeeOnLeave = async function(employeeId, date) {
  try {
    const Leave = mongoose.model('Leave');
    return await Leave.isEmployeeOnLeave(employeeId, date);
  } catch (error) {
    console.error('Error checking leave status:', error);
    return false;
  }
};

attendanceSchema.statics.isEmployeeNoWork = async function(employeeId, date) {
  try {
    const dateStr = moment(date).tz(PH_TIMEZONE).format('YYYY-MM-DD');
    
    const noWorkRecord = await this.findOne({
      employeeId: employeeId,
      date: dateStr,
      isNoWorkDay: true
    });

    return !!noWorkRecord;
  } catch (error) {
    console.error('Error checking no work status:', error);
    return false;
  }
};

// ==================== MIDDLEWARE ====================

attendanceSchema.pre('save', async function(next) {
  this.lastModified = getCurrentPHDateTime();
  this.collectionName = 'EMS_Attendance';
  this.databaseName = 'BrightonSystem';
  
  if (!this.timezone) {
    this.timezone = PH_TIMEZONE;
  }
  if (!this.timezoneDisplay) {
    this.timezoneDisplay = PH_TIMEZONE_DISPLAY;
  }
  
  // Ensure timeIn and timeOut are stored in PST
  if (this.timeIn && !this.isModified('timeIn')) {
    this.timeIn = moment(this.timeIn).tz(PH_TIMEZONE).toDate();
  }
  
  if (this.timeOut && !this.isModified('timeOut')) {
    this.timeOut = moment(this.timeOut).tz(PH_TIMEZONE).toDate();
  }
  
  if (!this.isLeaveRecord && !this.isNoWorkDay) {
    await this.calculateHoursWorked();
  }
  
  next();
});

attendanceSchema.pre('validate', function(next) {
  if (!this.collectionName) {
    this.collectionName = 'EMS_Attendance';
  }
  if (!this.databaseName) {
    this.databaseName = 'BrightonSystem';
  }
  if (!this.timezone) {
    this.timezone = PH_TIMEZONE;
  }
  if (!this.timezoneDisplay) {
    this.timezoneDisplay = PH_TIMEZONE_DISPLAY;
  }
  next();
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
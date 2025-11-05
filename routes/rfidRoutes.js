const express = require('express');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const UID = require('../models/UID');
const moment = require('moment-timezone');

const router = express.Router();

// Enhanced Philippine Timezone Configuration
const PH_TIMEZONE = 'Asia/Manila';
const PH_TIMEZONE_DISPLAY = 'Philippine Standard Time (PST)';

// Working hours configuration - SIMPLIFIED
const WORKING_HOURS = {
  START_HOUR: 6,   // 6:00 AM
  END_HOUR: 19,    // 7:00 PM
  TIMEIN_CUTOFF_HOUR: 17 // 5:00 PM
};

// Get current Philippine time with enhanced formatting
const getCurrentPhilippineTime = () => {
  return moment().tz(PH_TIMEZONE);
};

// Enhanced date/time getters for Philippine timezone
const getCurrentDate = () => {
  return getCurrentPhilippineTime().format('YYYY-MM-DD');
};

const getCurrentDateTime = () => {
  return getCurrentPhilippineTime().toDate();
};

// Enhanced time formatting for display with Philippine context
const formatTimeForDisplay = (date) => {
  if (!date) return '';
  
  try {
    const phMoment = moment(date).tz(PH_TIMEZONE);
    const hours = phMoment.hours();
    const minutes = phMoment.minutes().toString().padStart(2, '0');
    const seconds = phMoment.seconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    return `${displayHours}:${minutes}:${seconds} ${ampm} (PST)`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid Time';
  }
};

// Enhanced date formatting for display
const formatDateForDisplay = (date) => {
  if (!date) return '';
  try {
    return moment(date).tz(PH_TIMEZONE).format('MMMM DD, YYYY (dddd)');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

// Get Philippine time information
const getPhilippineTimeInfo = () => {
  const now = getCurrentPhilippineTime();
  return {
    date: now.format('YYYY-MM-DD'),
    time: now.format('HH:mm:ss'),
    datetime: now.format('YYYY-MM-DD HH:mm:ss'),
    displayDate: now.format('MMMM DD, YYYY'),
    displayTime: now.format('h:mm:ss A'),
    dayOfWeek: now.format('dddd'),
    timezone: PH_TIMEZONE,
    timezoneDisplay: PH_TIMEZONE_DISPLAY,
    offset: now.format('Z'),
    isDST: now.isDST()
  };
};

// FIXED: SIMPLIFIED Working hours validation functions - PROPER TIMEZONE HANDLING
const isWithinWorkingHours = (date) => {
  try {
    let phMoment;
    
    // Handle different date formats safely
    if (date instanceof Date) {
      phMoment = moment(date).tz(PH_TIMEZONE);
    } else if (typeof date === 'string') {
      phMoment = moment.tz(date, PH_TIMEZONE);
    } else {
      phMoment = getCurrentPhilippineTime();
    }
    
    const hour = phMoment.hour();
    const minute = phMoment.minute();
    
    console.log(`Working hours check - Current PH Time: ${phMoment.format('HH:mm:ss')}, Hour: ${hour}, Minute: ${minute}`);
    
    // Direct time comparison: 6:00 AM to 7:00 PM (6 to 18 in 24-hour format)
    // Note: END_HOUR is 19 because we want to include up to 18:59 (6:59 PM)
    return hour >= WORKING_HOURS.START_HOUR && hour < WORKING_HOURS.END_HOUR;
  } catch (error) {
    console.error('Error in isWithinWorkingHours:', error);
    return false;
  }
};

const isTimeInAllowed = (date) => {
  try {
    let phMoment;
    
    if (date instanceof Date) {
      phMoment = moment(date).tz(PH_TIMEZONE);
    } else if (typeof date === 'string') {
      phMoment = moment.tz(date, PH_TIMEZONE);
    } else {
      phMoment = getCurrentPhilippineTime();
    }
    
    const hour = phMoment.hour();
    const minute = phMoment.minute();
    
    console.log(`Time In check - Current PH Time: ${phMoment.format('HH:mm:ss')}, Hour: ${hour}, Minute: ${minute}`);
    
    // Time In allowed: 6:00 AM to 5:00 PM (6 to 16 in 24-hour format)
    // Note: TIMEIN_CUTOFF_HOUR is 17 because we want to include up to 16:59 (4:59 PM)
    return hour >= WORKING_HOURS.START_HOUR && hour < WORKING_HOURS.TIMEIN_CUTOFF_HOUR;
  } catch (error) {
    console.error('Error in isTimeInAllowed:', error);
    return false;
  }
};

const isTimeOutAllowed = (date) => {
  try {
    let phMoment;
    
    if (date instanceof Date) {
      phMoment = moment(date).tz(PH_TIMEZONE);
    } else if (typeof date === 'string') {
      phMoment = moment.tz(date, PH_TIMEZONE);
    } else {
      phMoment = getCurrentPhilippineTime();
    }
    
    const hour = phMoment.hour();
    const minute = phMoment.minute();
    
    console.log(`Time Out check - Current PH Time: ${phMoment.format('HH:mm:ss')}, Hour: ${hour}, Minute: ${minute}`);
    
    // Time Out allowed: 6:00 AM to 7:00 PM (6 to 18 in 24-hour format)
    return hour >= WORKING_HOURS.START_HOUR && hour < WORKING_HOURS.END_HOUR;
  } catch (error) {
    console.error('Error in isTimeOutAllowed:', error);
    return false;
  }
};

// Enhanced UID normalization function
const normalizeUid = (uid) => {
  if (!uid) return '';
  // Remove all spaces and convert to uppercase
  return uid.toString().replace(/\s/g, '').toUpperCase();
};

// Enhanced UID formatting for display
const formatUidForDisplay = (uid) => {
  if (!uid) return '';
  const cleanUid = normalizeUid(uid);
  // Format as pairs with spaces: A1 B2 C3 D4
  if (cleanUid.length === 8) {
    return cleanUid.match(/.{1,2}/g)?.join(' ').toUpperCase() || cleanUid;
  }
  return cleanUid;
};

// Enhanced UID validation
const validateUID = (uid) => {
  const normalizedUid = normalizeUid(uid);
  
  if (normalizedUid.length !== 8) {
    return {
      valid: false,
      message: `UID must be exactly 8 characters long. Current: ${normalizedUid.length} characters`
    };
  }
  
  // Accept both hexadecimal (0-9, A-F) and alphanumeric (any combination)
  if (!/^[0-9A-F]{8}$/i.test(normalizedUid) && !/^[A-Z0-9]{8}$/i.test(normalizedUid)) {
    return {
      valid: false,
      message: 'UID must contain only alphanumeric characters (0-9, A-Z)'
    };
  }
  
  return { valid: true, message: 'Valid UID format' };
};

// COMPLETELY REVISED employee finding with comprehensive UID matching
const findEmployeeByRFID = async (uid) => {
  const normalizedUid = normalizeUid(uid);
  const formattedUid = formatUidForDisplay(uid);
  
  console.log('=== COMPREHENSIVE RFID SEARCH ===');
  console.log('Searching for UID:', {
    input: uid,
    normalized: normalizedUid,
    formatted: formattedUid,
    phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
  });

  // Strategy 1: Direct match in EMS_UID collection
  let uidRecord = await UID.findOne({
    isActive: true,
    $or: [
      { uid: { $regex: new RegExp(`^${normalizedUid}$`, 'i') } },
      { uid: normalizedUid },
      { uid: formattedUid }
    ]
  });

  if (uidRecord) {
    console.log('Found in EMS_UID:', uidRecord.employeeId);
    const employee = await Employee.findOne({ 
      employeeId: uidRecord.employeeId,
      status: 'Active'
    });
    if (employee) {
      console.log('Employee found via EMS_UID:', employee.employeeId);
      return { employee, source: 'EMS_UID', uidRecord };
    }
  }

  // Strategy 2: Search in Employee collection with comprehensive matching
  const employees = await Employee.find({
    status: 'Active',
    isRfidAssigned: true
  });

  console.log(`Searching through ${employees.length} employees with RFID assigned`);

  for (const employee of employees) {
    if (!employee.rfidUid) continue;

    const employeeUidNormalized = normalizeUid(employee.rfidUid);
    const employeeUidFormatted = formatUidForDisplay(employee.rfidUid);
    
    console.log(`Comparing with employee ${employee.employeeId}:`, {
      stored: employee.rfidUid,
      normalized: employeeUidNormalized,
      formatted: employeeUidFormatted
    });

    // Multiple matching strategies
    if (employeeUidNormalized === normalizedUid || 
        employeeUidFormatted === formattedUid ||
        employee.rfidUid === formattedUid ||
        employee.rfidUid === normalizedUid) {
      
      console.log('MATCH FOUND in Employee collection:', employee.employeeId);
      
      // Ensure record exists in EMS_UID
      let existingUidRecord = await UID.findOne({
        employeeId: employee.employeeId,
        isActive: true
      });

      if (!existingUidRecord) {
        console.log('Creating missing record in EMS_UID');
        existingUidRecord = new UID({
          uid: formattedUid,
          employeeId: employee.employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          position: employee.position,
          isActive: true,
          assignedAt: getCurrentDateTime()
        });
        await existingUidRecord.save();
      }

      return { employee, source: 'Employee', uidRecord: existingUidRecord };
    }
  }

  console.log('NO MATCH FOUND for UID:', normalizedUid);
  return null;
};

// FIXED: Enhanced RFID scan endpoint with PROPER Philippine timezone handling
router.post('/scan/', async (req, res) => {
  try {
    const { uid, device = 'Brighton-EMS-RFID-Reader', timestamp, ph_time } = req.body;
    const io = req.app.get('io');
    
    console.log('=== ENHANCED RFID SCAN PROCESSING ===');
    console.log('Received UID:', uid);
    
    // Get current Philippine time IMMEDIATELY to ensure accuracy
    const currentPHTime = getCurrentPhilippineTime();
    const currentTimeString = formatTimeForDisplay(currentPHTime.toDate());
    const currentDateString = formatDateForDisplay(currentPHTime.toDate());
    
    console.log('Philippine Time Info:', {
      date: currentPHTime.format('YYYY-MM-DD'),
      time: currentPHTime.format('HH:mm:ss'),
      display: currentPHTime.format('h:mm:ss A'),
      timezone: PH_TIMEZONE_DISPLAY
    });

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'No UID provided',
        displayMessage: 'NO_CARD_DETECTED',
        phTime: currentPHTime.format('YYYY-MM-DD HH:mm:ss'),
        timezone: PH_TIMEZONE_DISPLAY
      });
    }

    // Validate UID format first
    const validation = validateUID(uid);
    if (!validation.valid) {
      console.log('Invalid UID format:', validation.message);
      return res.status(400).json({
        success: false,
        message: validation.message,
        displayMessage: 'INVALID_CARD_FORMAT',
        phTime: currentPHTime.format('YYYY-MM-DD HH:mm:ss'),
        timezone: PH_TIMEZONE_DISPLAY
      });
    }

    const normalizedUid = normalizeUid(uid);
    const formattedUid = formatUidForDisplay(uid);
    
    console.log('UID Processing:', {
      original: uid,
      normalized: normalizedUid,
      formatted: formattedUid,
      phTime: currentPHTime.format('YYYY-MM-DD HH:mm:ss')
    });

    const employeeData = await findEmployeeByRFID(normalizedUid);
    
    if (!employeeData) {
      console.log('Card not assigned to any active employee');
      
      // Debug: Show all assigned UIDs
      const assignedUIDs = await UID.find({ isActive: true });
      const assignedEmployees = await Employee.find({ 
        isRfidAssigned: true, 
        status: 'Active' 
      });
      
      console.log('Assigned in EMS_UID:', assignedUIDs.map(u => ({uid: u.uid, employee: u.employeeId})));
      console.log('Assigned in Employee:', assignedEmployees.map(e => ({uid: e.rfidUid, employee: e.employeeId})));
      
      return res.status(404).json({
        success: false,
        message: 'RFID card not assigned to any active employee',
        displayMessage: 'CARD_NOT_ASSIGNED',
        scannedUid: formattedUid,
        phTime: currentPHTime.format('YYYY-MM-DD HH:mm:ss'),
        timezone: PH_TIMEZONE_DISPLAY,
        debug: {
          normalizedUid,
          formattedUid,
          assignedInUID: assignedUIDs.length,
          assignedInEmployee: assignedEmployees.length
        }
      });
    }

    const { employee, source, uidRecord } = employeeData;
    console.log(`Employee found via ${source}:`, employee.employeeId);

    // FIXED: Use current Philippine time consistently
    const now = currentPHTime.toDate();
    const today = currentPHTime.format('YYYY-MM-DD');
    
    console.log('Processing attendance for:', {
      employee: employee.employeeId,
      name: `${employee.firstName} ${employee.lastName}`,
      date: today,
      displayDate: currentDateString,
      time: currentTimeString,
      phTimezone: PH_TIMEZONE_DISPLAY
    });

    // FIXED: Check working hours (EVERYDAY 6:00 AM - 7:00 PM) with proper timezone
    const currentHour = currentPHTime.hour();
    const currentMinute = currentPHTime.minute();
    
    console.log(`Current PH Time: ${currentPHTime.format('HH:mm:ss')}, Hour: ${currentHour}, Minute: ${currentMinute}`);
    
    if (!isWithinWorkingHours(now)) {
      console.log('Outside working hours');
      return res.status(400).json({
        success: false,
        message: 'Scanning only allowed between 6:00 AM - 7:00 PM (Philippine Standard Time) EVERYDAY',
        displayMessage: 'OUTSIDE_WORKING_HOURS',
        currentTime: currentTimeString,
        currentDate: currentDateString,
        timezone: PH_TIMEZONE_DISPLAY,
        workingHours: '6:00 AM - 7:00 PM (EVERYDAY)',
        debug: {
          currentHour: currentHour,
          currentMinute: currentMinute,
          startHour: WORKING_HOURS.START_HOUR,
          endHour: WORKING_HOURS.END_HOUR
        }
      });
    }

    let attendance = await Attendance.findOne({
      employeeId: employee.employeeId,
      date: today
    });

    console.log('Existing attendance record:', attendance ? 'Found' : 'Not found');

    let responseData;
    let actionType = '';

    if (!attendance) {
      // No attendance record exists - process as Time In
      if (!isTimeInAllowed(now)) {
        console.log('Time in not allowed');
        return res.status(400).json({
          success: false,
          message: 'Time in only allowed between 6:00 AM - 5:00 PM (Philippine Standard Time)',
          displayMessage: 'TIMEIN_NOT_ALLOWED',
          currentTime: currentTimeString,
          currentDate: currentDateString,
          timezone: PH_TIMEZONE_DISPLAY,
          timeInHours: '6:00 AM - 5:00 PM'
        });
      }

      // Create new attendance record
      attendance = new Attendance({
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        position: employee.position,
        date: today,
        timeIn: now,
        status: 'Present',
        dateEmployed: employee.dateEmployed,
        recordType: 'auto',
        recordedBy: 'RFID System',
        timeInSource: 'rfid',
        timezone: PH_TIMEZONE,
        timezoneDisplay: PH_TIMEZONE_DISPLAY,
        collectionName: 'EMS_Attendance',
        databaseName: 'BrightonSystem'
      });

      try {
        await attendance.calculateHoursWorked();
        const result = await attendance.save();
        actionType = 'timein';
        
        console.log('RFID Time In recorded successfully in EMS_Attendance');
        console.log('Time In (PH):', formatTimeForDisplay(result.timeIn));
        console.log('Status:', result.status);
        console.log('Late Minutes:', result.lateMinutes);
        console.log('Timezone:', PH_TIMEZONE_DISPLAY);

        responseData = {
          success: true,
          message: 'Time in recorded successfully',
          displayMessage: result.status === 'Late' ? 'SUCCESS:LATE_CHECKIN' : 'SUCCESS:CHECKIN',
          type: 'timein',
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          department: employee.department,
          time: currentTimeString,
          date: currentDateString,
          timestamp: now,
          status: result.status,
          lateMinutes: result.lateMinutes,
          currentTime: currentTimeString,
          currentDate: currentDateString,
          timezone: PH_TIMEZONE_DISPLAY,
          collection: 'EMS_Attendance',
          database: 'BrightonSystem'
        };

      } catch (saveError) {
        console.error('Error saving time in:', saveError);
        return res.status(500).json({
          success: false,
          message: 'Error recording time in',
          displayMessage: 'ERROR:PROCESSING',
          currentTime: currentTimeString,
          timezone: PH_TIMEZONE_DISPLAY
        });
      }

    } else if (attendance.timeIn && !attendance.timeOut) {
      // Time In exists but no Time Out - process as Time Out
      if (!isTimeOutAllowed(now)) {
        console.log('Time out not allowed');
        return res.status(400).json({
          success: false,
          message: 'Time out only allowed between 6:00 AM - 7:00 PM (Philippine Standard Time)',
          displayMessage: 'TIMEOUT_NOT_ALLOWED',
          currentTime: currentTimeString,
          currentDate: currentDateString,
          timezone: PH_TIMEZONE_DISPLAY,
          timeOutHours: '6:00 AM - 7:00 PM'
        });
      }

      // FIXED: Validate 10-minute rule with proper timezone handling
      try {
        const timeIn = moment(attendance.timeIn).tz(PH_TIMEZONE);
        const timeOut = currentPHTime;
        const timeDifference = timeOut.diff(timeIn, 'minutes');
        
        console.log(`Time validation - Time In: ${timeIn.format('h:mm:ss A')}, Time Out: ${timeOut.format('h:mm:ss A')}, Difference: ${timeDifference} minutes`);
        
        if (timeDifference < 10) {
          const remainingMinutes = Math.ceil(10 - timeDifference);
          console.log(`Time out rejected: Need to wait ${remainingMinutes} more minutes`);
          return res.status(400).json({
            success: false,
            message: `Please wait at least 10 minutes between time in and time out. Wait ${remainingMinutes} more minutes.`,
            displayMessage: 'WAIT_10_MINUTES',
            currentTime: currentTimeString,
            timezone: PH_TIMEZONE_DISPLAY,
            remainingMinutes: remainingMinutes
          });
        }
      } catch (timeDiffError) {
        console.error('Error calculating time difference:', timeDiffError);
        // Continue with time out if we can't calculate the difference
      }

      // Process Time Out
      attendance.timeOut = now;
      attendance.timeOutSource = 'rfid';
      attendance.lastModified = getCurrentDateTime();
      attendance.timezone = PH_TIMEZONE;
      attendance.timezoneDisplay = PH_TIMEZONE_DISPLAY;

      try {
        await attendance.calculateHoursWorked();
        const result = await attendance.save();
        actionType = 'timeout';
        
        console.log('RFID Time Out recorded successfully in EMS_Attendance');
        console.log('Time Out (PH):', formatTimeForDisplay(result.timeOut));
        console.log('Hours Worked:', result.hoursWorked);
        console.log('Overtime Minutes:', result.overtimeMinutes);
        console.log('Timezone:', PH_TIMEZONE_DISPLAY);

        responseData = {
          success: true,
          message: 'Time out recorded successfully',
          displayMessage: 'SUCCESS:CHECKOUT',
          type: 'timeout',
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          department: employee.department,
          time: currentTimeString,
          date: currentDateString,
          hoursWorked: result.hoursWorked,
          timestamp: now,
          overtimeMinutes: result.overtimeMinutes || 0,
          currentTime: currentTimeString,
          currentDate: currentDateString,
          timezone: PH_TIMEZONE_DISPLAY,
          collection: 'EMS_Attendance',
          database: 'BrightonSystem'
        };

      } catch (saveError) {
        console.error('Error saving time out:', saveError);
        return res.status(500).json({
          success: false,
          message: 'Error recording time out',
          displayMessage: 'ERROR:PROCESSING',
          currentTime: currentTimeString,
          timezone: PH_TIMEZONE_DISPLAY
        });
      }

    } else if (attendance.timeOut) {
      // Both Time In and Time Out already recorded
      console.log('Attendance already completed for today');
      responseData = {
        success: true,
        message: 'Attendance already completed for today',
        displayMessage: 'INFO:ALREADY_DONE',
        type: 'already_done',
        name: `${employee.firstName} ${employee.lastName}`,
        employeeId: employee.employeeId,
        lastAction: 'Time Out',
        currentTime: currentTimeString,
        currentDate: currentDateString,
        timezone: PH_TIMEZONE_DISPLAY
      };
    } else {
      console.log('Unexpected attendance state');
      responseData = {
        success: false,
        message: 'Unexpected attendance state',
        displayMessage: 'ERROR:UNEXPECTED_STATE',
        currentTime: currentTimeString,
        timezone: PH_TIMEZONE_DISPLAY
      };
    }

    // Emit Socket.IO event for real-time updates
    if (io && actionType) {
      try {
        io.emit('attendance-update', {
          employeeId: employee.employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          type: actionType,
          time: now,
          status: attendance.status,
          hoursWorked: attendance.hoursWorked || '0h 0m',
          timestamp: now,
          currentTime: currentTimeString,
          currentDate: currentDateString,
          timezone: PH_TIMEZONE_DISPLAY,
          source: 'rfid',
          collection: 'EMS_Attendance',
          database: 'BrightonSystem'
        });
        console.log('Socket event emitted for attendance update');
      } catch (socketError) {
        console.error('Error emitting socket event:', socketError);
      }
    }

    console.log('=== RFID SCAN COMPLETED SUCCESSFULLY ===');
    res.status(200).json(responseData);

  } catch (error) {
    console.error('=== RFID SCAN ERROR ===');
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing RFID scan',
      displayMessage: 'ERROR:PROCESSING',
      error: error.message,
      phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
      timezone: PH_TIMEZONE_DISPLAY
    });
  }
});

// COMPLETELY REVISED RFID assignment endpoint with Philippine timezone
router.post('/assign/', async (req, res) => {
  try {
    const { employeeId, rfidUid } = req.body;
    const io = req.app.get('io');

    if (!employeeId || !rfidUid) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and RFID UID are required',
        phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
      });
    }

    // Validate UID format
    const validation = validateUID(rfidUid);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
      });
    }

    const normalizedUid = normalizeUid(rfidUid);
    const formattedUid = formatUidForDisplay(rfidUid);

    console.log('=== ENHANCED RFID ASSIGNMENT START ===');
    console.log('Assignment details:', {
      employeeId,
      inputUid: rfidUid,
      normalizedUid,
      formattedUid,
      phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
    });

    // Find employee
    const employee = await Employee.findOne({ 
      employeeId: employeeId,
      status: 'Active'
    });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found or not active',
        phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
      });
    }

    // Check if UID is already assigned to ANY employee in EMS_UID
    const existingUIDAssignment = await UID.findOne({
      isActive: true,
      $or: [
        { uid: { $regex: new RegExp(`^${normalizedUid}$`, 'i') } },
        { uid: normalizedUid },
        { uid: formattedUid }
      ],
      employeeId: { $ne: employeeId } // Exclude current employee
    });

    if (existingUIDAssignment) {
      console.log('RFID already assigned in EMS_UID to:', existingUIDAssignment.employeeId);
      const assignedEmployee = await Employee.findOne({ employeeId: existingUIDAssignment.employeeId });
      return res.status(400).json({
        success: false,
        message: `RFID already assigned to ${assignedEmployee?.firstName} ${assignedEmployee?.lastName}`,
        assignedTo: `${assignedEmployee?.firstName} ${assignedEmployee?.lastName}`,
        existingEmployeeId: existingUIDAssignment.employeeId,
        phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
      });
    }

    // Check if UID is already assigned to ANY employee in Employee collection
    const existingEmployeeAssignment = await Employee.findOne({
      status: 'Active',
      isRfidAssigned: true,
      $or: [
        { rfidUid: { $regex: new RegExp(`^${normalizedUid}$`, 'i') } },
        { rfidUid: normalizedUid },
        { rfidUid: formattedUid }
      ],
      employeeId: { $ne: employeeId } // Exclude current employee
    });

    if (existingEmployeeAssignment) {
      console.log('RFID already assigned in Employee collection to:', existingEmployeeAssignment.employeeId);
      return res.status(400).json({
        success: false,
        message: `RFID already assigned to ${existingEmployeeAssignment.firstName} ${existingEmployeeAssignment.lastName}`,
        assignedTo: `${existingEmployeeAssignment.firstName} ${existingEmployeeAssignment.lastName}`,
        existingEmployeeId: existingEmployeeAssignment.employeeId,
        phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
      });
    }

    // Update Employee collection
    const updatedEmployee = await Employee.findOneAndUpdate(
      { employeeId: employeeId },
      { 
        rfidUid: formattedUid,
        isRfidAssigned: true,
        lastModifiedBy: 'RFID System',
        lastModified: getCurrentDateTime()
      },
      { new: true, runValidators: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found during update',
        phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
      });
    }

    console.log('Employee collection updated:', {
      employeeId: updatedEmployee.employeeId,
      rfidUid: updatedEmployee.rfidUid,
      isRfidAssigned: updatedEmployee.isRfidAssigned,
      collection: 'EMS_Employee',
      phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
    });

    // Update or create UID record in EMS_UID
    const uidRecord = await UID.findOneAndUpdate(
      { employeeId: employeeId },
      {
        uid: formattedUid,
        employeeId: updatedEmployee.employeeId,
        employeeName: `${updatedEmployee.firstName} ${updatedEmployee.lastName}`,
        department: updatedEmployee.department,
        position: updatedEmployee.position,
        assignedAt: getCurrentDateTime(),
        isActive: true,
        lastModified: getCurrentDateTime(),
        timezone: PH_TIMEZONE,
        timezoneDisplay: PH_TIMEZONE_DISPLAY
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true 
      }
    );

    console.log('UID record saved to EMS_UID collection:', {
      uid: uidRecord.uid,
      employeeId: uidRecord.employeeId,
      employeeName: uidRecord.employeeName,
      collection: 'EMS_UID',
      database: 'BrightonSystem',
      phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
    });

    // Verify the assignment by searching for it
    console.log('Verifying assignment...');
    const verificationResult = await findEmployeeByRFID(normalizedUid);
    if (verificationResult && verificationResult.employee.employeeId === employeeId) {
      console.log('Assignment verified successfully');
    } else {
      console.log('WARNING: Assignment verification failed');
    }

    // Emit socket event
    if (io) {
      io.emit('rfid-assigned', {
        employeeId: updatedEmployee.employeeId,
        employeeName: `${updatedEmployee.firstName} ${updatedEmployee.lastName}`,
        rfidUid: formattedUid,
        normalizedUid: normalizedUid,
        assignedAt: getCurrentDateTime(),
        timezone: PH_TIMEZONE_DISPLAY,
        collections: ['EMS_UID', 'EMS_Employee'],
        phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
      });
    }

    console.log('RFID assigned successfully to both collections');

    res.status(200).json({
      success: true,
      message: 'RFID assigned successfully to both collections',
      data: {
        employeeId: updatedEmployee.employeeId,
        name: `${updatedEmployee.firstName} ${updatedEmployee.lastName}`,
        rfidUid: updatedEmployee.rfidUid,
        normalizedUid: normalizedUid,
        formattedUid: formattedUid,
        department: updatedEmployee.department,
        uidRecord: {
          uid: uidRecord.uid,
          assignedAt: uidRecord.assignedAt,
          isActive: uidRecord.isActive,
          collection: 'EMS_UID'
        },
        employeeRecord: {
          rfidUid: updatedEmployee.rfidUid,
          isRfidAssigned: updatedEmployee.isRfidAssigned,
          collection: 'EMS_Employee'
        },
        collections: ['EMS_UID', 'EMS_Employee'],
        database: 'BrightonSystem',
        verified: verificationResult !== null,
        timezone: PH_TIMEZONE_DISPLAY,
        phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
      }
    });

  } catch (error) {
    console.error('=== RFID ASSIGNMENT ERROR ===');
    console.error('RFID assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning RFID',
      error: error.message,
      phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
      timezone: PH_TIMEZONE_DISPLAY
    });
  }
});

// COMPLETELY REVISED RFID removal endpoint with Philippine timezone
router.delete('/remove/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const io = req.app.get('io');

    console.log('=== ENHANCED RFID REMOVAL START ===');
    console.log('Removing RFID for employee:', employeeId);
    console.log('Philippine Time:', getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'));

    // Find employee
    const employee = await Employee.findOne({ employeeId: employeeId });
    
    if (!employee) {
      console.log('Employee not found:', employeeId);
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
        phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
      });
    }

    console.log('Found employee:', {
      employeeId: employee.employeeId,
      name: `${employee.firstName} ${employee.lastName}`,
      currentRfid: employee.rfidUid,
      isRfidAssigned: employee.isRfidAssigned
    });

    // Find UID record
    const uidRecord = await UID.findOne({ 
      employeeId: employeeId, 
      isActive: true 
    });
    
    const hasRfidInUID = uidRecord && uidRecord.isActive;
    const hasRfidInEmployee = employee.rfidUid && employee.isRfidAssigned;

    if (!hasRfidInUID && !hasRfidInEmployee) {
      console.log('Employee has no RFID assigned in either collection:', employeeId);
      return res.status(400).json({
        success: false,
        message: 'Employee does not have an RFID assigned in any collection',
        phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
      });
    }

    const removedRfid = employee.rfidUid || (uidRecord ? uidRecord.uid : 'Unknown');

    // Update Employee collection - use direct update to ensure consistency
    const employeeUpdateResult = await Employee.updateOne(
      { employeeId: employeeId },
      { 
        $set: {
          rfidUid: null,
          isRfidAssigned: false,
          lastModifiedBy: 'RFID System',
          lastModified: getCurrentDateTime()
        }
      }
    );

    if (employeeUpdateResult.modifiedCount === 0) {
      console.log('No changes made to employee record');
    } else {
      console.log('Employee collection updated:', {
        employeeId: employeeId,
        modifications: employeeUpdateResult.modifiedCount
      });
    }

    // Update EMS_UID collection
    let uidUpdateResult = null;
    if (uidRecord) {
      uidUpdateResult = await UID.updateOne(
        { employeeId: employeeId, isActive: true },
        {
          $set: {
            isActive: false,
            deactivatedAt: getCurrentDateTime(),
            lastModified: getCurrentDateTime(),
            timezone: PH_TIMEZONE,
            timezoneDisplay: PH_TIMEZONE_DISPLAY
          }
        }
      );
      
      if (uidUpdateResult.modifiedCount === 0) {
        console.log('No changes made to UID record');
      } else {
        console.log('EMS_UID collection updated:', {
          employeeId: employeeId,
          modifications: uidUpdateResult.modifiedCount
        });
      }
    }

    // Verify removal by searching for the UID
    console.log('Verifying removal...');
    const verificationResult = await findEmployeeByRFID(removedRfid);
    if (verificationResult) {
      console.log('WARNING: UID still found after removal:', verificationResult.employee.employeeId);
    } else {
      console.log('Removal verified successfully - UID no longer assigned');
    }

    console.log('RFID removal completed successfully from both collections');

    // Emit socket event
    if (io) {
      io.emit('rfid-removed', {
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        removedRfid: removedRfid,
        removedAt: getCurrentDateTime(),
        timezone: PH_TIMEZONE_DISPLAY,
        collections: ['EMS_UID', 'EMS_Employee'],
        database: 'BrightonSystem',
        employeeUpdate: employeeUpdateResult.modifiedCount > 0,
        uidUpdate: uidUpdateResult ? uidUpdateResult.modifiedCount > 0 : false,
        phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
      });
      console.log('Socket event emitted for RFID removal');
    }

    res.status(200).json({
      success: true,
      message: 'RFID assignment removed successfully from both collections',
      data: {
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        removedRfid: removedRfid,
        removedAt: getCurrentDateTime(),
        timezone: PH_TIMEZONE_DISPLAY,
        updates: {
          EMS_Employee: employeeUpdateResult.modifiedCount > 0,
          EMS_UID: uidUpdateResult ? uidUpdateResult.modifiedCount > 0 : false
        },
        verified: verificationResult === null,
        phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
      }
    });

  } catch (error) {
    console.error('=== RFID REMOVAL ERROR ===');
    console.error('RFID removal error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error removing RFID assignment',
      error: error.message,
      phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
      timezone: PH_TIMEZONE_DISPLAY
    });
  }
});

// Get assigned RFID cards with Philippine timezone
router.get('/assigned/', async (req, res) => {
  try {
    const assignedCards = await UID.find({ isActive: true }).sort({ assignedAt: -1 });
    
    console.log('Retrieved assigned cards from EMS_UID:', {
      count: assignedCards.length,
      collection: 'EMS_UID',
      database: 'BrightonSystem',
      phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
    });
    
    res.status(200).json({
      success: true,
      data: assignedCards,
      count: assignedCards.length,
      collection: 'EMS_UID',
      database: 'BrightonSystem',
      timezone: PH_TIMEZONE_DISPLAY,
      phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
    });
  } catch (error) {
    console.error('Error fetching assigned cards from EMS_UID:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assigned RFID cards from EMS_UID collection',
      phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
    });
  }
});

// Get employee by RFID UID with Philippine timezone
router.get('/employee/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'RFID UID is required',
        phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
      });
    }

    const normalizedUid = normalizeUid(uid);
    
    const employeeData = await findEmployeeByRFID(normalizedUid);

    if (!employeeData) {
      return res.status(404).json({
        success: false,
        message: 'No employee found with this RFID UID',
        data: null,
        phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
      });
    }

    const { employee, source, uidRecord } = employeeData;

    res.status(200).json({
      success: true,
      data: {
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        position: employee.position,
        rfidUid: employee.rfidUid,
        normalizedUid: normalizedUid,
        formattedUid: formatUidForDisplay(uid),
        source: source,
        collections: ['EMS_UID', 'EMS_Employee'],
        database: 'BrightonSystem',
        timezone: PH_TIMEZONE_DISPLAY
      },
      phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
    });

  } catch (error) {
    console.error('Error fetching employee by RFID:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee information',
      error: error.message,
      phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
    });
  }
});

// Sync all RFID assignments between collections with Philippine timezone
router.post('/sync-assignments', async (req, res) => {
  try {
    console.log('=== SYNCING RFID ASSIGNMENTS ===');
    console.log('Philippine Time:', getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'));
    
    // Get all employees with RFID assigned
    const employeesWithRFID = await Employee.find({
      status: 'Active',
      isRfidAssigned: true,
      rfidUid: { $ne: null }
    });

    console.log(`Found ${employeesWithRFID.length} employees with RFID assigned`);

    let createdCount = 0;
    let updatedCount = 0;
    let errors = [];

    for (const employee of employeesWithRFID) {
      try {
        const formattedUid = formatUidForDisplay(employee.rfidUid);
        
        // Check if record exists in EMS_UID
        const existingRecord = await UID.findOne({
          employeeId: employee.employeeId,
          isActive: true
        });

        if (existingRecord) {
          // Update existing record
          if (existingRecord.uid !== formattedUid) {
            await UID.updateOne(
              { _id: existingRecord._id },
              {
                uid: formattedUid,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                department: employee.department,
                position: employee.position,
                lastModified: getCurrentDateTime(),
                timezone: PH_TIMEZONE,
                timezoneDisplay: PH_TIMEZONE_DISPLAY
              }
            );
            updatedCount++;
            console.log(`Updated UID record for ${employee.employeeId}`);
          }
        } else {
          // Create new record
          const newUidRecord = new UID({
            uid: formattedUid,
            employeeId: employee.employeeId,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            department: employee.department,
            position: employee.position,
            isActive: true,
            assignedAt: getCurrentDateTime(),
            timezone: PH_TIMEZONE,
            timezoneDisplay: PH_TIMEZONE_DISPLAY
          });
          await newUidRecord.save();
          createdCount++;
          console.log(`Created UID record for ${employee.employeeId}`);
        }
      } catch (error) {
        errors.push({
          employeeId: employee.employeeId,
          error: error.message
        });
        console.error(`Error syncing employee ${employee.employeeId}:`, error);
      }
    }

    // Deactivate UID records for employees without RFID
    const activeUIDs = await UID.find({ isActive: true });
    let deactivatedCount = 0;

    for (const uidRecord of activeUIDs) {
      const employee = await Employee.findOne({
        employeeId: uidRecord.employeeId,
        status: 'Active',
        isRfidAssigned: true
      });

      if (!employee) {
        await UID.updateOne(
          { _id: uidRecord._id },
          {
            isActive: false,
            deactivatedAt: getCurrentDateTime(),
            lastModified: getCurrentDateTime(),
            timezone: PH_TIMEZONE,
            timezoneDisplay: PH_TIMEZONE_DISPLAY
          }
        );
        deactivatedCount++;
        console.log(`Deactivated UID record for ${uidRecord.employeeId}`);
      }
    }

    res.status(200).json({
      success: true,
      message: 'RFID assignments synchronized successfully',
      data: {
        employeesProcessed: employeesWithRFID.length,
        recordsCreated: createdCount,
        recordsUpdated: updatedCount,
        recordsDeactivated: deactivatedCount,
        errors: errors.length,
        errorDetails: errors,
        timezone: PH_TIMEZONE_DISPLAY,
        phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
      }
    });

  } catch (error) {
    console.error('Error syncing RFID assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error synchronizing RFID assignments',
      error: error.message,
      phTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
    });
  }
});

// Enhanced health check endpoint with Philippine timezone info
router.get('/health', (req, res) => {
  const phTimeInfo = getPhilippineTimeInfo();
  
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    philippineTime: phTimeInfo,
    uptime: process.uptime(),
    database: 'BrightonSystem',
    timezone: {
      code: PH_TIMEZONE,
      name: PH_TIMEZONE_DISPLAY,
      offset: phTimeInfo.offset,
      isDST: phTimeInfo.isDST
    },
    collections: {
      EMS_UID: 'Connected',
      EMS_Employee: 'Connected', 
      EMS_Attendance: 'Connected'
    },
    features: {
      rfidScan: true,
      timeValidation: true,
      workingHoursEnforcement: true,
      dualCollectionSupport: true,
      uidValidation: true,
      enhancedFormatting: true,
      assignmentSync: true,
      philippineTimezone: true,
      workingHours: '6:00 AM - 7:00 PM (EVERYDAY)',
      timeInHours: '6:00 AM - 5:00 PM',
      timeOutHours: '6:00 AM - 7:00 PM',
      minimumTimeDifference: '10 minutes'
    }
  };
  
  res.status(200).json({
    success: true,
    data: health
  });
});

// New endpoint to get current Philippine time
router.get('/ph-time', (req, res) => {
  const phTimeInfo = getPhilippineTimeInfo();
  
  res.status(200).json({
    success: true,
    data: phTimeInfo
  });
});

// Test endpoint
router.get('/scan', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  console.log(`RFID Scan GET endpoint hit from IP: ${clientIP}`);
  
  res.status(200).json({
    success: true,
    message: 'RFID endpoint is ready',
    timestamp: new Date().toISOString(),
    ph_time: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
    timezone: PH_TIMEZONE_DISPLAY,
    working_hours: {
      rfid_scanning: '6:00 AM - 7:00 PM EVERYDAY',
      time_in: '6:00 AM - 5:00 PM',
      time_out: '6:00 AM - 7:00 PM'
    }
  });
});

module.exports = router;
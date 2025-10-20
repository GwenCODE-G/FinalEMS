const express = require('express');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const UID = require('../models/UID');

const router = express.Router();

const normalizeUid = (uid) => {
  if (!uid) return '';
  return uid.toString().replace(/\s/g, '').toUpperCase();
};

const formatUidForDisplay = (uid) => {
  if (!uid) return '';
  const cleanUid = normalizeUid(uid);
  return cleanUid.match(/.{1,2}/g)?.join(' ').toUpperCase() || cleanUid;
};

// Get current date in PH timezone
const getCurrentDate = () => {
  const now = new Date();
  const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return phTime.toISOString().split('T')[0];
};

// Get current datetime in PH timezone
const getCurrentDateTime = () => {
  const now = new Date();
  return new Date(now.getTime() + (8 * 60 * 60 * 1000));
};

// Format time for display from Date object
const formatTimeForDisplay = (date) => {
  if (!date) return '';
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes}:${seconds} ${ampm}`;
};

// Parse Philippine time string from Arduino
const parsePhilippineTime = (phTimeString) => {
  if (!phTimeString) {
    return getCurrentDateTime();
  }
  
  try {
    // Parse "2025-10-09 11:17:43 AM" format
    const [datePart, timePart, period] = phTimeString.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    
    // Convert to 24-hour format
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 = hours + 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }
    
    const phTime = new Date(year, month - 1, day, hour24, minutes, seconds);
    
    console.log('Parsed PH Time:', {
      input: phTimeString,
      parsed: phTime.toString(),
      year, month, day, hour24, minutes, seconds
    });
    
    return phTime;
  } catch (error) {
    console.error('Error parsing Philippine time:', error);
    return getCurrentDateTime();
  }
};

// STRICT TIME CHECKING FUNCTIONS
const checkTimeInHours = (currentTime) => {
  console.log('=== TIME IN CHECK ===');
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  console.log('Current PH time:', `${hours}:${minutes.toString().padStart(2, '0')}`);
  console.log('Time In allowed: 06:00 to 17:00 (360 to 1020 minutes)');
  console.log('Current total minutes:', totalMinutes);
  
  // STRICT CHECK: Time In only allowed between 6:00 AM - 5:00 PM (360 to 1020 minutes)
  if (totalMinutes >= 360 && totalMinutes < 1020) {
    console.log('Time In ALLOWED - Within valid time range');
    return { allowed: true, message: 'TIMEIN_ALLOWED' };
  } else {
    console.log('Time In NOT ALLOWED - Outside valid time range');
    return { allowed: false, message: 'TIMEIN_NOT_ALLOWED' };
  }
};

const checkTimeOutHours = (currentTime) => {
  console.log('=== TIME OUT CHECK ===');
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  console.log('Current PH time:', `${hours}:${minutes.toString().padStart(2, '0')}`);
  console.log('Time Out allowed: 06:00 to 19:00 (360 to 1140 minutes)');
  console.log('Current total minutes:', totalMinutes);
  
  // STRICT CHECK: Time Out only allowed between 6:00 AM - 7:00 PM (360 to 1140 minutes)
  if (totalMinutes >= 360 && totalMinutes < 1140) {
    console.log('Time Out ALLOWED - Within valid time range');
    return { allowed: true, message: 'TIMEOUT_ALLOWED' };
  } else {
    console.log('Time Out NOT ALLOWED - Outside valid time range');
    return { allowed: false, message: 'TIMEOUT_NOT_ALLOWED' };
  }
};

const checkWorkingHours = (currentTime) => {
  console.log('=== WORKING HOURS CHECK ===');
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  console.log('Current PH time:', `${hours}:${minutes.toString().padStart(2, '0')}`);
  console.log('Working hours: 06:00 to 19:00 (360 to 1140 minutes)');
  console.log('Current total minutes:', totalMinutes);
  
  // STRICT CHECK: No scanning allowed outside 6:00 AM - 7:00 PM
  if (totalMinutes >= 360 && totalMinutes < 1140) {
    console.log('WITHIN WORKING HOURS - Scanning allowed');
    return { allowed: true, message: 'WITHIN_WORKING_HOURS' };
  } else {
    console.log('OUTSIDE WORKING HOURS - Scanning NOT allowed');
    return { allowed: false, message: 'OUTSIDE_WORKING_HOURS' };
  }
};

// FIXED RFID SCAN ENDPOINT - PROPER TIME IN/OUT PROCESSING
router.post('/scan/', async (req, res) => {
  try {
    const { uid, device = 'Brighton-EMS-RFID-Reader', timestamp, ph_time } = req.body;
    const io = req.app.get('io');
    
    console.log('=== RFID SCAN START ===');
    console.log('RFID Scan Received:', { 
      uid, 
      device, 
      timestamp,
      ph_time
    });

    if (!uid) {
      console.log('No UID provided in request');
      return res.status(200).json({
        success: false,
        message: 'No UID provided',
        displayMessage: 'NO_CARD_DETECTED'
      });
    }

    const normalizedUid = normalizeUid(uid);
    const displayUid = formatUidForDisplay(uid);
    
    console.log('Normalized UID:', normalizedUid);
    console.log('Display UID:', displayUid);

    // 🔍 ENHANCED EMPLOYEE LOOKUP
    let employee = await Employee.findOne({
      $or: [
        { rfidUid: { $regex: new RegExp('^' + normalizedUid + '$', 'i') } },
        { rfidUid: { $regex: new RegExp(normalizedUid, 'i') } }
      ],
      status: 'Active'
    });

    if (!employee) {
      // Fallback: Check all employees with case-insensitive matching
      const allEmployees = await Employee.find({ status: 'Active' }).select('employeeId firstName lastName rfidUid department position');
      
      for (const emp of allEmployees) {
        if (emp.rfidUid) {
          const empNormalizedUid = normalizeUid(emp.rfidUid);
          if (empNormalizedUid === normalizedUid) {
            employee = emp;
            break;
          }
        }
      }
    }

    if (!employee) {
      console.log('No employee found for UID:', normalizedUid);
      return res.status(200).json({
        success: false,
        message: 'RFID card not assigned to any active employee',
        displayMessage: 'CARD_NOT_ASSIGNED',
        scannedUid: normalizedUid
      });
    }

    console.log('✅ Employee found:', {
      name: `${employee.firstName} ${employee.lastName}`,
      employeeId: employee.employeeId,
      department: employee.department
    });

    // Use ph_time field directly from Arduino (Philippine time string)
    let now;
    if (ph_time) {
      now = parsePhilippineTime(ph_time);
      console.log('Using Arduino PH time:', ph_time);
      console.log('Parsed PH time:', now.toString());
    } else {
      now = getCurrentDateTime();
      console.log('Using server-generated PH time (fallback):', now.toString());
    }
    
    const today = getCurrentDate();
    const currentTimeString = formatTimeForDisplay(now);
    
    console.log('Current PH time to be saved:', now.toString());
    console.log('PH Hours:', now.getHours(), 'PH Minutes:', now.getMinutes());
    console.log('Today date:', today);
    console.log('Current time string:', currentTimeString);

    // STRICT CHECK: First check if we're within working hours at all
    const workingHoursCheck = checkWorkingHours(now);
    if (!workingHoursCheck.allowed) {
      console.log('Outside working hours:', workingHoursCheck.message);
      return res.status(200).json({
        success: false,
        message: 'Scanning only allowed between 6:00 AM - 7:00 PM (Philippine Time)',
        displayMessage: 'OUTSIDE_WORKING_HOURS',
        currentTime: currentTimeString
      });
    }

    let attendance = await Attendance.findOne({
      employeeId: employee.employeeId,
      date: today
    });

    console.log('Existing attendance record:', attendance);

    let responseData;
    let actionType = '';

    if (!attendance) {
      // 🟢 TIME IN ATTEMPT
      const timeInCheck = checkTimeInHours(now);
      
      if (!timeInCheck.allowed) {
        console.log('Time in not allowed:', timeInCheck.message);
        return res.status(200).json({
          success: false,
          message: 'Time in only allowed between 6:00 AM - 5:00 PM (Philippine Time)',
          displayMessage: 'TIMEIN_NOT_ALLOWED',
          currentTime: currentTimeString
        });
      }

      // Check if late (after 8:00 AM)
      const workStartTime = new Date(now);
      workStartTime.setHours(8, 0, 0, 0);
      
      let status = 'Present';
      let lateMinutes = 0;

      if (now > workStartTime) {
        status = 'Late';
        lateMinutes = Math.round((now - workStartTime) / (1000 * 60));
        console.log(`Employee is late by: ${lateMinutes} minutes`);
      }

      // Create new attendance record for Time In
      attendance = new Attendance({
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        position: employee.position,
        date: today,
        timeIn: now,
        status: status,
        lateMinutes: lateMinutes,
        dateEmployed: employee.dateEmployed,
        recordType: 'auto',
        recordedBy: 'RFID System',
        timeInSource: 'rfid'
      });

      try {
        const result = await attendance.save();
        actionType = 'timein';
        
        console.log('✅ RFID Time In recorded successfully');
        console.log('Time In (PH):', formatTimeForDisplay(result.timeIn));
        console.log('Status:', result.status);
        console.log('Late Minutes:', result.lateMinutes);

        responseData = {
          success: true,
          message: 'Time in recorded successfully',
          displayMessage: status === 'Late' ? 'SUCCESS:LATE_CHECKIN' : 'SUCCESS:CHECKIN',
          type: 'timein',
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          department: employee.department,
          time: currentTimeString,
          timestamp: now,
          status: result.status,
          lateMinutes: result.lateMinutes,
          currentTime: currentTimeString
        };

      } catch (saveError) {
        console.error('❌ Error saving time in:', saveError);
        return res.status(200).json({
          success: false,
          message: 'Error recording time in',
          displayMessage: 'ERROR:PROCESSING',
          currentTime: currentTimeString
        });
      }

    } else if (attendance.timeIn && !attendance.timeOut) {
      // 🔴 TIME OUT ATTEMPT
      const timeOutCheck = checkTimeOutHours(now);
      
      if (!timeOutCheck.allowed) {
        console.log('Time out not allowed:', timeOutCheck.message);
        return res.status(200).json({
          success: false,
          message: 'Time out only allowed between 6:00 AM - 7:00 PM (Philippine Time)',
          displayMessage: 'TIMEOUT_NOT_ALLOWED',
          currentTime: currentTimeString
        });
      }

      // Validate 10-minute rule between time in and time out
      const timeIn = new Date(attendance.timeIn);
      const timeOut = new Date(now);
      const timeDifference = (timeOut - timeIn) / (1000 * 60); // difference in minutes
      
      console.log(`Time validation - Time In: ${timeIn.toLocaleTimeString()}, Time Out: ${timeOut.toLocaleTimeString()}, Difference: ${timeDifference} minutes`);
      
      if (timeDifference < 10) {
        const remainingMinutes = Math.ceil(10 - timeDifference);
        console.log(`Time out rejected: Need to wait ${remainingMinutes} more minutes`);
        return res.status(200).json({
          success: false,
          message: `Please wait at least 10 minutes between time in and time out. Wait ${remainingMinutes} more minutes.`,
          displayMessage: 'WAIT_10_MINUTES',
          currentTime: currentTimeString
        });
      }

      // Update attendance record for Time Out
      attendance.timeOut = now;
      attendance.timeOutSource = 'rfid';
      attendance.lastModified = new Date();

      // Calculate hours worked
      const totalMinutes = timeDifference;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.round(totalMinutes % 60);
      
      attendance.totalMinutes = totalMinutes;
      attendance.hoursWorked = `${hours}h ${minutes}m`;

      // Check for overtime (after 5:00 PM)
      const workEndTime = new Date(attendance.timeIn);
      workEndTime.setHours(17, 0, 0, 0); // 5:00 PM
      
      if (timeOut > workEndTime) {
        const overtimeMinutes = Math.round((timeOut - workEndTime) / (1000 * 60));
        attendance.overtimeMinutes = Math.max(0, overtimeMinutes);
        console.log(`Overtime detected: ${attendance.overtimeMinutes} minutes`);
      }
      
      attendance.status = 'Completed';

      try {
        const result = await attendance.save();
        actionType = 'timeout';
        
        console.log('✅ RFID Time Out recorded successfully');
        console.log('Time Out (PH):', formatTimeForDisplay(result.timeOut));
        console.log('Hours Worked:', result.hoursWorked);
        console.log('Overtime Minutes:', result.overtimeMinutes);

        responseData = {
          success: true,
          message: 'Time out recorded successfully',
          displayMessage: 'SUCCESS:CHECKOUT',
          type: 'timeout',
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          department: employee.department,
          time: currentTimeString,
          hoursWorked: result.hoursWorked,
          timestamp: now,
          overtimeMinutes: result.overtimeMinutes || 0,
          currentTime: currentTimeString
        };

      } catch (saveError) {
        console.error('❌ Error saving time out:', saveError);
        return res.status(200).json({
          success: false,
          message: 'Error recording time out',
          displayMessage: 'ERROR:PROCESSING',
          currentTime: currentTimeString
        });
      }

    } else if (attendance.timeOut) {
      console.log('Attendance already completed for today');
      responseData = {
        success: true,
        message: 'Attendance already completed for today',
        displayMessage: 'INFO:ALREADY_DONE',
        type: 'already_done',
        name: `${employee.firstName} ${employee.lastName}`,
        employeeId: employee.employeeId,
        lastAction: 'Time Out',
        currentTime: currentTimeString
      };
    } else {
      console.log('Unexpected attendance state');
      responseData = {
        success: false,
        message: 'Unexpected attendance state',
        displayMessage: 'ERROR:UNEXPECTED_STATE',
        currentTime: currentTimeString
      };
    }

    // Emit real-time update via Socket.IO
    if (io && actionType) {
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
        source: 'rfid'
      });
      console.log('📡 Socket event emitted for attendance update');
    }

    console.log('=== RFID SCAN END - SUCCESS ===');
    res.status(200).json(responseData);

  } catch (error) {
    console.error('=== RFID SCAN ERROR ===');
    console.error('RFID scan error:', error);
    return res.status(200).json({
      success: false,
      message: 'Error processing RFID scan',
      displayMessage: 'ERROR:PROCESSING',
      error: error.message
    });
  }
});

// GET TODAY'S ATTENDANCE
router.get('/attendance/today/', async (req, res) => {
  try {
    const today = getCurrentDate();
    
    console.log('Fetching attendance for today:', today);
    
    const attendance = await Attendance.find({ date: today })
      .sort({ timeIn: -1 });

    // Times are already in PH timezone, just format them
    const attendanceWithPHTime = attendance.map(record => ({
      ...record._doc,
      displayTimeIn: record.timeIn ? formatTimeForDisplay(record.timeIn) : '',
      displayTimeOut: record.timeOut ? formatTimeForDisplay(record.timeOut) : ''
    }));

    console.log('Found', attendance.length, 'attendance records for today');

    res.status(200).json({
      success: true,
      data: attendanceWithPHTime,
      count: attendance.length
    });

  } catch (error) {
    console.error('Error fetching today attendance:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching attendance data'
    });
  }
});

// ASSIGN RFID TO EMPLOYEE
router.post('/assign/', async (req, res) => {
  try {
    const { employeeId, rfidUid } = req.body;
    const io = req.app.get('io');

    if (!employeeId || !rfidUid) {
      return res.status(200).json({
        success: false,
        message: 'Employee ID and RFID UID are required'
      });
    }

    const normalizedUid = normalizeUid(rfidUid);
    const formattedUid = formatUidForDisplay(rfidUid);

    console.log('=== RFID ASSIGNMENT START ===');

    const existingAssignment = await Employee.findOne({
      $or: [
        { rfidUid: { $regex: new RegExp('^' + normalizedUid + '$', 'i') } },
        { rfidUid: formattedUid }
      ],
      employeeId: { $ne: employeeId }
    });

    if (existingAssignment) {
      console.log('RFID already assigned to:', existingAssignment.employeeId);
      return res.status(200).json({
        success: false,
        message: `RFID already assigned to ${existingAssignment.firstName} ${existingAssignment.lastName}`,
        assignedTo: `${existingAssignment.firstName} ${existingAssignment.lastName}`
      });
    }

    const employee = await Employee.findOneAndUpdate(
      { employeeId: employeeId },
      { 
        rfidUid: formattedUid,
        isRfidAssigned: true
      },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(200).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const uidRecord = new UID({
      uid: formattedUid,
      employeeId: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      department: employee.department,
      position: employee.position,
      assignedAt: new Date()
    });

    await uidRecord.save();

    if (io) {
      io.emit('rfid-assigned', {
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        rfidUid: formattedUid,
        assignedAt: new Date()
      });
    }

    console.log('RFID assigned successfully to:', employee.employeeId);

    res.status(200).json({
      success: true,
      message: 'RFID assigned successfully',
      data: {
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        rfidUid: employee.rfidUid,
        department: employee.department
      }
    });

  } catch (error) {
    console.error('=== RFID ASSIGNMENT ERROR ===');
    console.error('RFID assignment error:', error);
    res.status(200).json({
      success: false,
      message: 'Error assigning RFID',
      error: error.message
    });
  }
});

// REMOVE RFID ASSIGNMENT
router.delete('/assign/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const io = req.app.get('io');

    console.log('=== RFID REMOVAL START ===');

    const employee = await Employee.findOne({ employeeId: employeeId });
    
    if (!employee) {
      return res.status(200).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const updatedEmployee = await Employee.findOneAndUpdate(
      { employeeId: employeeId },
      { 
        rfidUid: null,
        isRfidAssigned: false
      },
      { new: true }
    );

    await UID.findOneAndDelete({ employeeId: employeeId });

    if (io) {
      io.emit('rfid-removed', {
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        removedRfid: employee.rfidUid,
        removedAt: new Date()
      });
    }

    console.log('RFID removed from:', employee.employeeId);

    res.status(200).json({
      success: true,
      message: 'RFID assignment removed successfully',
      data: {
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        removedRfid: employee.rfidUid
      }
    });

  } catch (error) {
    console.error('=== RFID REMOVAL ERROR ===');
    console.error('RFID removal error:', error);
    res.status(200).json({
      success: false,
      message: 'Error removing RFID assignment',
      error: error.message
    });
  }
});

// GET ASSIGNED RFID CARDS
router.get('/assigned/', async (req, res) => {
  try {
    const assignedCards = await UID.find().sort({ assignedAt: -1 });
    res.status(200).json({
      success: true,
      data: assignedCards,
      count: assignedCards.length
    });
  } catch (error) {
    console.error('Error fetching assigned cards:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching assigned RFID cards'
    });
  }
});

// GET UNASSIGNED EMPLOYEES
router.get('/unassigned/', async (req, res) => {
  try {
    const unassignedEmployees = await Employee.find({
      status: 'Active',
      $or: [
        { rfidUid: { $exists: false } },
        { rfidUid: null },
        { rfidUid: '' },
        { isRfidAssigned: false }
      ]
    }).select('employeeId firstName lastName department position');

    res.status(200).json({
      success: true,
      data: unassignedEmployees,
      count: unassignedEmployees.length
    });
  } catch (error) {
    console.error('Error fetching unassigned employees:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching unassigned employees',
      error: error.message
    });
  }
});

// GET EMPLOYEE BY RFID UID
router.get('/employee/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    if (!uid) {
      return res.status(200).json({
        success: false,
        message: 'RFID UID is required'
      });
    }

    const normalizedUid = normalizeUid(uid);
    const employee = await Employee.findOne({
      $or: [
        { rfidUid: { $regex: new RegExp('^' + normalizedUid + '$', 'i') } },
        { rfidUid: { $regex: new RegExp(normalizedUid, 'i') } }
      ],
      status: 'Active'
    });

    if (!employee) {
      return res.status(200).json({
        success: false,
        message: 'No employee found with this RFID UID',
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: {
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        position: employee.position,
        rfidUid: employee.rfidUid
      }
    });

  } catch (error) {
    console.error('Error fetching employee by RFID:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching employee information',
      error: error.message
    });
  }
});

// GET TODAY'S SUMMARY
router.get('/summary/today/', async (req, res) => {
  try {
    const today = getCurrentDate();
    
    console.log('Fetching today summary for date:', today);
    
    const totalEmployees = await Employee.countDocuments({ status: 'Active' });
    const todayAttendance = await Attendance.find({ date: today });
    
    const present = todayAttendance.filter(a => a.timeIn).length;
    const absent = totalEmployees - present;
    const completed = todayAttendance.filter(a => a.timeOut).length;
    const late = todayAttendance.filter(a => a.status === 'Late').length;

    console.log('Today summary - Present:', present, 'Absent:', absent, 'Completed:', completed, 'Late:', late);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          present,
          absent,
          completed,
          late,
          totalEmployees
        },
        records: todayAttendance
      }
    });

  } catch (error) {
    console.error('Error fetching today summary:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching today summary'
    });
  }
});

// HEALTH CHECK ENDPOINT
router.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    phTime: getCurrentDateTime().toString(),
    uptime: process.uptime(),
    database: 'Connected',
    features: {
      mixedMode: true,
      timeValidation: true,
      realTimeUpdates: true,
      workingHoursEnforcement: true
    }
  };
  
  res.status(200).json({
    success: true,
    data: health
  });
});

module.exports = router;
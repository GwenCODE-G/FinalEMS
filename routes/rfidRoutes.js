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

// Get date string from Date object (for database storage)
const getDateString = (date) => {
  return date.toISOString().split('T')[0];
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

// RFID SCAN ENDPOINT - Enhanced for mixed RFID/manual support
router.post('/scan/', async (req, res) => {
  try {
    const { uid, device = 'Brighton-EMS-RFID-Reader', timestamp, ph_time, current_hour, current_minute, time_synced } = req.body;
    const io = req.app.get('io');
    
    console.log('=== RFID SCAN START ===');
    console.log('RFID Scan Received:', { 
      uid, 
      device, 
      timestamp,
      ph_time,
      current_hour,
      current_minute,
      time_synced,
      serverTime: new Date().toISOString()
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

    let employee = await Employee.findOne({
      $or: [
        { rfidUid: { $regex: new RegExp('^' + normalizedUid + '$', 'i') } },
        { rfidUid: { $regex: new RegExp(normalizedUid, 'i') } }
      ],
      status: 'Active'
    });

    if (!employee) {
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

    console.log('Employee found:', {
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
    } else if (timestamp && time_synced) {
      now = new Date(timestamp * 1000);
      console.log('Using Arduino timestamp (fallback):', now.toString());
    } else {
      now = getCurrentDateTime();
      console.log('Using server-generated PH time (fallback):', now.toString());
    }
    
    const today = getDateString(now);
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
      // Time In attempt
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

      // Use the enhanced RFID processing method
      try {
        const result = await Attendance.processRfidScan(employee.employeeId, now, 'timein');
        actionType = 'timein';
        
        console.log('RFID Time In recorded successfully');
        console.log('Time In (PH):', formatTimeForDisplay(result.data.timeIn));
        console.log('Status:', result.data.status);

        responseData = {
          success: true,
          message: 'Time in recorded successfully',
          displayMessage: result.data.status === 'Late' ? 'SUCCESS:LATE_CHECKIN' : 'SUCCESS:CHECKIN',
          type: 'timein',
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          department: employee.department,
          time: currentTimeString,
          timestamp: now,
          status: result.data.status,
          lateMinutes: result.data.lateMinutes,
          currentTime: currentTimeString
        };

      } catch (error) {
        console.error('Error processing RFID time in:', error);
        return res.status(200).json({
          success: false,
          message: error.message,
          displayMessage: 'ERROR:PROCESSING',
          currentTime: currentTimeString
        });
      }

    } else if (attendance.timeIn && !attendance.timeOut) {
      // Time Out attempt
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

      // Use the enhanced time out processing method that handles mixed RFID/manual
      try {
        const result = await Attendance.processTimeOut(employee.employeeId, now, 'rfid');
        actionType = 'timeout';
        
        console.log('RFID Time Out recorded successfully');
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

      } catch (error) {
        console.error('Error processing RFID time out:', error);
        return res.status(200).json({
          success: false,
          message: error.message,
          displayMessage: error.message.includes('10 minutes') ? 'WAIT_10_MINUTES' : 'ERROR:PROCESSING',
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

    if (io && actionType) {
      io.emit('attendance-update', {
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        type: actionType,
        time: now,
        status: attendance?.status || 'Present',
        hoursWorked: attendance?.hoursWorked || '0h 0m',
        timestamp: now,
        currentTime: currentTimeString,
        source: 'rfid'
      });
      console.log('Socket event emitted for attendance update');
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

// GET REAL-TIME SUMMARY FOR EMPLOYEE
router.get('/summary/realtime/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    if (!employeeId) {
      return res.status(200).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    const summary = await Attendance.getRealTimeSummaryFromEmployment(employeeId);

    res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error fetching real-time summary:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching real-time summary',
      error: error.message
    });
  }
});

// GET MONTHLY SUMMARY
router.get('/summary/monthly/', async (req, res) => {
  try {
    const { employeeId, year, month } = req.query;
    
    if (!employeeId || !year || !month) {
      return res.status(200).json({
        success: false,
        message: 'Employee ID, year, and month are required'
      });
    }

    const summary = await Attendance.getMonthlySummaryFromEmployment(
      employeeId, 
      parseInt(year), 
      parseInt(month)
    );

    res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching monthly summary',
      error: error.message
    });
  }
});

// GET ATTENDANCE HISTORY FOR EMPLOYEE
router.get('/attendance/history/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;
    
    if (!employeeId) {
      return res.status(200).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    let filter = { employeeId: employeeId };
    
    if (startDate && endDate) {
      filter.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const attendance = await Attendance.find(filter)
      .sort({ date: -1 })
      .limit(parseInt(limit));

    const attendanceWithDisplayTimes = attendance.map(record => ({
      ...record._doc,
      displayTimeIn: record.timeIn ? formatTimeForDisplay(record.timeIn) : '',
      displayTimeOut: record.timeOut ? formatTimeForDisplay(record.timeOut) : ''
    }));

    res.status(200).json({
      success: true,
      data: attendanceWithDisplayTimes,
      count: attendance.length
    });

  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching attendance history',
      error: error.message
    });
  }
});

// GET EMPLOYEE ASSIGNMENT HISTORY
router.get('/assignment-history/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    if (!employeeId) {
      return res.status(200).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    const employee = await Employee.findOne({ employeeId: employeeId });
    if (!employee) {
      return res.status(200).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const uidHistory = await UID.find({ employeeId: employeeId }).sort({ assignedAt: -1 });
    
    // Get recent attendance records
    const recentAttendance = await Attendance.find({ 
      employeeId: employeeId 
    })
    .sort({ date: -1 })
    .limit(30);

    const employmentDate = employee.dateEmployed;
    const today = new Date();
    
    // Calculate work days since employment
    const workDays = Attendance.calculateWorkDays(employmentDate, today);
    
    // Calculate present days
    const presentDays = recentAttendance.filter(record => record.timeIn).length;

    res.status(200).json({
      success: true,
      data: {
        employee: {
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          position: employee.position,
          currentRfid: employee.rfidUid,
          isRfidAssigned: employee.isRfidAssigned,
          dateEmployed: employmentDate
        },
        uidHistory: uidHistory,
        recentAttendance: recentAttendance.map(record => ({
          date: record.date,
          timeIn: record.displayTimeIn,
          timeOut: record.displayTimeOut,
          status: record.status,
          hoursWorked: record.hoursWorked,
          source: {
            timeIn: record.timeInSource,
            timeOut: record.timeOutSource
          }
        })),
        employmentInfo: {
          workDays: workDays,
          presentDays: presentDays,
          absentDays: Math.max(0, workDays - presentDays)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching assignment history:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching assignment history',
      error: error.message
    });
  }
});

// BULK RFID ASSIGNMENT
router.post('/assign/bulk', async (req, res) => {
  try {
    const { assignments } = req.body;
    const io = req.app.get('io');

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'Assignments array is required'
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const assignment of assignments) {
      const { employeeId, rfidUid } = assignment;
      
      if (!employeeId || !rfidUid) {
        results.failed.push({
          employeeId,
          rfidUid,
          error: 'Missing employeeId or rfidUid'
        });
        continue;
      }

      try {
        const normalizedUid = normalizeUid(rfidUid);
        const formattedUid = formatUidForDisplay(rfidUid);

        // Check if RFID is already assigned to another employee
        const existingAssignment = await Employee.findOne({
          $or: [
            { rfidUid: { $regex: new RegExp('^' + normalizedUid + '$', 'i') } },
            { rfidUid: formattedUid }
          ],
          employeeId: { $ne: employeeId }
        });

        if (existingAssignment) {
          results.failed.push({
            employeeId,
            rfidUid: formattedUid,
            error: `RFID already assigned to ${existingAssignment.firstName} ${existingAssignment.lastName}`
          });
          continue;
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
          results.failed.push({
            employeeId,
            rfidUid: formattedUid,
            error: 'Employee not found'
          });
          continue;
        }

        // Update or create UID record
        await UID.findOneAndUpdate(
          { employeeId: employeeId },
          {
            uid: formattedUid,
            employeeId: employee.employeeId,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            department: employee.department,
            position: employee.position,
            assignedAt: new Date(),
            isActive: true
          },
          { upsert: true, new: true }
        );

        results.successful.push({
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          rfidUid: formattedUid,
          department: employee.department
        });

        if (io) {
          io.emit('rfid-assigned', {
            employeeId: employee.employeeId,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            rfidUid: formattedUid,
            assignedAt: new Date()
          });
        }

      } catch (error) {
        results.failed.push({
          employeeId,
          rfidUid: assignment.rfidUid,
          error: error.message
        });
      }
    }

    console.log(`Bulk assignment completed: ${results.successful.length} successful, ${results.failed.length} failed`);

    res.status(200).json({
      success: true,
      message: `Bulk assignment completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results
    });

  } catch (error) {
    console.error('Error in bulk RFID assignment:', error);
    res.status(200).json({
      success: false,
      message: 'Error processing bulk RFID assignment',
      error: error.message
    });
  }
});

// GET RFID SCAN LOGS
router.get('/logs/', async (req, res) => {
  try {
    const { date, employeeId, page = 1, limit = 50 } = req.query;
    
    let filter = {};
    
    if (date) {
      filter.date = date;
    }
    
    if (employeeId) {
      filter.employeeId = employeeId;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const attendance = await Attendance.find({
      ...filter,
      $or: [
        { timeInSource: 'rfid' },
        { timeOutSource: 'rfid' }
      ]
    })
    .sort({ date: -1, timeIn: -1 })
    .limit(limitNum)
    .skip(skip)
    .select('-__v');

    const total = await Attendance.countDocuments({
      ...filter,
      $or: [
        { timeInSource: 'rfid' },
        { timeOutSource: 'rfid' }
      ]
    });

    res.status(200).json({
      success: true,
      data: attendance,
      pagination: {
        current: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('Error fetching RFID logs:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching RFID scan logs',
      error: error.message
    });
  }
});

// GET RFID SYSTEM STATISTICS
router.get('/stats/system', async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments({ status: 'Active' });
    const assignedRFID = await Employee.countDocuments({ 
      status: 'Active', 
      isRfidAssigned: true 
    });
    const unassignedRFID = totalEmployees - assignedRFID;

    // Get today's RFID scans
    const today = getCurrentDate();
    const todayRFIDScans = await Attendance.countDocuments({
      date: today,
      $or: [
        { timeInSource: 'rfid' },
        { timeOutSource: 'rfid' }
      ]
    });

    // Get this month's RFID scans
    const startOfMonth = moment().tz('Asia/Manila').startOf('month').format('YYYY-MM-DD');
    const endOfMonth = moment().tz('Asia/Manila').endOf('month').format('YYYY-MM-DD');
    
    const monthlyRFIDScans = await Attendance.countDocuments({
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth
      },
      $or: [
        { timeInSource: 'rfid' },
        { timeOutSource: 'rfid' }
      ]
    });

    // Get most active RFID users
    const mostActiveUsers = await Attendance.aggregate([
      {
        $match: {
          $or: [
            { timeInSource: 'rfid' },
            { timeOutSource: 'rfid' }
          ]
        }
      },
      {
        $group: {
          _id: '$employeeId',
          name: { $first: '$employeeName' },
          department: { $first: '$department' },
          totalScans: { $sum: 1 },
          timeInScans: {
            $sum: { $cond: [{ $eq: ['$timeInSource', 'rfid'] }, 1, 0] }
          },
          timeOutScans: {
            $sum: { $cond: [{ $eq: ['$timeOutSource', 'rfid'] }, 1, 0] }
          }
        }
      },
      { $sort: { totalScans: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalEmployees,
          assignedRFID,
          unassignedRFID,
          assignmentRate: totalEmployees > 0 ? Math.round((assignedRFID / totalEmployees) * 100) : 0,
          todayRFIDScans,
          monthlyRFIDScans
        },
        mostActiveUsers,
        timestamp: new Date().toISOString(),
        phTime: getCurrentDateTime().toString()
      }
    });

  } catch (error) {
    console.error('Error fetching RFID system statistics:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching RFID system statistics',
      error: error.message
    });
  }
});

// VALIDATE RFID UID
router.post('/validate', async (req, res) => {
  try {
    const { rfidUid } = req.body;
    
    if (!rfidUid) {
      return res.status(200).json({
        success: false,
        message: 'RFID UID is required'
      });
    }

    const normalizedUid = normalizeUid(rfidUid);
    const formattedUid = formatUidForDisplay(rfidUid);

    // Check if UID is already assigned
    const existingAssignment = await Employee.findOne({
      $or: [
        { rfidUid: { $regex: new RegExp('^' + normalizedUid + '$', 'i') } },
        { rfidUid: formattedUid }
      ],
      status: 'Active'
    });

    // Validate UID format (8 hexadecimal characters)
    const isValidFormat = /^[0-9A-F]{8}$/i.test(normalizedUid);

    res.status(200).json({
      success: true,
      data: {
        uid: formattedUid,
        normalizedUid: normalizedUid,
        isValidFormat: isValidFormat,
        isAssigned: !!existingAssignment,
        assignedTo: existingAssignment ? {
          employeeId: existingAssignment.employeeId,
          name: `${existingAssignment.firstName} ${existingAssignment.lastName}`,
          department: existingAssignment.department
        } : null
      }
    });

  } catch (error) {
    console.error('Error validating RFID UID:', error);
    res.status(200).json({
      success: false,
      message: 'Error validating RFID UID',
      error: error.message
    });
  }
});

// SEARCH RFID ASSIGNMENTS
router.get('/search', async (req, res) => {
  try {
    const { query, page = 1, limit = 50 } = req.query;
    
    if (!query) {
      return res.status(200).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const searchFilter = {
      status: 'Active',
      isRfidAssigned: true,
      $or: [
        { employeeId: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { department: { $regex: query, $options: 'i' } },
        { position: { $regex: query, $options: 'i' } },
        { rfidUid: { $regex: query, $options: 'i' } }
      ]
    };

    const employees = await Employee.find(searchFilter)
      .sort({ firstName: 1, lastName: 1 })
      .limit(limitNum)
      .skip(skip)
      .select('employeeId firstName lastName department position rfidUid isRfidAssigned');

    const total = await Employee.countDocuments(searchFilter);

    res.status(200).json({
      success: true,
      data: employees,
      pagination: {
        current: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('Error searching RFID assignments:', error);
    res.status(200).json({
      success: false,
      message: 'Error searching RFID assignments',
      error: error.message
    });
  }
});

// SYSTEM STATUS
router.get('/status/', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      isConnected: true,
      status: 'RFID System Active',
      timestamp: new Date().toISOString(),
      serverTime: new Date().toString(),
      phTime: getCurrentDateTime().toString(),
      version: '2.8',
      features: [
        'Mixed RFID/Manual Attendance Support',
        '10-Minute Rule Validation',
        'Real-time Philippine Time',
        'Working Hours Enforcement',
        'Socket.io Real-time Updates',
        'Bulk RFID Assignment',
        'Assignment History Tracking',
        'RFID Scan Logs',
        'System Statistics',
        'UID Validation'
      ]
    }
  });
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
      bulkOperations: true
    }
  };
  
  res.status(200).json({
    success: true,
    data: health
  });
});

// TEST RFID SCAN ENDPOINT (for development)
router.post('/test-scan', async (req, res) => {
  try {
    const { employeeId, action = 'timein' } = req.body;
    
    if (!employeeId) {
      return res.status(200).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    const employee = await Employee.findOne({ employeeId: employeeId });
    if (!employee) {
      return res.status(200).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const now = getCurrentDateTime();
    const today = getDateString(now);
    
    console.log(`Test scan for ${employeeId} - Action: ${action}`);
    console.log(`Time: ${formatTimeForDisplay(now)}, Date: ${today}`);

    let result;
    if (action === 'timein') {
      result = await Attendance.processRfidScan(employeeId, now, 'timein');
    } else if (action === 'timeout') {
      result = await Attendance.processTimeOut(employeeId, now, 'rfid');
    } else {
      return res.status(200).json({
        success: false,
        message: 'Invalid action. Use "timein" or "timeout"'
      });
    }

    res.status(200).json({
      success: true,
      message: `Test ${action} completed successfully`,
      data: result
    });

  } catch (error) {
    console.error('Error in test scan:', error);
    res.status(200).json({
      success: false,
      message: 'Error processing test scan',
      error: error.message
    });
  }
});

// GET RFID DASHBOARD OVERVIEW
router.get('/dashboard/overview', async (req, res) => {
  try {
    const today = getCurrentDate();
    
    // Get today's statistics
    const totalEmployees = await Employee.countDocuments({ status: 'Active' });
    const todayAttendance = await Attendance.find({ date: today });
    
    const presentToday = todayAttendance.filter(a => a.timeIn).length;
    const absentToday = totalEmployees - presentToday;
    const completedToday = todayAttendance.filter(a => a.timeOut).length;
    const lateToday = todayAttendance.filter(a => a.status === 'Late').length;
    
    // Get RFID-specific statistics for today
    const rfidTimeInToday = todayAttendance.filter(a => a.timeInSource === 'rfid').length;
    const rfidTimeOutToday = todayAttendance.filter(a => a.timeOutSource === 'rfid').length;
    const totalRFIDScansToday = rfidTimeInToday + rfidTimeOutToday;

    // Get assignment statistics
    const assignedRFID = await Employee.countDocuments({ 
      status: 'Active', 
      isRfidAssigned: true 
    });
    const unassignedRFID = totalEmployees - assignedRFID;

    // Get recent RFID scans (last 10)
    const recentRFIDScans = await Attendance.find({
      $or: [
        { timeInSource: 'rfid' },
        { timeOutSource: 'rfid' }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('employeeId employeeName department timeIn timeOut timeInSource timeOutSource status');

    res.status(200).json({
      success: true,
      data: {
        date: today,
        summary: {
          totalEmployees,
          presentToday,
          absentToday,
          completedToday,
          lateToday,
          assignedRFID,
          unassignedRFID,
          rfidTimeInToday,
          rfidTimeOutToday,
          totalRFIDScansToday
        },
        recentScans: recentRFIDScans,
        phTime: getCurrentDateTime().toString()
      }
    });

  } catch (error) {
    console.error('Error fetching RFID dashboard overview:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching RFID dashboard overview',
      error: error.message
    });
  }
});

module.exports = router;
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

const getCurrentDate = () => {
  const now = new Date();
  const offset = 8 * 60 * 60 * 1000; // GMT+8 in milliseconds
  const phTime = new Date(now.getTime() + offset);
  return phTime.toISOString().split('T')[0];
};

const getCurrentDateTime = () => {
  const now = new Date();
  const offset = 8 * 60 * 60 * 1000; // GMT+8 in milliseconds
  return new Date(now.getTime() + offset);
};

const checkTimeInHours = (currentTime) => {
  const hour = currentTime.getHours();
  const minute = currentTime.getMinutes();
  const totalMinutes = hour * 60 + minute;
  
  const timeInStart = 6 * 60;    // 6:00 AM
  const timeInEnd = 18 * 60;     // 6:00 PM
  
  if (totalMinutes < timeInStart) {
    return { allowed: false, message: 'WORK_NOT_START' };
  } else if (totalMinutes > timeInEnd) {
    return { allowed: false, message: 'TIMEIN_NOT_ALLOWED' };
  } else {
    return { allowed: true, message: 'WITHIN_WORK_HOURS' };
  }
};

const checkTimeOutHours = (currentTime) => {
  const hour = currentTime.getHours();
  const minute = currentTime.getMinutes();
  const totalMinutes = hour * 60 + minute;
  
  const timeOutStart = 6 * 60;    // 6:00 AM
  const timeOutEnd = 19 * 60;     // 7:00 PM (extended for time out)
  
  if (totalMinutes < timeOutStart) {
    return { allowed: false, message: 'TOO_EARLY_FOR_TIMEOUT' };
  } else {
    return { allowed: true, message: 'TIMEOUT_ALLOWED' };
  }
};

// RFID Scan Endpoint
router.post('/scan/', async (req, res) => {
  try {
    const { uid, device = 'RFID-Reader', timestamp } = req.body;
    const io = req.app.get('io');
    
    console.log('=== RFID SCAN START ===');
    console.log('RFID Scan Received:', { 
      uid, 
      device, 
      timestamp: new Date().toISOString(),
      serverTime: new Date().toString()
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

    const now = getCurrentDateTime();
    const today = getCurrentDate();
    
    console.log('Current time (GMT+8):', now.toString());
    console.log('Today date:', today);

    let attendance = await Attendance.findOne({
      employeeId: employee.employeeId,
      date: today
    });

    console.log('Existing attendance record:', attendance);

    let responseData;

    if (!attendance) {
      // Time In logic
      const timeInCheck = checkTimeInHours(now);
      
      if (!timeInCheck.allowed) {
        console.log('Outside time in hours:', timeInCheck.message);
        return res.status(200).json({
          success: false,
          message: timeInCheck.message === 'WORK_NOT_START' ? 'Work has not started yet' : 'Time in not allowed after 6:00 PM',
          displayMessage: timeInCheck.message
        });
      }

      const workStartTime = new Date(now);
      workStartTime.setHours(8, 0, 0, 0);
      
      let status = 'Present';
      let lateMinutes = 0;

      if (now > workStartTime) {
        status = 'Late';
        lateMinutes = Math.round((now - workStartTime) / (1000 * 60));
        console.log('Employee is late by:', lateMinutes, 'minutes');
      }

      attendance = new Attendance({
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        position: employee.position,
        date: today,
        timeIn: now,
        status: status,
        lateMinutes: lateMinutes,
        dateEmployed: employee.dateEmployed
      });

      await attendance.save();
      console.log('New attendance record created for time in');

      responseData = {
        success: true,
        message: 'Time in recorded successfully',
        displayMessage: status === 'Late' ? 'SUCCESS:LATE_CHECKIN' : 'SUCCESS:CHECKIN',
        type: 'timein',
        name: `${employee.firstName} ${employee.lastName}`,
        employeeId: employee.employeeId,
        department: employee.department,
        time: now.toLocaleTimeString('en-US', { hour12: true }),
        timestamp: now,
        status: status,
        lateMinutes: lateMinutes
      };

      console.log('Time In recorded for:', employee.employeeId, 'Status:', status);

    } else if (attendance.timeIn && !attendance.timeOut) {
      // Time Out logic
      const timeOutCheck = checkTimeOutHours(now);
      
      if (!timeOutCheck.allowed) {
        console.log('Too early for time out:', timeOutCheck.message);
        return res.status(200).json({
          success: false,
          message: 'Too early for time out',
          displayMessage: 'TOO_EARLY_FOR_TIMEOUT'
        });
      }

      const timeIn = new Date(attendance.timeIn);
      const timeDifference = (now - timeIn) / 1000;
      
      console.log('Time difference since time in:', timeDifference, 'seconds');
      
      if (timeDifference < 600) {
        console.log('Too soon for time out - need to wait 10 minutes');
        return res.status(200).json({
          success: false,
          message: 'Please wait at least 10 minutes between time in and time out',
          displayMessage: 'WAIT_10_MINUTES'
        });
      }

      attendance.timeOut = now;
      attendance.status = 'Completed';
      
      const hoursWorked = attendance.calculateHoursWorked();
      
      const workEndTime = new Date(timeIn);
      workEndTime.setHours(17, 0, 0, 0);
      
      if (now > workEndTime) {
        const overtimeMinutes = (now - workEndTime) / (1000 * 60);
        attendance.overtimeMinutes = Math.round(overtimeMinutes);
        console.log('Overtime detected:', attendance.overtimeMinutes, 'minutes');
      }
      
      await attendance.save();
      console.log('Time out recorded, hours worked:', attendance.hoursWorked);

      responseData = {
        success: true,
        message: 'Time out recorded successfully',
        displayMessage: 'SUCCESS:CHECKOUT',
        type: 'timeout',
        name: `${employee.firstName} ${employee.lastName}`,
        employeeId: employee.employeeId,
        department: employee.department,
        time: now.toLocaleTimeString('en-US', { hour12: true }),
        hoursWorked: attendance.hoursWorked,
        timestamp: now,
        overtimeMinutes: attendance.overtimeMinutes || 0
      };

      console.log('Time Out recorded for:', employee.employeeId, 'Hours:', attendance.hoursWorked);

    } else {
      console.log('Attendance already completed for today');
      responseData = {
        success: true,
        message: 'Attendance already completed for today',
        displayMessage: 'INFO:ALREADY_DONE',
        type: 'already_done',
        name: `${employee.firstName} ${employee.lastName}`,
        employeeId: employee.employeeId,
        lastAction: attendance.timeOut ? 'Time Out' : 'Time In'
      };
    }

    if (io) {
      io.emit('attendance-update', {
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        type: responseData.type,
        time: now,
        status: attendance.status,
        hoursWorked: attendance?.hoursWorked || '0h 0m',
        timestamp: now
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

// Assign RFID to Employee
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
      normalizedUid: normalizedUid,
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
        normalizedUid: normalizedUid,
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
        normalizedUid: normalizedUid,
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

// Remove RFID Assignment
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

// Get Real-Time Summary (from employment date until present)
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

// Get Monthly Summary (with real-time updates)
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

// Get Assignment History (real-time from employment to present)
router.get('/assignment-history/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const employmentDate = await Attendance.getEmploymentDate(employeeId);
    const employee = await Employee.findOne({ employeeId: employeeId });
    
    if (!employee) {
      return res.status(200).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get REAL-TIME attendance history from employment date until today
    const attendanceRecords = await Attendance.getAttendanceHistory(employeeId);

    // Get real-time work days count
    const totalWorkDays = await Attendance.getWorkDaysSinceEmployment(employeeId);
    const presentDays = attendanceRecords.filter(record => record.timeIn).length;
    const absentDays = Math.max(0, totalWorkDays - presentDays);

    res.status(200).json({
      success: true,
      data: {
        employee: {
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          department: employee.department,
          rfidUid: employee.rfidUid,
          isRfidAssigned: employee.isRfidAssigned,
          dateEmployed: employee.dateEmployed
        },
        employmentInfo: {
          employmentDate: employmentDate,
          daysSinceEmployment: employmentDate ? 
            Math.floor((new Date() - new Date(employmentDate)) / (1000 * 60 * 60 * 24)) : 0,
          totalWorkDays: totalWorkDays,
          presentDays: presentDays,
          absentDays: absentDays,
          totalAttendanceRecords: attendanceRecords.length,
          lastUpdated: new Date()
        },
        recentAttendance: attendanceRecords
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

// Debug RFID Assignments
router.get('/debug/rfid-assignments/', async (req, res) => {
  try {
    const employees = await Employee.find({ status: 'Active' })
      .select('employeeId firstName lastName rfidUid department position status dateEmployed')
      .sort('firstName');
    
    const assignments = employees.map(emp => ({
      employeeId: emp.employeeId,
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.department,
      position: emp.position,
      rfidUid: emp.rfidUid,
      normalizedUid: normalizeUid(emp.rfidUid),
      hasRfid: !!emp.rfidUid,
      status: emp.status,
      dateEmployed: emp.dateEmployed
    }));

    res.status(200).json({
      success: true,
      data: {
        totalEmployees: employees.length,
        employeesWithRFID: assignments.filter(emp => emp.hasRfid).length,
        assignments: assignments
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching RFID assignments',
      error: error.message
    });
  }
});

// Test UID Match
router.post('/test-uid-match/', async (req, res) => {
  try {
    const { uid } = req.body;
    const normalizedUid = normalizeUid(uid);
    
    const employee = await Employee.findOne({
      $or: [
        { rfidUid: { $regex: new RegExp('^' + normalizedUid + '$', 'i') } },
        { rfidUid: uid }
      ],
      status: 'Active'
    });
    
    res.status(200).json({
      success: true,
      data: {
        inputUid: uid,
        normalizedUid: normalizedUid,
        employeeFound: !!employee,
        employee: employee ? {
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          storedRfidUid: employee.rfidUid,
          normalizedStoredUid: normalizeUid(employee.rfidUid),
          dateEmployed: employee.dateEmployed
        } : null
      }
    });
  } catch (error) {
    console.error('Test UID match error:', error);
    res.status(200).json({
      success: false,
      message: 'Error testing UID match',
      error: error.message
    });
  }
});

// Get Today's Attendance
router.get('/attendance/today/', async (req, res) => {
  try {
    const today = getCurrentDate();
    
    console.log('Fetching attendance for today:', today);
    
    const attendance = await Attendance.find({ date: today })
      .sort({ timeIn: -1 });

    console.log('Found', attendance.length, 'attendance records for today');

    res.status(200).json({
      success: true,
      data: attendance,
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

// Get Attendance with Date Range
router.get('/attendance/', async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    
    let query = {};
    
    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    if (employeeId) {
      query.employeeId = employeeId;
    }

    const attendance = await Attendance.find(query)
      .sort({ date: -1, timeIn: -1 });

    res.status(200).json({
      success: true,
      data: {
        attendance,
        count: attendance.length
      }
    });

  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching attendance data'
    });
  }
});

// Get Today's Summary
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

// Get System Status
router.get('/status/', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      isConnected: true,
      status: 'RFID System Active',
      timestamp: new Date().toISOString(),
      serverTime: new Date().toString(),
      phTime: getCurrentDateTime().toString(),
      version: '2.0'
    }
  });
});

// Get Assigned RFID Cards
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

// Test Endpoint
router.get('/test/', async (req, res) => {
  try {
    const employeeCount = await Employee.countDocuments();
    const attendanceCount = await Attendance.countDocuments();
    const uidCount = await UID.countDocuments();
    
    res.status(200).json({
      success: true,
      data: {
        message: 'RFID System Test Successful',
        database: {
          employees: employeeCount,
          attendance: attendanceCount,
          rfidAssignments: uidCount
        },
        timestamp: new Date().toISOString(),
        serverTime: new Date().toString()
      }
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      message: 'RFID System Test Failed',
      error: error.message
    });
  }
});

// Get Employee Work Schedule
router.get('/employee/:employeeId/schedule', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const employee = await Employee.findOne({ employeeId: employeeId })
      .select('employeeId firstName lastName department position workSchedule dateEmployed');
    
    if (!employee) {
      return res.status(200).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        employee: {
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          department: employee.department,
          position: employee.position,
          dateEmployed: employee.dateEmployed
        },
        workSchedule: employee.workSchedule
      }
    });

  } catch (error) {
    console.error('Error fetching employee schedule:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching employee schedule',
      error: error.message
    });
  }
});

// Get Attendance Trends (real-time)
router.get('/attendance/trends/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { months = 6 } = req.query;
    
    const employee = await Employee.findOne({ employeeId: employeeId });
    
    if (!employee) {
      return res.status(200).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    // Adjust start date to employment date if employed later
    const employmentDate = new Date(employee.dateEmployed);
    const actualStartDate = employmentDate > startDate ? employmentDate : startDate;

    if (actualStartDate > endDate) {
      return res.status(200).json({
        success: true,
        data: {
          employee: {
            name: `${employee.firstName} ${employee.lastName}`,
            employeeId: employee.employeeId
          },
          trends: [],
          period: {
            startDate: actualStartDate,
            endDate: endDate,
            employmentDate: employmentDate
          }
        }
      });
    }

    const startDateStr = actualStartDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const attendance = await Attendance.find({
      employeeId: employeeId,
      date: {
        $gte: startDateStr,
        $lte: endDateStr
      }
    }).sort({ date: 1 });

    // Group by month
    const monthlyTrends = {};
    attendance.forEach(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyTrends[monthKey]) {
        monthlyTrends[monthKey] = {
          present: 0,
          late: 0,
          totalHours: 0,
          totalMinutes: 0
        };
      }
      
      monthlyTrends[monthKey].present++;
      if (record.status === 'Late') {
        monthlyTrends[monthKey].late++;
      }
      monthlyTrends[monthKey].totalMinutes += record.totalMinutes || 0;
      monthlyTrends[monthKey].totalHours = Math.round((monthlyTrends[monthKey].totalMinutes / 60) * 10) / 10;
    });

    const trends = Object.entries(monthlyTrends).map(([month, data]) => ({
      month,
      present: data.present,
      late: data.late,
      totalHours: data.totalHours,
      averageHours: data.present > 0 ? Math.round((data.totalHours / data.present) * 10) / 10 : 0
    }));

    res.status(200).json({
      success: true,
      data: {
        employee: {
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          department: employee.department
        },
        trends: trends.sort((a, b) => a.month.localeCompare(b.month)),
        period: {
          startDate: actualStartDate,
          endDate: endDate,
          employmentDate: employmentDate,
          months: trends.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching attendance trends:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching attendance trends',
      error: error.message
    });
  }
});

module.exports = router;
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

const checkWorkingHours = (currentTime) => {
  const hour = currentTime.getHours();
  const minute = currentTime.getMinutes();
  const totalMinutes = hour * 60 + minute;
  
  const workStart = 6 * 60;    // 6:00 AM
  const workEnd = 18 * 60;     // 6:00 PM
  
  if (totalMinutes < workStart) {
    return { allowed: false, message: 'WORK_NOT_START' };
  } else if (totalMinutes > workEnd) {
    return { allowed: false, message: 'WORK_TIME_DONE' };
  } else {
    return { allowed: true, message: 'WITHIN_WORK_HOURS' };
  }
};

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

    const workHoursCheck = checkWorkingHours(now);
    
    if (!workHoursCheck.allowed) {
      console.log('Outside working hours:', workHoursCheck.message);
      return res.status(200).json({
        success: false,
        message: workHoursCheck.message === 'WORK_NOT_START' ? 'Work has not started yet' : 'Working time is done',
        displayMessage: workHoursCheck.message
      });
    }

    let attendance = await Attendance.findOne({
      employeeId: employee.employeeId,
      date: today
    });

    console.log('Existing attendance record:', attendance);

    let responseData;

    if (!attendance) {
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
        lateMinutes: lateMinutes
      });

      await attendance.save();
      console.log('New attendance record created for time in');

      await Attendance.setRfidAssignmentDate(employee.employeeId);

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

router.get('/summary/monthly/', async (req, res) => {
  try {
    const { employeeId, year, month } = req.query;
    
    if (!employeeId || !year || !month) {
      return res.status(200).json({
        success: false,
        message: 'Employee ID, year, and month are required'
      });
    }

    const employee = await Employee.findOne({ employeeId: employeeId });
    if (!employee) {
      return res.status(200).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const summary = await Attendance.getMonthlySummaryFromAssignment(
      employeeId, 
      parseInt(year), 
      parseInt(month)
    );

    const attendanceRate = summary.totalWorkDays > 0 ? 
      ((summary.presentDays / summary.totalWorkDays) * 100) : 0;
    
    const efficiency = summary.presentDays > 0 ? 
      ((summary.totalHours / (summary.presentDays * 8)) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        ...summary,
        metrics: {
          attendanceRate: Math.round(attendanceRate * 10) / 10,
          efficiency: Math.round(efficiency * 10) / 10,
          totalScheduledHours: summary.totalWorkDays * 8,
          hoursUtilization: summary.totalHours > 0 ? 
            Math.round((summary.totalHours / (summary.totalWorkDays * 8)) * 100) : 0
        },
        employee: {
          name: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          position: employee.position,
          employeeId: employee.employeeId,
          dateEmployed: employee.dateEmployed
        },
        period: {
          month: parseInt(month),
          year: parseInt(year),
          monthName: new Date(year, month - 1).toLocaleDateString('en', { month: 'long' }),
          startDate: summary.startDate,
          endDate: summary.endDate,
          assignmentDate: summary.assignmentDate,
          totalCalendarDays: new Date(year, month, 0).getDate()
        }
      }
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

router.get('/assignment-history/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const assignmentDate = await Attendance.getRfidAssignmentDate(employeeId);
    const employee = await Employee.findOne({ employeeId: employeeId });
    
    if (!employee) {
      return res.status(200).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const attendanceRecords = await Attendance.find({ employeeId: employeeId })
      .sort({ date: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: {
        employee: {
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          department: employee.department,
          rfidUid: employee.rfidUid,
          isRfidAssigned: employee.isRfidAssigned
        },
        assignmentInfo: {
          assignmentDate: assignmentDate,
          daysSinceAssignment: assignmentDate ? 
            Math.floor((new Date() - new Date(assignmentDate)) / (1000 * 60 * 60 * 24)) : 0,
          totalAttendanceRecords: attendanceRecords.length
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

router.get('/debug/rfid-assignments/', async (req, res) => {
  try {
    const employees = await Employee.find({ status: 'Active' })
      .select('employeeId firstName lastName rfidUid department position status')
      .sort('firstName');
    
    const assignments = employees.map(emp => ({
      employeeId: emp.employeeId,
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.department,
      position: emp.position,
      rfidUid: emp.rfidUid,
      normalizedUid: normalizeUid(emp.rfidUid),
      hasRfid: !!emp.rfidUid,
      status: emp.status
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
          normalizedStoredUid: normalizeUid(employee.rfidUid)
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

module.exports = router;
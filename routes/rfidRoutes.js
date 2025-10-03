import express from 'express';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import ActivityLog from '../models/ActivityLog.js';

const router = express.Router();

const formatRfidUid = (uid) => {
  if (!uid) return null;
  let cleanUid = uid.replace(/\s/g, '').toUpperCase();
  if (cleanUid.length !== 8) {
    throw new Error('Invalid UID length. Must be 8 characters (4 bytes)');
  }
  return cleanUid.match(/.{1,2}/g).join(' ');
};

const validateRfidUid = (uid) => {
  const cleanUid = uid.replace(/\s/g, '');
  return /^[0-9A-F]{8}$/i.test(cleanUid);
};

const getWorkScheduleForDay = (employee, date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[date.getDay()];
  const isWorkDay = employee.workDays && employee.workDays[dayName];
  const schedule = employee.workSchedule && employee.workSchedule[dayName];
  return { isWorkDay: !!isWorkDay, schedule, dayName };
};

const calculateTimeDifferences = (timeIn, timeOut, schedule, employee) => {
  if (!timeIn || !timeOut || !schedule) {
    return { hoursWorked: 0, lateMinutes: 0, overtimeMinutes: 0 };
  }
  
  const hoursWorked = (timeOut - timeIn) / (1000 * 60 * 60);
  
  try {
    const timeInDate = new Date(timeIn);
    const timeOutDate = new Date(timeOut);
    
    const [scheduledStartHour, scheduledStartMinute] = schedule.start.split(':').map(Number);
    const [scheduledEndHour, scheduledEndMinute] = schedule.end.split(':').map(Number);
    
    const scheduledStart = new Date(timeInDate);
    scheduledStart.setHours(scheduledStartHour, scheduledStartMinute, 0, 0);
    
    const scheduledEnd = new Date(timeOutDate);
    scheduledEnd.setHours(scheduledEndHour, scheduledEndMinute, 0, 0);
    
    let lateMinutes = 0;
    if (timeInDate > scheduledStart) {
      lateMinutes = Math.max(0, (timeInDate - scheduledStart) / (1000 * 60));
    }
    
    let overtimeMinutes = 0;
    if (timeOutDate > scheduledEnd) {
      overtimeMinutes = Math.max(0, (timeOutDate - scheduledEnd) / (1000 * 60));
    }
    
    return {
      hoursWorked: parseFloat(hoursWorked.toFixed(2)),
      lateMinutes: Math.round(lateMinutes),
      overtimeMinutes: Math.round(overtimeMinutes)
    };
  } catch (error) {
    console.error('Error calculating time differences:', error);
    return {
      hoursWorked: parseFloat(hoursWorked.toFixed(2)),
      lateMinutes: 0,
      overtimeMinutes: 0
    };
  }
};

const determineAttendanceStatus = (timeIn, timeOut, isWorkDay, lateMinutes, hoursWorked) => {
  if (!isWorkDay) return 'No Work';
  if (!timeIn) return 'Absent';
  if (timeIn && !timeOut) {
    return lateMinutes > 30 ? 'Late' : 'Present';
  }
  if (timeOut) {
    if (hoursWorked < 4) return 'Half-day';
    if (lateMinutes > 30) return 'Late';
    return 'Completed';
  }
  return 'Present';
};

// Enhanced RFID Scan Endpoint
router.post('/scan', async (req, res) => {
  try {
    console.log('=== RFID Scan Request ===');
    console.log('Body:', req.body);
    
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ 
        message: 'ERROR:NO_UID',
        displayMessage: 'ERROR:NO_UID:Scan_Again'
      });
    }

    const cleanUid = uid.replace(/\s/g, '').toUpperCase();
    
    if (!validateRfidUid(cleanUid)) {
      return res.status(400).json({ 
        message: 'ERROR:INVALID_UID',
        displayMessage: 'ERROR:INVALID_UID:Check_Card'
      });
    }

    const formattedUid = formatRfidUid(cleanUid);
    
    // Find employee with this RFID UID
    const employee = await Employee.findOne({ 
      rfidUid: formattedUid,
      status: 'Active'
    });

    if (!employee) {
      // Check if this UID exists but assigned to archived/inactive employee
      const inactiveEmployee = await Employee.findOne({ 
        rfidUid: formattedUid,
        status: 'Archived'
      });
      
      if (inactiveEmployee) {
        return res.json({ 
          message: 'ERROR:EMPLOYEE_INACTIVE',
          displayMessage: 'ERROR:EMPLOYEE_INACTIVE:Card_Archived'
        });
      }
      
      return res.json({ 
        message: 'ERROR:NO_ASSIGNED_UID',
        displayMessage: 'ERROR:NO_ASSIGNED_UID:See_Admin',
        uid: formattedUid
      });
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    // Get work schedule for today
    const { isWorkDay, schedule, dayName } = getWorkScheduleForDay(employee, today);

    // Find existing attendance record for today
    let attendance = await Attendance.findOne({
      employeeId: employee.employeeId,
      date: today
    });

    let actionType = 'IN';
    let responseMessage = '';

    if (!attendance) {
      // Create new attendance record for Time In
      console.log('Recording Time In for:', employee.employeeId);
      
      let lateMinutes = 0;
      if (isWorkDay && schedule && schedule.start) {
        try {
          const [scheduledHour, scheduledMinute] = schedule.start.split(':').map(Number);
          const scheduledTime = new Date(today);
          scheduledTime.setHours(scheduledHour, scheduledMinute, 0, 0);
          
          if (now > scheduledTime) {
            lateMinutes = Math.round((now - scheduledTime) / (1000 * 60));
          }
        } catch (error) {
          console.error('Error calculating late minutes:', error);
        }
      }

      const status = isWorkDay ? (lateMinutes > 30 ? 'Late' : 'Present') : 'No Work';
      
      attendance = new Attendance({
        employeeId: employee.employeeId,
        date: today,
        timeIn: now,
        rfidUid: formattedUid,
        status: status,
        isWorkDay: isWorkDay,
        lateMinutes: lateMinutes,
        notes: !isWorkDay ? `Scanned on non-work day (${dayName})` : ''
      });

      await attendance.save();
      
      // Log attendance activity
      await ActivityLog.create({
        action: 'ATTENDANCE_RECORDED',
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        details: {
          type: 'TIME_IN',
          time: now,
          status: status,
          lateMinutes: lateMinutes,
          rfidUid: formattedUid
        },
        timestamp: new Date()
      });
      
      responseMessage = 'SUCCESS:CHECKIN';
      actionType = 'IN';

    } else if (attendance.timeIn && !attendance.timeOut) {
      // Record Time Out
      console.log('Recording Time Out for:', employee.employeeId);
      
      attendance.timeOut = now;
      actionType = 'OUT';
      
      // Calculate hours worked and overtime
      let timeData = { hoursWorked: 0, lateMinutes: attendance.lateMinutes || 0, overtimeMinutes: 0 };
      
      if (isWorkDay && schedule) {
        timeData = calculateTimeDifferences(attendance.timeIn, now, schedule, employee);
      } else {
        timeData.hoursWorked = parseFloat(((now - attendance.timeIn) / (1000 * 60 * 60)).toFixed(2));
      }
      
      attendance.hoursWorked = timeData.hoursWorked;
      attendance.overtimeMinutes = timeData.overtimeMinutes;
      attendance.status = determineAttendanceStatus(
        attendance.timeIn, 
        now, 
        isWorkDay, 
        attendance.lateMinutes,
        attendance.hoursWorked
      );

      await attendance.save();
      
      // Log attendance completion
      await ActivityLog.create({
        action: 'ATTENDANCE_RECORDED',
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        details: {
          type: 'TIME_OUT',
          time: now,
          status: attendance.status,
          hoursWorked: attendance.hoursWorked,
          overtimeMinutes: attendance.overtimeMinutes,
          rfidUid: formattedUid
        },
        timestamp: new Date()
      });
      
      responseMessage = 'SUCCESS:CHECKOUT';

    } else {
      // Already completed for today
      return res.json({
        message: 'INFO:ALREADY_DONE',
        displayMessage: 'INFO:ALREADY_DONE:Attendance_Complete',
        name: `${employee.firstName} ${employee.lastName}`,
        rfid: formattedUid,
        status: attendance.status,
        timeIn: attendance.timeIn ? new Date(attendance.timeIn).toLocaleTimeString() : null,
        timeOut: attendance.timeOut ? new Date(attendance.timeOut).toLocaleTimeString() : null,
        action: 'INFO'
      });
    }

    const employeeName = `${employee.firstName} ${employee.lastName}`.replace(/\s+/g, '_');
    const displayMessage = `${responseMessage}:${employeeName}:${actionType}`;
    
    return res.json({
      message: responseMessage,
      displayMessage: displayMessage,
      name: employeeName.replace(/_/g, ' '),
      rfid: formattedUid,
      type: actionType,
      time: now.toLocaleTimeString(),
      status: attendance.status,
      isWorkDay: isWorkDay,
      hoursWorked: attendance.hoursWorked,
      lateMinutes: attendance.lateMinutes,
      overtimeMinutes: attendance.overtimeMinutes,
      employeeId: employee.employeeId
    });

  } catch (error) {
    console.error('RFID Scan Error:', error);
    
    // Log system error
    await ActivityLog.create({
      action: 'SYSTEM_ERROR',
      employeeId: 'SYSTEM',
      employeeName: 'System',
      details: {
        error: error.message,
        endpoint: 'rfid/scan',
        timestamp: new Date()
      },
      timestamp: new Date()
    });
    
    return res.status(500).json({ 
      message: 'ERROR:PROCESSING',
      displayMessage: 'ERROR:PROCESSING:Try_Again',
      error: error.message
    });
  }
});

// Enhanced RFID Assignment with UID Scanning
router.post('/assign-with-scan', async (req, res) => {
  try {
    const { employeeId, rfidUid, confirm } = req.body;
    
    if (!employeeId || !rfidUid) {
      return res.status(400).json({ message: 'Employee ID and RFID UID are required' });
    }

    const cleanUid = rfidUid.replace(/\s/g, '').toUpperCase();
    
    if (!validateRfidUid(cleanUid)) {
      return res.status(400).json({ message: 'Invalid RFID UID format' });
    }

    const formattedUid = formatRfidUid(cleanUid);

    // Check if RFID is already assigned to another active employee
    const existingAssignment = await Employee.findOne({ 
      rfidUid: formattedUid,
      employeeId: { $ne: employeeId },
      status: 'Active'
    });

    if (existingAssignment && !confirm) {
      return res.status(400).json({ 
        message: 'RFID_ALREADY_ASSIGNED',
        assignedTo: `${existingAssignment.firstName} ${existingAssignment.lastName}`,
        requiresConfirmation: true
      });
    }

    // If confirming reassignment, remove from previous employee
    if (confirm && existingAssignment) {
      // Create activity log for removal
      await ActivityLog.create({
        action: 'RFID_REMOVED_FOR_REASSIGNMENT',
        employeeId: existingAssignment.employeeId,
        employeeName: `${existingAssignment.firstName} ${existingAssignment.lastName}`,
        details: {
          rfidUid: formattedUid,
          reassignedTo: employeeId,
          reason: 'Reassigned to another employee'
        },
        timestamp: new Date()
      });

      // Remove from previous employee
      await Employee.findOneAndUpdate(
        { employeeId: existingAssignment.employeeId },
        { 
          rfidUid: null,
          isRfidAssigned: false
        }
      );
    }

    // Assign to new employee
    const employee = await Employee.findOneAndUpdate(
      { employeeId: employeeId },
      { 
        rfidUid: formattedUid,
        isRfidAssigned: true
      },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Create activity log for assignment
    await ActivityLog.create({
      action: 'RFID_ASSIGNED',
      employeeId: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      details: {
        rfidUid: formattedUid,
        assignmentDate: new Date()
      },
      timestamp: new Date()
    });

    console.log('RFID assigned successfully to:', employee.employeeId);

    res.json({
      message: 'RFID assigned successfully',
      employee: {
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        rfidUid: employee.rfidUid,
        department: employee.department
      }
    });

  } catch (error) {
    console.error('RFID Assignment Error:', error);
    res.status(500).json({ message: 'Error assigning RFID: ' + error.message });
  }
});

// Remove RFID with Reason
router.delete('/assign/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { reason, otherReason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: 'Removal reason is required' });
    }

    const validReasons = ['ID_MISSING', 'CARD_DAMAGED', 'EMPLOYEE_TERMINATED', 'SECURITY_ISSUE', 'OTHER'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ message: 'Invalid removal reason' });
    }

    const employee = await Employee.findOne({ employeeId: employeeId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const rfidUid = employee.rfidUid;

    // Remove RFID assignment
    const updatedEmployee = await Employee.findOneAndUpdate(
      { employeeId: employeeId },
      { 
        rfidUid: null,
        isRfidAssigned: false
      },
      { new: true }
    );

    // Create activity log with reason
    const activityLog = await ActivityLog.create({
      action: 'RFID_REMOVED',
      employeeId: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      details: {
        rfidUid: rfidUid,
        reason: reason,
        otherReason: otherReason || '',
        removalDate: new Date()
      },
      timestamp: new Date()
    });

    console.log('RFID assignment removed from:', employeeId);

    res.json({ 
      message: 'RFID assignment removed successfully',
      logId: activityLog._id
    });

  } catch (error) {
    console.error('Remove RFID Assignment Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get Activity Logs
router.get('/activity-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, action, employeeId, startDate, endDate } = req.query;
    
    let query = {};
    if (action) query.action = action;
    if (employeeId) query.employeeId = employeeId;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await ActivityLog.countDocuments(query);
    
    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('Activity logs fetch error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get Monthly Summary starting from RFID assignment date
router.get('/attendance/monthly-summary/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ message: 'Year and month are required' });
    }

    // Get employee to find RFID assignment date
    const employee = await Employee.findOne({ employeeId: employeeId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    
    // Only fetch attendance from the date RFID was assigned (if available)
    let attendanceQuery = {
      employeeId: employeeId,
      date: { $gte: startDate, $lte: endDate }
    };

    // If employee has RFID assignment history, get the assignment date
    const assignmentLog = await ActivityLog.findOne({
      employeeId: employeeId,
      action: 'RFID_ASSIGNED'
    }).sort({ timestamp: 1 }); // Get first assignment

    if (assignmentLog) {
      const assignmentDate = new Date(assignmentLog.timestamp);
      assignmentDate.setHours(0, 0, 0, 0);
      // Only count attendance from assignment date onward
      if (assignmentDate > startDate) {
        attendanceQuery.date.$gte = assignmentDate;
      }
    }

    const attendance = await Attendance.find(attendanceQuery);
    
    // Calculate work days for the month
    const totalWorkDays = await calculateWorkDaysForMonth(employee, startDate, endDate, assignmentLog);
    
    // Calculate monthly summary
    const presentDays = attendance.filter(a => 
      a.status === 'Present' || a.status === 'Completed' || a.status === 'Late'
    ).length;
    
    const summary = {
      year: parseInt(year),
      month: parseInt(month),
      totalDays: endDate.getDate(),
      totalWorkDays: totalWorkDays,
      presentDays: presentDays,
      absentDays: totalWorkDays - presentDays,
      lateDays: attendance.filter(a => a.status === 'Late').length,
      halfDays: attendance.filter(a => a.status === 'Half-day').length,
      totalHours: attendance.reduce((sum, a) => sum + (a.hoursWorked || 0), 0),
      averageHours: presentDays > 0 ? (attendance.reduce((sum, a) => sum + (a.hoursWorked || 0), 0) / presentDays).toFixed(2) : 0,
      rfidAssignedDate: assignmentLog ? assignmentLog.timestamp : null,
      attendanceRecords: attendance.length
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Monthly summary error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Helper function to calculate work days for a month
const calculateWorkDaysForMonth = async (employee, startDate, endDate, assignmentLog) => {
  let workDays = 0;
  const currentDate = new Date(startDate);
  const assignmentDate = assignmentLog ? new Date(assignmentLog.timestamp) : null;

  while (currentDate <= endDate) {
    // Skip days before RFID assignment
    if (assignmentDate && currentDate < assignmentDate) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    if (employee.workDays && employee.workDays[dayName]) {
      workDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workDays;
};

// Get Today's Attendance Summary
router.get('/summary/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get all attendance records for today from EMS_Attendance collection
    const todayAttendance = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    // Get all active employees
    const activeEmployees = await Employee.find({ status: 'Active' });
    const totalEmployees = activeEmployees.length;
    
    // Calculate summary statistics
    let present = 0;
    let absent = 0;
    let completed = 0;
    let late = 0;
    let halfDay = 0;
    let noWork = 0;
    
    // Count from attendance records
    todayAttendance.forEach(record => {
      switch (record.status) {
        case 'Present':
          present++;
          break;
        case 'Late':
          present++;
          late++;
          break;
        case 'Completed':
          present++;
          completed++;
          break;
        case 'Half-day':
          present++;
          halfDay++;
          break;
        case 'No Work':
          noWork++;
          break;
        case 'Absent':
          absent++;
          break;
      }
    });
    
    // Calculate employees who haven't scanned in (true absent)
    const employeesWithAttendance = todayAttendance.map(record => record.employeeId);
    const employeesWithoutAttendance = activeEmployees.filter(emp => 
      !employeesWithAttendance.includes(emp.employeeId)
    );
    
    // For employees without attendance records, check if they should be working today
    let shouldBeWorking = 0;
    employeesWithoutAttendance.forEach(employee => {
      const { isWorkDay } = getWorkScheduleForDay(employee, today);
      if (isWorkDay) {
        shouldBeWorking++;
      }
    });
    
    const actualAbsent = shouldBeWorking;

    res.json({
      summary: {
        present: present,
        absent: actualAbsent,
        completed: completed,
        late: late,
        halfDay: halfDay,
        noWork: noWork,
        totalEmployees: totalEmployees,
        scannedToday: todayAttendance.length,
        pendingScan: actualAbsent
      },
      breakdown: {
        byStatus: {
          present: present,
          late: late,
          completed: completed,
          halfDay: halfDay,
          absent: actualAbsent,
          noWork: noWork
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Today summary error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get Attendance Records from EMS_Attendance collection
router.get('/attendance', async (req, res) => {
  try {
    const { startDate, endDate, employeeId, department, page = 1, limit = 100 } = req.query;
    
    let query = {};
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    
    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (department) {
      const employees = await Employee.find({ department: new RegExp(department, 'i') });
      const employeeIds = employees.map(emp => emp.employeeId);
      query.employeeId = { $in: employeeIds };
    }

    const attendance = await Attendance.find(query)
      .sort({ date: -1, timeIn: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Attendance.countDocuments(query);
    
    res.json({
      attendance,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('Attendance fetch error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get Today's Attendance
router.get('/attendance/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const attendance = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ timeIn: -1 });
    
    res.json(attendance);

  } catch (error) {
    console.error('Today\'s attendance fetch error:', error);
    res.status(500).json({ message: error.message });
  }
});

// RFID System Status
router.get('/status', async (req, res) => {
  try {
    const employeesWithRfid = await Employee.countDocuments({ 
      isRfidAssigned: true,
      status: 'Active'
    });
    
    const totalEmployees = await Employee.countDocuments({ status: 'Active' });
    
    // Get today's scan count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayScans = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow }
    });
    
    res.json({
      rfidAssigned: employeesWithRfid,
      totalEmployees: totalEmployees,
      assignmentRate: totalEmployees > 0 ? ((employeesWithRfid / totalEmployees) * 100).toFixed(1) : 0,
      todayScans: todayScans,
      status: 'Operational',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('RFID status error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
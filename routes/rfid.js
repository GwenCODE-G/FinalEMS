const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

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
    console.log('Received UID:', req.body.uid);
    
    const { uid } = req.body;
    
    if (!uid) {
      console.log('ERROR: No UID provided');
      return res.status(400).json({ 
        message: 'ERROR:NO_UID',
        displayMessage: 'ERROR:NO_UID:Scan_Again'
      });
    }

    const cleanUid = uid.replace(/\s/g, '').toUpperCase();
    console.log('Cleaned UID:', cleanUid);

    if (!validateRfidUid(cleanUid)) {
      console.log('ERROR: Invalid UID format');
      return res.status(400).json({ 
        message: 'ERROR:INVALID_UID',
        displayMessage: 'ERROR:INVALID_UID:Check_Card'
      });
    }

    const formattedUid = formatRfidUid(cleanUid);
    console.log('Formatted UID for lookup:', formattedUid);
    
    // Find employee with this RFID UID
    const employee = await Employee.findOne({ 
      rfidUid: formattedUid,
      status: 'Active'
    });

    if (!employee) {
      console.log('ERROR: No employee found with UID:', formattedUid);
      return res.json({ 
        message: 'ERROR:NO_ASSIGNED_UID',
        displayMessage: 'ERROR:NO_ASSIGNED_UID:See_Admin',
        uid: formattedUid
      });
    }

    console.log('Employee found:', {
      name: `${employee.firstName} ${employee.lastName}`,
      employeeId: employee.employeeId,
      department: employee.department
    });

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const { isWorkDay, schedule, dayName } = getWorkScheduleForDay(employee, today);
    console.log('Schedule check:', { dayName, isWorkDay, schedule });

    // Find existing attendance record for today
    let attendance = await Attendance.findOne({
      employeeId: employee.employeeId,
      date: today
    });

    let actionType = 'IN';
    let responseMessage = '';

    if (!attendance) {
      console.log('Recording Time In for employee:', employee.employeeId);
      
      let lateMinutes = 0;
      if (isWorkDay && schedule && schedule.start) {
        try {
          const [scheduledHour, scheduledMinute] = schedule.start.split(':').map(Number);
          const scheduledTime = new Date(today);
          scheduledTime.setHours(scheduledHour, scheduledMinute, 0, 0);
          
          if (now > scheduledTime) {
            lateMinutes = Math.round((now - scheduledTime) / (1000 * 60));
            console.log(`Employee is late by ${lateMinutes} minutes`);
          }
        } catch (error) {
          console.error('Error calculating late minutes:', error);
        }
      }

      const status = determineAttendanceStatus(now, null, isWorkDay, lateMinutes, 0);
      const notes = !isWorkDay ? `Scanned on non-work day (${dayName})` : '';
      
      attendance = new Attendance({
        employeeId: employee.employeeId,
        date: today,
        timeIn: now,
        rfidUid: formattedUid,
        status: status,
        isWorkDay: isWorkDay,
        lateMinutes: lateMinutes,
        notes: notes
      });

      await attendance.save();
      console.log('Time In recorded successfully. Status:', attendance.status);
      responseMessage = 'SUCCESS:CHECKIN';
      actionType = 'IN';

    } else if (attendance.timeIn && !attendance.timeOut) {
      console.log('Recording Time Out for employee:', employee.employeeId);
      
      attendance.timeOut = now;
      actionType = 'OUT';
      
      let timeData = { hoursWorked: 0, lateMinutes: attendance.lateMinutes || 0, overtimeMinutes: 0 };
      if (isWorkDay && schedule) {
        timeData = calculateTimeDifferences(attendance.timeIn, now, schedule, employee);
      } else {
        timeData.hoursWorked = parseFloat(((now - attendance.timeIn) / (1000 * 60 * 60)).toFixed(2));
      }
      
      attendance.hoursWorked = timeData.hoursWorked;
      attendance.lateMinutes = timeData.lateMinutes;
      attendance.overtimeMinutes = timeData.overtimeMinutes;
      
      attendance.status = determineAttendanceStatus(
        attendance.timeIn, 
        now, 
        isWorkDay, 
        attendance.lateMinutes,
        attendance.hoursWorked
      );

      await attendance.save();
      console.log('Time Out recorded successfully:', {
        hoursWorked: attendance.hoursWorked,
        status: attendance.status,
        overtime: attendance.overtimeMinutes,
        late: attendance.lateMinutes
      });

      responseMessage = 'SUCCESS:CHECKOUT';

    } else {
      console.log('Attendance already completed for today');
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
    
    console.log('Sending success response:', {
      message: responseMessage,
      displayMessage: displayMessage,
      name: employeeName.replace(/_/g, ' '),
      action: actionType
    });
    
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
    return res.status(500).json({ 
      message: 'ERROR:PROCESSING',
      displayMessage: 'ERROR:PROCESSING:Try_Again',
      error: error.message
    });
  }
});

// RFID Assignment Endpoint
router.post('/assign', async (req, res) => {
  try {
    console.log('RFID Assignment Request:', req.body);
    const { employeeId, rfidUid } = req.body;

    if (!employeeId || !rfidUid) {
      return res.status(400).json({ message: 'Employee ID and RFID UID are required' });
    }

    const cleanUid = rfidUid.replace(/\s/g, '').toUpperCase();
    
    if (!validateRfidUid(cleanUid)) {
      return res.status(400).json({ message: 'Invalid RFID UID format' });
    }

    const formattedUid = formatRfidUid(cleanUid);

    // Check if RFID is already assigned to another employee
    const existingAssignment = await Employee.findOne({ 
      rfidUid: formattedUid,
      employeeId: { $ne: employeeId }
    });

    if (existingAssignment) {
      return res.status(400).json({ 
        message: `RFID already assigned to ${existingAssignment.firstName} ${existingAssignment.lastName}` 
      });
    }

    // Assign RFID to employee
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

// Remove RFID Assignment
router.delete('/assign/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const employee = await Employee.findOneAndUpdate(
      { employeeId: employeeId },
      { 
        rfidUid: null,
        isRfidAssigned: false
      },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    console.log('RFID assignment removed from:', employeeId);

    res.json({ message: 'RFID assignment removed successfully' });

  } catch (error) {
    console.error('Remove RFID Assignment Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get Attendance Records
router.get('/attendance', async (req, res) => {
  try {
    const { startDate, endDate, employeeId, department } = req.query;
    
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
      .limit(1000);
    
    res.json(attendance);

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

// Manual Attendance Entry
router.post('/attendance', async (req, res) => {
  try {
    const { employeeId, date, timeIn, timeOut, rfidUid, status } = req.body;
    
    let attendance = await Attendance.findOne({
      employeeId: employeeId,
      date: new Date(date)
    });

    if (attendance) {
      if (timeIn) attendance.timeIn = new Date(`${date}T${timeIn}`);
      if (timeOut) attendance.timeOut = new Date(`${date}T${timeOut}`);
      if (status) attendance.status = status;
      
      await attendance.save();
    } else {
      attendance = new Attendance({
        employeeId,
        date: new Date(date),
        timeIn: timeIn ? new Date(`${date}T${timeIn}`) : null,
        timeOut: timeOut ? new Date(`${date}T${timeOut}`) : null,
        rfidUid: rfidUid || 'MANUAL',
        status: status || 'Present'
      });
      
      await attendance.save();
    }

    res.json({ message: 'Attendance record saved successfully', attendance });
  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update Attendance Record
router.put('/attendance/:id', async (req, res) => {
  try {
    const { timeIn, timeOut, status } = req.body;
    
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    if (timeIn) attendance.timeIn = new Date(timeIn);
    if (timeOut) attendance.timeOut = new Date(timeOut);
    if (status) attendance.status = status;

    await attendance.save();
    res.json({ message: 'Attendance record updated successfully', attendance });
  } catch (error) {
    console.error('Update attendance error:', error);
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
    
    res.json({
      rfidAssigned: employeesWithRfid,
      totalEmployees: totalEmployees,
      assignmentRate: totalEmployees > 0 ? ((employeesWithRfid / totalEmployees) * 100).toFixed(1) : 0,
      status: 'Operational',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('RFID status error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
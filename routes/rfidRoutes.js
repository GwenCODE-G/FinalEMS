const express = require('express');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const UID = require('../models/UID');

const router = express.Router();

// Helper function to normalize RFID UID (remove spaces, uppercase)
const normalizeUid = (uid) => {
  if (!uid) return '';
  return uid.toString().replace(/\s/g, '').toUpperCase();
};

// Helper function to format UID for display (add spaces every 2 chars)
const formatUidForDisplay = (uid) => {
  if (!uid) return '';
  const cleanUid = normalizeUid(uid);
  return cleanUid.match(/.{1,2}/g)?.join(' ').toUpperCase() || cleanUid;
};

// RFID Scan for Attendance
router.post('/scan', async (req, res) => {
  try {
    const { uid, device = 'RFID-Reader', timestamp } = req.body;
    const io = req.app.get('io');
    
    console.log('=== RFID SCAN START ===');
    console.log('RFID Scan Received:', { 
      uid, 
      device, 
      timestamp: new Date().toISOString() 
    });

    if (!uid) {
      console.log('No UID provided in request');
      return res.status(200).json({
        success: false,
        message: 'No UID provided',
        displayMessage: 'NO CARD DETECTED'
      });
    }

    // Normalize the incoming UID for matching
    const normalizedUid = normalizeUid(uid);
    const displayUid = formatUidForDisplay(uid);
    
    console.log('Normalized UID:', normalizedUid);
    console.log('Display UID:', displayUid);
    console.log('Searching for employee with this UID...');

    // Find employee with this UID - searching by normalized UID
    let employee = await Employee.findOne({ 
      rfidUid: normalizedUid,
      status: 'Active'
    }).select('employeeId firstName lastName rfidUid department position');

    if (!employee) {
      console.log('No employee found for UID:', normalizedUid);
      
      // Debug: Show all assigned UIDs
      const allEmployeesWithRFID = await Employee.find({ 
        status: 'Active',
        rfidUid: { $exists: true, $ne: null }
      }).select('employeeId firstName lastName rfidUid');

      console.log('Available UIDs in database:');
      allEmployeesWithRFID.forEach(emp => {
        console.log(`  - ${emp.rfidUid} (${emp.firstName} ${emp.lastName})`);
      });
      
      return res.status(200).json({
        success: false,
        message: 'RFID card not assigned to any active employee',
        displayMessage: 'CARD NOT ASSIGNED',
        scannedUid: normalizedUid,
        availableUids: allEmployeesWithRFID.map(emp => ({
          employeeId: emp.employeeId,
          name: `${emp.firstName} ${emp.lastName}`,
          rfidUid: emp.rfidUid
        }))
      });
    }

    console.log('Employee found:', {
      name: `${employee.firstName} ${employee.lastName}`,
      employeeId: employee.employeeId,
      department: employee.department,
      storedRfidUid: employee.rfidUid
    });

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // Find today's attendance record
    let attendance = await Attendance.findOne({
      employeeId: employee.employeeId,
      date: today
    });

    let responseData;

    if (!attendance) {
      // First scan of the day - Time In
      const workStartTime = new Date();
      workStartTime.setHours(8, 0, 0, 0); // Work starts at 8:00 AM
      
      let status = 'Present';
      let lateMinutes = 0;

      // Check if late
      if (now > workStartTime) {
        status = 'Late';
        lateMinutes = Math.round((now - workStartTime) / (1000 * 60));
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
      // Time Out - Check if at least 10 seconds have passed since time in
      const timeIn = new Date(attendance.timeIn);
      const timeDifference = (now - timeIn) / 1000; // in seconds
      
      if (timeDifference < 10) {
        return res.status(200).json({
          success: false,
          message: 'Please wait at least 10 seconds between time in and time out',
          displayMessage: 'WAIT 10 SECONDS'
        });
      }

      attendance.timeOut = now;
      attendance.status = 'Completed';
      
      // Calculate hours worked
      const hoursWorked = (now - timeIn) / (1000 * 60 * 60);
      attendance.hoursWorked = parseFloat(hoursWorked.toFixed(2));
      
      // Calculate overtime (work ends at 5:00 PM)
      const workEndTime = new Date(timeIn);
      workEndTime.setHours(17, 0, 0, 0); // 5:00 PM
      
      if (now > workEndTime) {
        const overtimeMinutes = (now - workEndTime) / (1000 * 60);
        attendance.overtimeMinutes = Math.round(overtimeMinutes);
      }
      
      await attendance.save();

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
      // Already completed for today
      responseData = {
        success: true,
        message: 'Attendance already completed for today',
        displayMessage: 'INFO:ALREADY_DONE',
        type: 'already_done',
        name: `${employee.firstName} ${employee.lastName}`,
        employeeId: employee.employeeId,
        lastAction: attendance.timeOut ? 'Time Out' : 'Time In'
      };

      console.log('Attendance already completed for:', employee.employeeId);
    }

    // Emit real-time update to all connected clients
    if (io) {
      io.emit('attendance-update', {
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        type: responseData.type,
        time: now,
        status: attendance.status,
        hoursWorked: attendance?.hoursWorked || 0,
        timestamp: now
      });

      console.log('Real-time update emitted for:', employee.employeeId);
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
router.post('/assign', async (req, res) => {
  try {
    const { employeeId, rfidUid } = req.body;
    const io = req.app.get('io');

    if (!employeeId || !rfidUid) {
      return res.status(200).json({
        success: false,
        message: 'Employee ID and RFID UID are required'
      });
    }

    // Normalize the RFID UID for storage (consistent format)
    const normalizedUid = normalizeUid(rfidUid);
    const formattedUid = formatUidForDisplay(rfidUid);

    console.log('=== RFID ASSIGNMENT START ===');
    console.log('RFID Assignment Request:', { 
      employeeId, 
      originalUid: rfidUid,
      normalizedUid: normalizedUid,
      formattedUid: formattedUid 
    });

    // Check if RFID is already assigned to another employee
    const existingAssignment = await Employee.findOne({
      rfidUid: normalizedUid,
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

    // Update employee with RFID - store in NORMALIZED format for consistent matching
    const employee = await Employee.findOneAndUpdate(
      { employeeId: employeeId },
      { 
        rfidUid: normalizedUid, // Store normalized (no spaces) for matching
        isRfidAssigned: true
      },
      { new: true, runValidators: true }
    );

    if (!employee) {
      console.log('Employee not found:', employeeId);
      return res.status(200).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Save to UID collection (for reference/display)
    const uidRecord = new UID({
      uid: formattedUid, // Store formatted for display
      normalizedUid: normalizedUid,
      employeeId: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      department: employee.department,
      position: employee.position,
      assignedAt: new Date()
    });

    await uidRecord.save();

    // Emit real-time update
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
    console.log('Stored UID (normalized):', normalizedUid);
    console.log('Display UID (formatted):', formattedUid);
    console.log('=== RFID ASSIGNMENT END ===');

    res.status(200).json({
      success: true,
      message: 'RFID assigned successfully',
      data: {
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        rfidUid: formattedUid,
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
    console.log('Removing RFID from employee:', employeeId);

    const employee = await Employee.findOne({ employeeId: employeeId });
    
    if (!employee) {
      return res.status(200).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const removedRfid = employee.rfidUid;

    // Update employee
    await Employee.findOneAndUpdate(
      { employeeId: employeeId },
      { 
        rfidUid: null,
        isRfidAssigned: false
      }
    );

    // Remove from UID collection
    await UID.findOneAndDelete({ employeeId: employeeId });

    // Emit real-time update
    if (io) {
      io.emit('rfid-removed', {
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        removedRfid: removedRfid,
        removedAt: new Date()
      });
    }

    console.log('RFID removed from:', employee.employeeId);
    console.log('=== RFID REMOVAL END ===');

    res.status(200).json({
      success: true,
      message: 'RFID assignment removed successfully',
      data: {
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        removedRfid: removedRfid
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

// Debug endpoint to check RFID assignments
router.get('/debug/rfid-assignments', async (req, res) => {
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
      rfidUidFormatted: formatUidForDisplay(emp.rfidUid),
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

// Test UID matching endpoint
router.post('/test-uid-match', async (req, res) => {
  try {
    const { uid } = req.body;
    const normalizedUid = normalizeUid(uid);
    
    const employee = await Employee.findOne({
      rfidUid: normalizedUid,
      status: 'Active'
    });
    
    res.status(200).json({
      success: true,
      data: {
        inputUid: uid,
        normalizedUid: normalizedUid,
        formattedUid: formatUidForDisplay(uid),
        employeeFound: !!employee,
        employee: employee ? {
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          storedRfidUid: employee.rfidUid,
          storedRfidUidFormatted: formatUidForDisplay(employee.rfidUid)
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
router.get('/attendance/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const attendance = await Attendance.find({ date: today })
      .sort({ timeIn: -1 });

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

// Get Attendance by Date Range
router.get('/attendance', async (req, res) => {
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
router.get('/summary/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const totalEmployees = await Employee.countDocuments({ status: 'Active' });
    const todayAttendance = await Attendance.find({ date: today });
    
    const present = todayAttendance.filter(a => a.timeIn).length;
    const absent = totalEmployees - present;
    const completed = todayAttendance.filter(a => a.timeOut).length;
    const late = todayAttendance.filter(a => a.status === 'Late').length;

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

// Get Monthly Summary
router.get('/summary/monthly', async (req, res) => {
  try {
    const { employeeId, year, month } = req.query;
    
    if (!employeeId || !year || !month) {
      return res.status(200).json({
        success: false,
        message: 'Employee ID, year, and month are required'
      });
    }

    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const employee = await Employee.findOne({ employeeId: employeeId });
    if (!employee) {
      return res.status(200).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const attendance = await Attendance.find({
      employeeId: employeeId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    const presentDays = attendance.filter(a => a.timeIn).length;
    const totalHours = attendance.reduce((sum, a) => sum + (a.hoursWorked || 0), 0);
    const lateDays = attendance.filter(a => a.status === 'Late').length;
    const totalWorkDays = new Date(year, month, 0).getDate();

    res.status(200).json({
      success: true,
      data: {
        presentDays,
        absentDays: totalWorkDays - presentDays,
        totalHours: Math.round(totalHours * 10) / 10,
        lateDays,
        totalWorkDays,
        averageHours: presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0,
        employee: {
          name: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          position: employee.position
        },
        period: {
          month: parseInt(month),
          year: parseInt(year),
          monthName: new Date(year, month - 1).toLocaleDateString('en', { month: 'long' })
        }
      }
    });

  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(200).json({
      success: false,
      message: 'Error fetching monthly summary'
    });
  }
});

// RFID Status Check
router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      isConnected: true,
      status: 'RFID System Active',
      timestamp: new Date().toISOString(),
      version: '2.1'
    }
  });
});

// Get All Assigned RFID Cards
router.get('/assigned', async (req, res) => {
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

// Test RFID Connection
router.get('/test', async (req, res) => {
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
        timestamp: new Date().toISOString()
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
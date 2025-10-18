const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// ==================== PHILIPPINE TIME HELPER FUNCTIONS ====================

// Get current Philippine DateTime
const getCurrentDateTime = () => {
  return moment().tz('Asia/Manila').toDate();
};

// Get current Philippine Date string (YYYY-MM-DD)
const getCurrentDate = () => {
  return moment().tz('Asia/Manila').format('YYYY-MM-DD');
};

// Parse time string to PH DateTime (for manual entries)
const parsePHDateTime = (dateStr, timeStr) => {
  // Combine date and time, then parse in Manila timezone
  const dateTimeStr = `${dateStr} ${timeStr}`;
  return moment.tz(dateTimeStr, 'YYYY-MM-DD HH:mm:ss', 'Asia/Manila').toDate();
};

// Format time for display (already in PH time)
const formatTime = (date) => {
  if (!date) return '';
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
};

// ==================== TIME VALIDATION FUNCTIONS ====================

// Check if time is within Time In hours (6:00 AM - 5:00 PM)
const checkTimeInHours = (currentTime) => {
  const phMoment = moment(currentTime).tz('Asia/Manila');
  const hours = phMoment.hour();
  const minutes = phMoment.minute();
  const totalMinutes = hours * 60 + minutes;
  
  console.log('Manual Time In Check - PH Time:', phMoment.format('h:mm A'));
  
  // STRICT CHECK: Time In only allowed between 6:00 AM - 5:00 PM (360 to 1020 minutes)
  if (totalMinutes >= 360 && totalMinutes < 1020) {
    console.log('Manual Time In ALLOWED');
    return { allowed: true, message: 'TIMEIN_ALLOWED' };
  } else {
    console.log('Manual Time In NOT ALLOWED');
    return { allowed: false, message: 'TIMEIN_NOT_ALLOWED' };
  }
};

// Check if time is within Time Out hours (6:00 AM - 7:00 PM)
const checkTimeOutHours = (currentTime) => {
  const phMoment = moment(currentTime).tz('Asia/Manila');
  const hours = phMoment.hour();
  const minutes = phMoment.minute();
  const totalMinutes = hours * 60 + minutes;
  
  console.log('Manual Time Out Check - PH Time:', phMoment.format('h:mm A'));
  
  // STRICT CHECK: Time Out only allowed between 6:00 AM - 7:00 PM (360 to 1140 minutes)
  if (totalMinutes >= 360 && totalMinutes < 1140) {
    console.log('Manual Time Out ALLOWED');
    return { allowed: true, message: 'TIMEOUT_ALLOWED' };
  } else {
    console.log('Manual Time Out NOT ALLOWED');
    return { allowed: false, message: 'TIMEOUT_NOT_ALLOWED' };
  }
};

// Check if time is within working hours (6:00 AM - 7:00 PM)
const checkWorkingHours = (currentTime) => {
  const phMoment = moment(currentTime).tz('Asia/Manila');
  const hours = phMoment.hour();
  const minutes = phMoment.minute();
  const totalMinutes = hours * 60 + minutes;
  
  // STRICT CHECK: No manual recording outside 6:00 AM - 7:00 PM
  if (totalMinutes >= 360 && totalMinutes < 1140) {
    return { allowed: true, message: 'WITHIN_WORKING_HOURS' };
  } else {
    return { allowed: false, message: 'OUTSIDE_WORKING_HOURS' };
  }
};

// Check if employee is late (after 8:00 AM)
const checkIfLate = (timeIn) => {
  const timeInPH = moment(timeIn);
  const cutoffTime = moment(timeIn).hour(8).minute(0).second(0);
  
  if (timeInPH.isAfter(cutoffTime)) {
    const lateMinutes = timeInPH.diff(cutoffTime, 'minutes');
    return { isLate: true, lateMinutes };
  }
  
  return { isLate: false, lateMinutes: 0 };
};

// ==================== ROUTES ====================

// GET ALL ATTENDANCE RECORDS
router.get('/', async (req, res) => {
    try {
        const { 
            date,
            employeeId,
            department,
            page = 1, 
            limit = 50,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query;
        
        let filter = {};
        
        if (date) {
            filter.date = date;
        }
        
        if (employeeId) {
            filter.employeeId = employeeId;
        }
        
        if (department) {
            filter.department = department;
        }

        const sortConfig = {};
        sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const attendance = await Attendance.find(filter)
            .sort(sortConfig)
            .limit(limitNum)
            .skip(skip)
            .select('-__v');

        const total = await Attendance.countDocuments(filter);

        res.json({
            success: true,
            data: attendance,
            pagination: {
                current: pageNum,
                totalPages: Math.ceil(total / limitNum),
                totalRecords: total,
                limit: limitNum
            },
            phTime: moment().tz('Asia/Manila').format('YYYY-MM-DD hh:mm:ss A')
        });
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching attendance records',
            error: error.message 
        });
    }
});

// GET TODAY'S ATTENDANCE
router.get('/today', async (req, res) => {
    try {
        const today = getCurrentDate();
        
        console.log('Fetching attendance for:', today);
        
        const attendance = await Attendance.find({ date: today })
            .sort({ timeIn: -1 })
            .select('-__v');

        res.json({
            success: true,
            data: attendance,
            count: attendance.length,
            date: today,
            phTime: moment().tz('Asia/Manila').format('YYYY-MM-DD hh:mm:ss A')
        });
    } catch (error) {
        console.error('Error fetching today attendance:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching today attendance',
            error: error.message 
        });
    }
});

// GET ATTENDANCE BY DATE RANGE
router.get('/range', async (req, res) => {
    try {
        const { startDate, endDate, employeeId } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        let filter = {
            date: {
                $gte: startDate,
                $lte: endDate
            }
        };

        if (employeeId) {
            filter.employeeId = employeeId;
        }

        const attendance = await Attendance.find(filter)
            .sort({ date: -1, timeIn: -1 })
            .select('-__v');

        res.json({
            success: true,
            data: attendance,
            count: attendance.length,
            period: { startDate, endDate }
        });
    } catch (error) {
        console.error('Error fetching attendance range:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching attendance records',
            error: error.message 
        });
    }
});

// GET ATTENDANCE SUMMARY
router.get('/summary', async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || getCurrentDate();
        
        const totalEmployees = await Employee.countDocuments({ status: 'Active' });
        const todayAttendance = await Attendance.find({ date: targetDate });
        
        const present = todayAttendance.filter(a => a.timeIn).length;
        const absent = totalEmployees - present;
        const completed = todayAttendance.filter(a => a.timeOut).length;
        const late = todayAttendance.filter(a => a.status === 'Late').length;
        const onTime = present - late;

        res.json({
            success: true,
            data: {
                date: targetDate,
                summary: {
                    present,
                    absent,
                    completed,
                    late,
                    onTime,
                    totalEmployees
                },
                records: todayAttendance
            },
            phTime: moment().tz('Asia/Manila').format('YYYY-MM-DD hh:mm:ss A')
        });
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching attendance summary',
            error: error.message 
        });
    }
});

// MANUAL ATTENDANCE RECORDING - ENHANCED FOR MIXED RFID/MANUAL SUPPORT
router.post('/manual', async (req, res) => {
    try {
        const {
            employeeId,
            date,
            time,
            action,
            notes = ''
        } = req.body;

        if (!employeeId || !date || !time || !action) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID, date, time, and action are required'
            });
        }

        const employee = await Employee.findOne({ employeeId: employeeId });
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        let attendance = await Attendance.findOne({
            employeeId: employeeId,
            date: date
        });

        // Parse the time input (format: HH:mm or HH:mm:ss)
        const timeWithSeconds = time.length === 5 ? `${time}:00` : time;
        const phDateTime = parsePHDateTime(date, timeWithSeconds);

        console.log('===========================================');
        console.log('Manual Attendance Recording');
        console.log('Employee ID:', employeeId);
        console.log('Date:', date);
        console.log('Time Input:', time);
        console.log('PH DateTime:', moment(phDateTime).tz('Asia/Manila').format('YYYY-MM-DD hh:mm:ss A'));
        console.log('Action:', action);
        console.log('===========================================');

        // STRICT CHECK: First check if we're within working hours
        const workingHoursCheck = checkWorkingHours(phDateTime);
        if (!workingHoursCheck.allowed) {
            return res.status(400).json({
                success: false,
                message: 'Manual recording only allowed between 6:00 AM - 7:00 PM (Philippine Time)'
            });
        }

        if (action === 'timein') {
            const timeInCheck = checkTimeInHours(phDateTime);
            
            if (!timeInCheck.allowed) {
                return res.status(400).json({
                    success: false,
                    message: 'Manual time in only allowed between 6:00 AM - 5:00 PM (Philippine Time)'
                });
            }

            if (attendance && attendance.timeIn) {
                return res.status(400).json({
                    success: false,
                    message: 'Time in already recorded for this date'
                });
            }

            // Check if late
            const lateCheck = checkIfLate(phDateTime);

            if (!attendance) {
                attendance = new Attendance({
                    employeeId: employee.employeeId,
                    employeeName: `${employee.firstName} ${employee.lastName}`,
                    department: employee.department,
                    position: employee.position,
                    date: date,
                    timeIn: phDateTime,
                    status: lateCheck.isLate ? 'Late' : 'Present',
                    lateMinutes: lateCheck.lateMinutes,
                    dateEmployed: employee.dateEmployed,
                    recordType: 'manual',
                    recordedBy: 'Admin',
                    timeInSource: 'manual',
                    notes: notes
                });
            } else {
                attendance.timeIn = phDateTime;
                attendance.status = lateCheck.isLate ? 'Late' : 'Present';
                attendance.lateMinutes = lateCheck.lateMinutes;
                attendance.timeInSource = 'manual';
                attendance.recordType = 'manual';
                attendance.recordedBy = 'Admin';
                attendance.notes = notes;
                
                if (attendance.timeOut) {
                    attendance.calculateHoursWorked();
                    attendance.status = 'Completed';
                }
            }

            const result = await attendance.save();

            console.log('Manual Time In recorded successfully');
            console.log('Time In (PH):', formatTime(result.timeIn));
            console.log('Status:', result.status);
            console.log('Late Minutes:', result.lateMinutes);

            res.json({
                success: true,
                message: 'Manual time in recorded successfully',
                data: result,
                phTime: formatTime(phDateTime)
            });

        } else if (action === 'timeout') {
            const timeOutCheck = checkTimeOutHours(phDateTime);
            
            if (!timeOutCheck.allowed) {
                return res.status(400).json({
                    success: false,
                    message: 'Manual time out only allowed between 6:00 AM - 7:00 PM (Philippine Time)'
                });
            }

            if (!attendance || !attendance.timeIn) {
                return res.status(400).json({
                    success: false,
                    message: 'No time in record found for this date'
                });
            }

            if (attendance.timeOut) {
                return res.status(400).json({
                    success: false,
                    message: 'Time out already recorded for this date'
                });
            }

            // Use the enhanced processTimeOut method that handles mixed RFID/manual with 10-minute validation
            try {
                const result = await Attendance.processTimeOut(employee.employeeId, phDateTime, 'manual');
                
                console.log('Manual Time Out recorded successfully');
                console.log('Time Out (PH):', formatTime(result.timeOut));
                console.log('Hours Worked:', result.hoursWorked);
                console.log('Overtime Minutes:', result.overtimeMinutes);

                res.json({
                    success: true,
                    message: 'Manual time out recorded successfully',
                    data: result,
                    phTime: formatTime(phDateTime)
                });

            } catch (validationError) {
                console.log('Time out validation failed:', validationError.message);
                return res.status(400).json({
                    success: false,
                    message: validationError.message
                });
            }

        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Must be "timein" or "timeout"'
            });
        }

        // Emit Socket.IO event if available
        const io = req.app.get('io');
        if (io) {
            io.emit('attendance-update', {
                employeeId: employee.employeeId,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                department: employee.department,
                type: action,
                time: phDateTime,
                status: attendance.status,
                hoursWorked: attendance?.hoursWorked || '0h 0m',
                timestamp: getCurrentDateTime(),
                source: 'manual'
            });
        }

    } catch (error) {
        console.error('Error recording manual attendance:', error);
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: validationErrors
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error recording manual attendance',
            error: error.message
        });
    }
});

// BULK MANUAL ATTENDANCE RECORDING
router.post('/manual/bulk', async (req, res) => {
    try {
        const { records } = req.body;

        if (!records || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Records array is required and must not be empty'
            });
        }

        const results = {
            successful: [],
            failed: []
        };

        for (const record of records) {
            const { employeeId, date, time, action, notes = '' } = record;
            
            if (!employeeId || !date || !time || !action) {
                results.failed.push({
                    employeeId,
                    date,
                    time,
                    action,
                    error: 'Missing required fields'
                });
                continue;
            }

            try {
                const employee = await Employee.findOne({ employeeId: employeeId });
                if (!employee) {
                    results.failed.push({
                        employeeId,
                        date,
                        time,
                        action,
                        error: 'Employee not found'
                    });
                    continue;
                }

                let attendance = await Attendance.findOne({
                    employeeId: employeeId,
                    date: date
                });

                const timeWithSeconds = time.length === 5 ? `${time}:00` : time;
                const phDateTime = parsePHDateTime(date, timeWithSeconds);

                // Check working hours
                const workingHoursCheck = checkWorkingHours(phDateTime);
                if (!workingHoursCheck.allowed) {
                    results.failed.push({
                        employeeId,
                        date,
                        time,
                        action,
                        error: 'Outside working hours (6:00 AM - 7:00 PM)'
                    });
                    continue;
                }

                if (action === 'timein') {
                    const timeInCheck = checkTimeInHours(phDateTime);
                    
                    if (!timeInCheck.allowed) {
                        results.failed.push({
                            employeeId,
                            date,
                            time,
                            action,
                            error: 'Time in not allowed (6:00 AM - 5:00 PM only)'
                        });
                        continue;
                    }

                    if (attendance && attendance.timeIn) {
                        results.failed.push({
                            employeeId,
                            date,
                            time,
                            action,
                            error: 'Time in already recorded'
                        });
                        continue;
                    }

                    const lateCheck = checkIfLate(phDateTime);

                    if (!attendance) {
                        attendance = new Attendance({
                            employeeId: employee.employeeId,
                            employeeName: `${employee.firstName} ${employee.lastName}`,
                            department: employee.department,
                            position: employee.position,
                            date: date,
                            timeIn: phDateTime,
                            status: lateCheck.isLate ? 'Late' : 'Present',
                            lateMinutes: lateCheck.lateMinutes,
                            dateEmployed: employee.dateEmployed,
                            recordType: 'manual',
                            recordedBy: 'Admin',
                            timeInSource: 'manual',
                            notes: notes
                        });
                    } else {
                        attendance.timeIn = phDateTime;
                        attendance.status = lateCheck.isLate ? 'Late' : 'Present';
                        attendance.lateMinutes = lateCheck.lateMinutes;
                        attendance.timeInSource = 'manual';
                        attendance.recordType = 'manual';
                        attendance.recordedBy = 'Admin';
                        attendance.notes = notes;
                    }

                    const result = await attendance.save();

                    results.successful.push({
                        employeeId,
                        name: `${employee.firstName} ${employee.lastName}`,
                        date,
                        action,
                        time: formatTime(phDateTime),
                        status: result.status,
                        lateMinutes: result.lateMinutes
                    });

                } else if (action === 'timeout') {
                    const timeOutCheck = checkTimeOutHours(phDateTime);
                    
                    if (!timeOutCheck.allowed) {
                        results.failed.push({
                            employeeId,
                            date,
                            time,
                            action,
                            error: 'Time out not allowed (6:00 AM - 7:00 PM only)'
                        });
                        continue;
                    }

                    if (!attendance || !attendance.timeIn) {
                        results.failed.push({
                            employeeId,
                            date,
                            time,
                            action,
                            error: 'No time in record found'
                        });
                        continue;
                    }

                    if (attendance.timeOut) {
                        results.failed.push({
                            employeeId,
                            date,
                            time,
                            action,
                            error: 'Time out already recorded'
                        });
                        continue;
                    }

                    try {
                        const result = await Attendance.processTimeOut(employee.employeeId, phDateTime, 'manual');
                        
                        results.successful.push({
                            employeeId,
                            name: `${employee.firstName} ${employee.lastName}`,
                            date,
                            action,
                            time: formatTime(phDateTime),
                            hoursWorked: result.hoursWorked,
                            overtimeMinutes: result.overtimeMinutes || 0
                        });

                    } catch (validationError) {
                        results.failed.push({
                            employeeId,
                            date,
                            time,
                            action,
                            error: validationError.message
                        });
                        continue;
                    }

                } else {
                    results.failed.push({
                        employeeId,
                        date,
                        time,
                        action,
                        error: 'Invalid action. Must be "timein" or "timeout"'
                    });
                    continue;
                }

            } catch (error) {
                results.failed.push({
                    employeeId,
                    date,
                    time,
                    action,
                    error: error.message
                });
            }
        }

        console.log(`Bulk manual attendance completed: ${results.successful.length} successful, ${results.failed.length} failed`);

        // Emit socket events for successful records
        const io = req.app.get('io');
        if (io && results.successful.length > 0) {
            results.successful.forEach(record => {
                io.emit('attendance-update', {
                    employeeId: record.employeeId,
                    employeeName: record.name,
                    type: record.action,
                    time: new Date(),
                    status: record.status || 'Completed',
                    hoursWorked: record.hoursWorked || '0h 0m',
                    timestamp: getCurrentDateTime(),
                    source: 'manual'
                });
            });
        }

        res.json({
            success: true,
            message: `Bulk manual attendance completed: ${results.successful.length} successful, ${results.failed.length} failed`,
            data: results
        });

    } catch (error) {
        console.error('Error processing bulk manual attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing bulk manual attendance',
            error: error.message
        });
    }
});

// GET EMPLOYEE ATTENDANCE HISTORY
router.get('/employee/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { startDate, endDate, limit = 50 } = req.query;
        
        let filter = { employeeId: employeeId };
        
        if (startDate && endDate) {
            filter.date = {
                $gte: startDate,
                $lte: endDate
            };
        }

        const attendance = await Attendance.find(filter)
            .sort({ date: -1 })
            .limit(parseInt(limit))
            .select('-__v');

        res.json({
            success: true,
            data: attendance,
            count: attendance.length
        });
    } catch (error) {
        console.error('Error fetching employee attendance:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching employee attendance',
            error: error.message 
        });
    }
});

// UPDATE ATTENDANCE RECORD
router.put('/:id', async (req, res) => {
    try {
        const { timeIn, timeOut, notes, status } = req.body;
        
        const attendance = await Attendance.findById(req.params.id);
        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        const updateData = {};
        if (timeIn) {
            // Parse timeIn as PH time
            updateData.timeIn = moment.tz(timeIn, 'Asia/Manila').toDate();
        }
        if (timeOut) {
            // Parse timeOut as PH time
            updateData.timeOut = moment.tz(timeOut, 'Asia/Manila').toDate();
        }
        if (notes !== undefined) updateData.notes = notes;
        if (status !== undefined) updateData.status = status;

        // If updating time out, validate the 10-minute rule
        if (timeOut && attendance.timeIn) {
            const proposedTimeOut = moment.tz(timeOut, 'Asia/Manila').toDate();
            const validation = attendance.canTimeOut(proposedTimeOut, 'manual');
            if (!validation.allowed) {
                return res.status(400).json({
                    success: false,
                    message: validation.reason
                });
            }
        }

        if (timeIn || timeOut) {
            const updatedRecord = await Attendance.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true, runValidators: true }
            );
            
            if (updatedRecord.timeIn && updatedRecord.timeOut) {
                updatedRecord.calculateHoursWorked();
                updatedRecord.status = 'Completed';
                await updatedRecord.save();
            }
            
            res.json({
                success: true,
                message: 'Attendance record updated successfully',
                data: updatedRecord
            });
        } else {
            const updatedRecord = await Attendance.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true }
            );
            
            res.json({
                success: true,
                message: 'Attendance record updated successfully',
                data: updatedRecord
            });
        }

    } catch (error) {
        console.error('Error updating attendance:', error);
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: validationErrors
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error updating attendance record',
            error: error.message
        });
    }
});

// DELETE ATTENDANCE RECORD
router.delete('/:id', async (req, res) => {
    try {
        const attendance = await Attendance.findByIdAndDelete(req.params.id);
        
        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        res.json({
            success: true,
            message: 'Attendance record deleted successfully',
            data: attendance
        });
    } catch (error) {
        console.error('Error deleting attendance record:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting attendance record',
            error: error.message
        });
    }
});

// GET DASHBOARD STATISTICS
router.get('/dashboard/stats', async (req, res) => {
    try {
        const stats = await Attendance.getDashboardStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics',
            error: error.message
        });
    }
});

// GET REAL-TIME SUMMARY FOR EMPLOYEE
router.get('/summary/realtime/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required'
            });
        }

        const summary = await Attendance.getRealTimeSummaryFromEmployment(employeeId);

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Error fetching real-time summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching real-time summary',
            error: error.message
        });
    }
});

// GET MONTHLY SUMMARY FOR EMPLOYEE
router.get('/summary/monthly/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { year, month } = req.query;
        
        if (!employeeId || !year || !month) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID, year, and month are required'
            });
        }

        const summary = await Attendance.getMonthlySummaryFromEmployment(
            employeeId, 
            parseInt(year), 
            parseInt(month)
        );

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Error fetching monthly summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching monthly summary',
            error: error.message
        });
    }
});

// GET ATTENDANCE TRENDS
router.get('/trends/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { months = 6 } = req.query;
        
        const employee = await Employee.findOne({ employeeId: employeeId });
        
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const endDate = moment().tz('Asia/Manila');
        const startDate = moment().tz('Asia/Manila').subtract(parseInt(months), 'months');

        const employmentDate = moment(employee.dateEmployed);
        const actualStartDate = employmentDate.isAfter(startDate) ? employmentDate : startDate;

        if (actualStartDate.isAfter(endDate)) {
            return res.json({
                success: true,
                data: {
                    employee: {
                        name: `${employee.firstName} ${employee.lastName}`,
                        employeeId: employee.employeeId
                    },
                    trends: [],
                    period: {
                        startDate: actualStartDate.format('YYYY-MM-DD'),
                        endDate: endDate.format('YYYY-MM-DD'),
                        employmentDate: employmentDate.format('YYYY-MM-DD')
                    }
                }
            });
        }

        const startDateStr = actualStartDate.format('YYYY-MM-DD');
        const endDateStr = endDate.format('YYYY-MM-DD');

        const attendance = await Attendance.find({
            employeeId: employeeId,
            date: {
                $gte: startDateStr,
                $lte: endDateStr
            }
        }).sort({ date: 1 });

        const monthlyTrends = {};
        attendance.forEach(record => {
            const recordMoment = moment(record.date);
            const monthKey = recordMoment.format('YYYY-MM');
            
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

        res.json({
            success: true,
            data: {
                employee: {
                    name: `${employee.firstName} ${employee.lastName}`,
                    employeeId: employee.employeeId,
                    department: employee.department
                },
                trends: trends.sort((a, b) => a.month.localeCompare(b.month)),
                period: {
                    startDate: startDateStr,
                    endDate: endDateStr,
                    employmentDate: employmentDate.format('YYYY-MM-DD'),
                    months: trends.length
                }
            }
        });

    } catch (error) {
        console.error('Error fetching attendance trends:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching attendance trends',
            error: error.message
        });
    }
});

// GET ATTENDANCE BY SOURCE (RFID/MANUAL)
router.get('/source/:source', async (req, res) => {
    try {
        const { source } = req.params;
        const { date, page = 1, limit = 50 } = req.query;
        
        if (!['rfid', 'manual'].includes(source)) {
            return res.status(400).json({
                success: false,
                message: 'Source must be either "rfid" or "manual"'
            });
        }

        let filter = {
            $or: [
                { timeInSource: source },
                { timeOutSource: source }
            ]
        };

        if (date) {
            filter.date = date;
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const attendance = await Attendance.find(filter)
            .sort({ date: -1, timeIn: -1 })
            .limit(limitNum)
            .skip(skip)
            .select('-__v');

        const total = await Attendance.countDocuments(filter);

        res.json({
            success: true,
            data: attendance,
            pagination: {
                current: pageNum,
                totalPages: Math.ceil(total / limitNum),
                totalRecords: total,
                limit: limitNum
            },
            source: source
        });
    } catch (error) {
        console.error('Error fetching attendance by source:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching attendance records by source',
            error: error.message
        });
    }
});

// GET MIXED ATTENDANCE RECORDS (RFID time in + Manual time out or vice versa)
router.get('/mixed', async (req, res) => {
    try {
        const { date, page = 1, limit = 50 } = req.query;
        
        let filter = {
            $or: [
                { timeInSource: 'rfid', timeOutSource: 'manual' },
                { timeInSource: 'manual', timeOutSource: 'rfid' }
            ]
        };

        if (date) {
            filter.date = date;
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const attendance = await Attendance.find(filter)
            .sort({ date: -1, timeIn: -1 })
            .limit(limitNum)
            .skip(skip)
            .select('-__v');

        const total = await Attendance.countDocuments(filter);

        res.json({
            success: true,
            data: attendance,
            pagination: {
                current: pageNum,
                totalPages: Math.ceil(total / limitNum),
                totalRecords: total,
                limit: limitNum
            },
            description: 'Records with mixed RFID and manual attendance methods'
        });
    } catch (error) {
        console.error('Error fetching mixed attendance records:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching mixed attendance records',
            error: error.message
        });
    }
});

// CORRECT ATTENDANCE RECORD
router.patch('/:id/correct', async (req, res) => {
    try {
        const { timeIn, timeOut, date, notes } = req.body;
        
        const attendance = await Attendance.findById(req.params.id);
        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        const updateData = {
            recordType: 'manual',
            recordedBy: 'Admin',
            lastModified: new Date()
        };

        if (timeIn !== undefined) {
            updateData.timeIn = moment.tz(timeIn, 'Asia/Manila').toDate();
            updateData.timeInSource = 'manual';
        }
        
        if (timeOut !== undefined) {
            updateData.timeOut = moment.tz(timeOut, 'Asia/Manila').toDate();
            updateData.timeOutSource = 'manual';
        }
        
        if (date) {
            updateData.date = date;
        }
        
        if (notes !== undefined) {
            updateData.notes = notes;
        }

        // Validate time out if both times are being updated
        if (timeIn && timeOut) {
            const timeInDate = moment.tz(timeIn, 'Asia/Manila').toDate();
            const timeOutDate = moment.tz(timeOut, 'Asia/Manila').toDate();
            
            const timeDifference = moment(timeOutDate).diff(moment(timeInDate), 'minutes');
            if (timeDifference < 10) {
                return res.status(400).json({
                    success: false,
                    message: `Time difference must be at least 10 minutes. Current difference: ${timeDifference} minutes`
                });
            }
        }

        const updatedRecord = await Attendance.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        // Recalculate hours worked if both times are present
        if (updatedRecord.timeIn && updatedRecord.timeOut) {
            updatedRecord.calculateHoursWorked();
            updatedRecord.status = 'Completed';
            await updatedRecord.save();
        }

        res.json({
            success: true,
            message: 'Attendance record corrected successfully',
            data: updatedRecord
        });

    } catch (error) {
        console.error('Error correcting attendance record:', error);
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: validationErrors
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error correcting attendance record',
            error: error.message
        });
    }
});

// GET ATTENDANCE STATISTICS BY DEPARTMENT
router.get('/stats/department', async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || getCurrentDate();

        const departmentStats = await Attendance.aggregate([
            { $match: { date: targetDate } },
            {
                $group: {
                    _id: '$department',
                    totalEmployees: { $addToSet: '$employeeId' },
                    present: {
                        $sum: {
                            $cond: [{ $ifNull: ['$timeIn', false] }, 1, 0]
                        }
                    },
                    completed: {
                        $sum: {
                            $cond: [{ $ifNull: ['$timeOut', false] }, 1, 0]
                        }
                    },
                    late: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'Late'] }, 1, 0]
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
                    late: 1,
                    absent: {
                        $subtract: [
                            { $size: '$totalEmployees' },
                            '$present'
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

        res.json({
            success: true,
            data: departmentStats,
            date: targetDate
        });
    } catch (error) {
        console.error('Error fetching department statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching department statistics',
            error: error.message
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
        features: {
            manualAttendance: true,
            mixedMode: true,
            timeValidation: true,
            bulkOperations: true
        }
    };
    
    res.json({
        success: true,
        data: health
    });
});

module.exports = router;
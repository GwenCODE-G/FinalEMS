import express from 'express';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';

const router = express.Router();

const parseJsonFields = (reqBody) => {
  const parsed = {};
  for (const key in reqBody) {
    try {
      if (typeof reqBody[key] === 'string' && (reqBody[key].startsWith('{') || reqBody[key].startsWith('['))) {
        parsed[key] = JSON.parse(reqBody[key]);
      } else {
        parsed[key] = reqBody[key];
      }
    } catch (e) {
      parsed[key] = reqBody[key];
    }
  }
  return parsed;
};

// GET all employees - FIXED: Now returns both Active and Archived employees
router.get('/', async (req, res) => {
  try {
    // Remove the status filter to get ALL employees (both Active and Archived)
    const employees = await Employee.find({}).sort({ lastName: 1, firstName: 1 });
    
    // Log for debugging
    console.log(`Fetched ${employees.length} employees (Active: ${employees.filter(e => e.status === 'Active').length}, Archived: ${employees.filter(e => e.status === 'Archived').length})`);
    
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Failed to fetch employees.' });
  }
});

// GET employee by ID
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }
    res.json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ message: 'Failed to fetch employee.' });
  }
});

// GET employee by employeeId
router.get('/employeeId/:employeeId', async (req, res) => {
  try {
    const employee = await Employee.findOne({ employeeId: req.params.employeeId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }
    res.json(employee);
  } catch (error) {
    console.error('Error fetching employee by employeeId:', error);
    res.status(500).json({ message: 'Failed to fetch employee.' });
  }
});

// POST create new employee
router.post('/', async (req, res) => {
  try {
    console.log('Creating new employee:', req.body);

    const departmentCodeMap = {
      'Academic': 'ACAT',
      'Facilities & Operation': 'FAOP',
      'Administrative & Support': 'ADSU'
    };
    const departmentCode = departmentCodeMap[req.body.department] || 'EMP';
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const employeeId = `${departmentCode}${randomNum}`;

    const parsedBody = parseJsonFields(req.body);

    const employeeData = {
      ...parsedBody,
      employeeId,
      age: parseInt(parsedBody.age),
      teachingLevel: Array.isArray(parsedBody.teachingLevel) ? parsedBody.teachingLevel : (parsedBody.teachingLevel ? [parsedBody.teachingLevel] : []),
    };

    const employee = new Employee(employeeData);
    const savedEmployee = await employee.save();

    // Update department count
    await Department.findOneAndUpdate(
      { name: req.body.department },
      { $inc: { employeeCount: 1 } },
      { upsert: true, new: true }
    );

    res.status(201).json(savedEmployee);
  } catch (error) {
    console.error('Error creating employee:', error);
    
    if (error.code === 11000) {
      if (error.keyPattern.employeeId) {
        return res.status(409).json({ message: 'Employee ID already exists. Please try again.' });
      }
      if (error.keyPattern.email) {
        return res.status(409).json({ message: 'Email already registered.' });
      }
      if (error.keyPattern.rfidUid) {
        return res.status(409).json({ message: 'RFID UID already assigned to another employee.' });
      }
    }
    res.status(400).json({ message: error.message || 'Failed to create employee.' });
  }
});

// PUT update employee
router.put('/:id', async (req, res) => {
  try {
    const employeeId = req.params.id;
    const employeeToUpdate = await Employee.findById(employeeId);
    if (!employeeToUpdate) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const parsedBody = parseJsonFields(req.body);
    const oldDepartment = employeeToUpdate.department;

    const updateData = {
      ...parsedBody,
      age: parseInt(parsedBody.age),
      teachingLevel: Array.isArray(parsedBody.teachingLevel) ? parsedBody.teachingLevel : (parsedBody.teachingLevel ? [parsedBody.teachingLevel] : []),
    };

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId, 
      updateData, 
      { new: true, runValidators: true }
    );

    // Update department counts if department changed
    if (oldDepartment !== updatedEmployee.department) {
      if (oldDepartment) {
        await Department.findOneAndUpdate(
          { name: oldDepartment },
          { $inc: { employeeCount: -1 } }
        );
      }
      if (updatedEmployee.department) {
        await Department.findOneAndUpdate(
          { name: updatedEmployee.department },
          { $inc: { employeeCount: 1 } },
          { upsert: true }
        );
      }
    }

    res.json(updatedEmployee);
  } catch (error) {
    console.error('Error updating employee:', error);
    
    if (error.code === 11000) {
      if (error.keyPattern.employeeId) {
        return res.status(409).json({ message: 'Employee ID already exists.' });
      }
      if (error.keyPattern.email) {
        return res.status(409).json({ message: 'Email already registered.' });
      }
      if (error.keyPattern.rfidUid) {
        return res.status(409).json({ message: 'RFID UID already assigned to another employee.' });
      }
    }
    res.status(400).json({ message: error.message || 'Failed to update employee.' });
  }
});

// DELETE (archive) employee
router.delete('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    if (employee.status === 'Archived') {
      return res.status(400).json({ message: 'Employee is already archived.' });
    }

    employee.status = 'Archived';
    await employee.save();

    // Update department count
    await Department.findOneAndUpdate(
      { name: employee.department },
      { $inc: { employeeCount: -1 } }
    );

    res.json({ message: 'Employee archived successfully.' });
  } catch (error) {
    console.error('Error archiving employee:', error);
    res.status(500).json({ message: error.message || 'Failed to archive employee.' });
  }
});

// RESTORE archived employee
router.put('/:id/restore', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    if (employee.status === 'Active') {
      return res.status(400).json({ message: 'Employee is already active.' });
    }

    employee.status = 'Active';
    await employee.save();

    // Update department count
    await Department.findOneAndUpdate(
      { name: employee.department },
      { $inc: { employeeCount: 1 } }
    );

    res.json({ message: 'Employee restored successfully.' });
  } catch (error) {
    console.error('Error restoring employee:', error);
    res.status(500).json({ message: error.message || 'Failed to restore employee.' });
  }
});

// GET active employees only
router.get('/status/active', async (req, res) => {
  try {
    const employees = await Employee.find({ status: 'Active' }).sort({ lastName: 1, firstName: 1 });
    res.json(employees);
  } catch (error) {
    console.error('Error fetching active employees:', error);
    res.status(500).json({ message: 'Failed to fetch active employees.' });
  }
});

// GET archived employees only
router.get('/status/archived', async (req, res) => {
  try {
    const employees = await Employee.find({ status: 'Archived' }).sort({ lastName: 1, firstName: 1 });
    res.json(employees);
  } catch (error) {
    console.error('Error fetching archived employees:', error);
    res.status(500).json({ message: 'Failed to fetch archived employees.' });
  }
});

// GET employees by department
router.get('/department/:department', async (req, res) => {
  try {
    const employees = await Employee.find({ 
      department: req.params.department,
      status: 'Active'
    }).sort({ lastName: 1, firstName: 1 });
    
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees by department:', error);
    res.status(500).json({ message: 'Failed to fetch employees by department.' });
  }
});

// GET employees by position
router.get('/position/:position', async (req, res) => {
  try {
    const employees = await Employee.find({ 
      position: req.params.position,
      status: 'Active'
    }).sort({ lastName: 1, firstName: 1 });
    
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees by position:', error);
    res.status(500).json({ message: 'Failed to fetch employees by position.' });
  }
});

// SEARCH employees
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const employees = await Employee.find({
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { employeeId: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { department: { $regex: query, $options: 'i' } },
        { position: { $regex: query, $options: 'i' } }
      ]
    }).sort({ lastName: 1, firstName: 1 });
    
    res.json(employees);
  } catch (error) {
    console.error('Error searching employees:', error);
    res.status(500).json({ message: 'Failed to search employees.' });
  }
});

// UPDATE employee password
router.put('/:id/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    // Verify current password
    if (currentPassword) {
      const isCurrentPasswordValid = await employee.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }
    }

    // Update password
    employee.password = newPassword;
    employee.requiresPasswordChange = false;
    await employee.save();

    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Failed to update password.' });
  }
});

// RESET employee password to default
router.put('/:id/reset-password', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    // Reset to default password
    const defaultPassword = employee.getDefaultPassword();
    employee.password = defaultPassword;
    employee.requiresPasswordChange = true;
    await employee.save();

    res.json({ 
      message: 'Password reset successfully.',
      defaultPassword: defaultPassword 
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Failed to reset password.' });
  }
});

// ASSIGN RFID to employee
router.put('/:id/assign-rfid', async (req, res) => {
  try {
    const { rfidUid } = req.body;
    
    if (!rfidUid) {
      return res.status(400).json({ message: 'RFID UID is required.' });
    }

    // Format RFID UID
    const formattedUid = rfidUid.replace(/\s/g, '').toUpperCase();
    if (!/^[0-9A-F]{8}$/i.test(formattedUid)) {
      return res.status(400).json({ message: 'Invalid RFID UID format.' });
    }

    const finalUid = formattedUid.match(/.{1,2}/g).join(' ');

    // Check if RFID is already assigned to another employee
    const existingAssignment = await Employee.findOne({ 
      rfidUid: finalUid,
      _id: { $ne: req.params.id }
    });

    if (existingAssignment) {
      return res.status(400).json({ 
        message: `RFID already assigned to ${existingAssignment.firstName} ${existingAssignment.lastName}` 
      });
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { 
        rfidUid: finalUid,
        isRfidAssigned: true
      },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    res.json({
      message: 'RFID assigned successfully.',
      employee: {
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        rfidUid: employee.rfidUid
      }
    });
  } catch (error) {
    console.error('Error assigning RFID:', error);
    res.status(500).json({ message: 'Failed to assign RFID.' });
  }
});

// REMOVE RFID assignment
router.put('/:id/remove-rfid', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { 
        rfidUid: null,
        isRfidAssigned: false
      },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    res.json({ message: 'RFID assignment removed successfully.' });
  } catch (error) {
    console.error('Error removing RFID assignment:', error);
    res.status(500).json({ message: 'Failed to remove RFID assignment.' });
  }
});

// GET employees with RFID assigned
router.get('/rfid/assigned', async (req, res) => {
  try {
    const employees = await Employee.find({ 
      isRfidAssigned: true,
      status: 'Active'
    }).sort({ lastName: 1, firstName: 1 });
    
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees with RFID:', error);
    res.status(500).json({ message: 'Failed to fetch employees with RFID.' });
  }
});

// GET employees without RFID assigned
router.get('/rfid/unassigned', async (req, res) => {
  try {
    const employees = await Employee.find({ 
      $or: [
        { isRfidAssigned: false },
        { isRfidAssigned: { $exists: false } },
        { rfidUid: null }
      ],
      status: 'Active'
    }).sort({ lastName: 1, firstName: 1 });
    
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees without RFID:', error);
    res.status(500).json({ message: 'Failed to fetch employees without RFID.' });
  }
});

// BULK archive employees
router.post('/bulk/archive', async (req, res) => {
  try {
    const { employeeIds } = req.body;
    
    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({ message: 'Employee IDs array is required.' });
    }

    const result = await Employee.updateMany(
      { _id: { $in: employeeIds } },
      { status: 'Archived' }
    );

    // Update department counts
    const archivedEmployees = await Employee.find({ _id: { $in: employeeIds } });
    const departmentUpdates = {};
    
    archivedEmployees.forEach(emp => {
      if (emp.department) {
        departmentUpdates[emp.department] = (departmentUpdates[emp.department] || 0) + 1;
      }
    });

    // Update each department count
    for (const [department, count] of Object.entries(departmentUpdates)) {
      await Department.findOneAndUpdate(
        { name: department },
        { $inc: { employeeCount: -count } }
      );
    }

    res.json({ 
      message: `${result.modifiedCount} employees archived successfully.`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk archiving employees:', error);
    res.status(500).json({ message: 'Failed to archive employees.' });
  }
});

// BULK restore employees
router.post('/bulk/restore', async (req, res) => {
  try {
    const { employeeIds } = req.body;
    
    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({ message: 'Employee IDs array is required.' });
    }

    const result = await Employee.updateMany(
      { _id: { $in: employeeIds } },
      { status: 'Active' }
    );

    // Update department counts
    const restoredEmployees = await Employee.find({ _id: { $in: employeeIds } });
    const departmentUpdates = {};
    
    restoredEmployees.forEach(emp => {
      if (emp.department) {
        departmentUpdates[emp.department] = (departmentUpdates[emp.department] || 0) + 1;
      }
    });

    // Update each department count
    for (const [department, count] of Object.entries(departmentUpdates)) {
      await Department.findOneAndUpdate(
        { name: department },
        { $inc: { employeeCount: count } },
        { upsert: true }
      );
    }

    res.json({ 
      message: `${result.modifiedCount} employees restored successfully.`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk restoring employees:', error);
    res.status(500).json({ message: 'Failed to restore employees.' });
  }
});

// GET employee statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ status: 'Active' });
    const archivedEmployees = await Employee.countDocuments({ status: 'Archived' });
    const employeesWithRfid = await Employee.countDocuments({ 
      isRfidAssigned: true,
      status: 'Active' 
    });

    // Department statistics
    const departmentStats = await Employee.aggregate([
      { $match: { status: 'Active' } },
      { $group: { 
        _id: '$department', 
        count: { $sum: 1 },
        withRfid: { 
          $sum: { 
            $cond: [{ $eq: ['$isRfidAssigned', true] }, 1, 0] 
          } 
        }
      }},
      { $sort: { count: -1 } }
    ]);

    // Position statistics
    const positionStats = await Employee.aggregate([
      { $match: { status: 'Active' } },
      { $group: { 
        _id: '$position', 
        count: { $sum: 1 } 
      }},
      { $sort: { count: -1 } }
    ]);

    res.json({
      summary: {
        total: totalEmployees,
        active: activeEmployees,
        archived: archivedEmployees,
        withRfid: employeesWithRfid,
        withoutRfid: activeEmployees - employeesWithRfid,
        rfidAssignmentRate: activeEmployees > 0 ? ((employeesWithRfid / activeEmployees) * 100).toFixed(1) : 0
      },
      byDepartment: departmentStats,
      byPosition: positionStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching employee statistics:', error);
    res.status(500).json({ message: 'Failed to fetch employee statistics.' });
  }
});

export default router;
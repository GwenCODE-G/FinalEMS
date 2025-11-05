const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

const getDepartmentCode = (department) => {
  const codes = {
    'Academic Department': 'ACA',
    'Administrative Department': 'ADM',
    'Maintenance and Facilities Department': 'MFD'
  };
  return codes[department] || 'EMP';
};

const validateRequirements = (requirements) => {
  if (!requirements) return {};
  
  const requirementGroups = [
    'tinRequirements', 'sssRequirements', 'philhealthRequirements', 'pagibigRequirements',
    'healthCardRequirements', 'professionalIDRequirements', 'driversLicenseRequirements',
    'barangayWorkingPermitRequirements', 'birthCertificateRequirements', 'policeNbiRequirements',
    'barangayClearanceRequirements', 'cedulaRequirements'
  ];
  
  const validatedRequirements = {};
  
  requirementGroups.forEach(group => {
    if (!requirements[group]) {
      switch(group) {
        case 'tinRequirements':
          validatedRequirements[group] = { presentForm: false, submitCopy: false, notYetSubmitted: true };
          break;
        case 'sssRequirements':
          validatedRequirements[group] = { presentForm: false, presentID: false, submitCopy: false, notYetSubmitted: true };
          break;
        case 'philhealthRequirements':
          validatedRequirements[group] = { presentMDR: false, presentID: false, submitCopy: false, notYetSubmitted: true };
          break;
        case 'pagibigRequirements':
          validatedRequirements[group] = { presentMDF: false, presentID: false, submitCopy: false, notYetSubmitted: true };
          break;
        case 'healthCardRequirements':
        case 'professionalIDRequirements':
        case 'driversLicenseRequirements':
        case 'cedulaRequirements':
          validatedRequirements[group] = { presentOriginal: false, submitCopy: false, notYetSubmitted: true };
          break;
        case 'barangayWorkingPermitRequirements':
        case 'policeNbiRequirements':
        case 'barangayClearanceRequirements':
          validatedRequirements[group] = { submitCopy: false, submitOriginal: false, notYetSubmitted: true };
          break;
        case 'birthCertificateRequirements':
          validatedRequirements[group] = { presentOriginal: false, submitCopy: false, notYetSubmitted: true };
          break;
        default:
          validatedRequirements[group] = { notYetSubmitted: true };
      }
    } else {
      const currentGroup = requirements[group];
      validatedRequirements[group] = {};
      
      switch(group) {
        case 'tinRequirements':
          validatedRequirements[group].presentForm = Boolean(currentGroup.presentForm);
          validatedRequirements[group].submitCopy = Boolean(currentGroup.submitCopy);
          validatedRequirements[group].notYetSubmitted = Boolean(currentGroup.notYetSubmitted !== false);
          break;
        case 'sssRequirements':
          validatedRequirements[group].presentForm = Boolean(currentGroup.presentForm);
          validatedRequirements[group].presentID = Boolean(currentGroup.presentID);
          validatedRequirements[group].submitCopy = Boolean(currentGroup.submitCopy);
          validatedRequirements[group].notYetSubmitted = Boolean(currentGroup.notYetSubmitted !== false);
          break;
        case 'philhealthRequirements':
          validatedRequirements[group].presentMDR = Boolean(currentGroup.presentMDR);
          validatedRequirements[group].presentID = Boolean(currentGroup.presentID);
          validatedRequirements[group].submitCopy = Boolean(currentGroup.submitCopy);
          validatedRequirements[group].notYetSubmitted = Boolean(currentGroup.notYetSubmitted !== false);
          break;
        case 'pagibigRequirements':
          validatedRequirements[group].presentMDF = Boolean(currentGroup.presentMDF);
          validatedRequirements[group].presentID = Boolean(currentGroup.presentID);
          validatedRequirements[group].submitCopy = Boolean(currentGroup.submitCopy);
          validatedRequirements[group].notYetSubmitted = Boolean(currentGroup.notYetSubmitted !== false);
          break;
        case 'healthCardRequirements':
        case 'professionalIDRequirements':
        case 'driversLicenseRequirements':
        case 'cedulaRequirements':
          validatedRequirements[group].presentOriginal = Boolean(currentGroup.presentOriginal);
          validatedRequirements[group].submitCopy = Boolean(currentGroup.submitCopy);
          validatedRequirements[group].notYetSubmitted = Boolean(currentGroup.notYetSubmitted !== false);
          break;
        case 'barangayWorkingPermitRequirements':
        case 'policeNbiRequirements':
        case 'barangayClearanceRequirements':
          validatedRequirements[group].submitCopy = Boolean(currentGroup.submitCopy);
          validatedRequirements[group].submitOriginal = Boolean(currentGroup.submitOriginal);
          validatedRequirements[group].notYetSubmitted = Boolean(currentGroup.notYetSubmitted !== false);
          break;
        case 'birthCertificateRequirements':
          validatedRequirements[group].presentOriginal = Boolean(currentGroup.presentOriginal);
          validatedRequirements[group].submitCopy = Boolean(currentGroup.submitCopy);
          validatedRequirements[group].notYetSubmitted = Boolean(currentGroup.notYetSubmitted !== false);
          break;
        default:
          validatedRequirements[group].notYetSubmitted = Boolean(currentGroup.notYetSubmitted !== false);
      }
    }
  });
  
  return validatedRequirements;
};

const validateWorkSchedule = (workSchedule) => {
  if (!workSchedule) {
    return {
      Monday: { active: true, start: '07:00', end: '17:00' },
      Tuesday: { active: true, start: '07:00', end: '17:00' },
      Wednesday: { active: true, start: '07:00', end: '17:00' },
      Thursday: { active: true, start: '07:00', end: '17:00' },
      Friday: { active: true, start: '07:00', end: '17:00' },
      Saturday: { active: true, start: '07:00', end: '17:00' },
      Sunday: { active: true, start: '07:00', end: '17:00' }
    };
  }
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const validatedSchedule = {};
  
  days.forEach(day => {
    if (workSchedule[day]) {
      validatedSchedule[day] = {
        active: Boolean(workSchedule[day].active),
        start: workSchedule[day].start || '',
        end: workSchedule[day].end || ''
      };
    } else {
      validatedSchedule[day] = {
        active: true, // Always active for all days including weekends
        start: '07:00', // Default start time for all days
        end: '16:00'   // Default end time for all days
      };
    }
  });
  
  return validatedSchedule;
};

const validateAddress = (address) => {
  if (!address) {
    return {
      blkLt: '',
      street: '',
      area: '',
      barangay: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Philippines'
    };
  }
  
  return {
    blkLt: address.blkLt || '',
    street: address.street || '',
    area: address.area || '',
    barangay: address.barangay || '',
    city: address.city || '',
    province: address.province || '',
    postalCode: address.postalCode || '',
    country: address.country || 'Philippines'
  };
};

const validateEmergencyContact = (emergencyContact) => {
  if (!emergencyContact) {
    return {
      firstName: '',
      lastName: '',
      relationship: '',
      type: 'Landline',
      mobile: '',
      landline: ''
    };
  }
  
  return {
    firstName: emergencyContact.firstName || '',
    lastName: emergencyContact.lastName || '',
    relationship: emergencyContact.relationship || '',
    type: emergencyContact.type || 'Landline',
    mobile: emergencyContact.mobile || '',
    landline: emergencyContact.landline || ''
  };
};

router.get('/', async (req, res) => {
    try {
        const { 
            department, 
            status = 'all',
            search,
            page = 1, 
            limit = 50,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;
        
        let filter = {};
        
        if (status && status !== 'all') {
            filter.status = status;
        }
        
        if (department && department !== 'all') {
            filter.department = department;
        }
        
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { employeeId: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' } },
                { position: { $regex: search, $options: 'i' } }
            ];
        }

        const sortConfig = {};
        sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const employees = await Employee.find(filter)
            .sort(sortConfig)
            .limit(limitNum)
            .skip(skip)
            .select('-__v -password');

        const total = await Employee.countDocuments(filter);

        res.json({
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
        console.error('Error fetching employees:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching employees',
            error: error.message 
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id).select('-__v -password');
        if (!employee) {
            return res.status(404).json({ 
                success: false,
                message: 'Employee not found' 
            });
        }
        res.json({
            success: true,
            data: employee
        });
    } catch (error) {
        console.error('Error fetching employee:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID format'
            });
        }
        res.status(500).json({ 
            success: false,
            message: 'Error fetching employee',
            error: error.message 
        });
    }
});

router.post('/', async (req, res) => {
  try {
    console.log('=== EMPLOYEE CREATION START ===');
    console.log('Received data:', JSON.stringify(req.body, null, 2));

    if (!req.body.employeeId) {
      const departmentCode = getDepartmentCode(req.body.department);
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      req.body.employeeId = `${departmentCode}${randomNum}`;
    }

    const requiredFields = ['firstName', 'lastName', 'email', 'department', 'position', 'workType', 'gender', 'birthday', 'age', 'contactNumber', 'religion', 'birthplace'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const submissionData = {
      employeeId: req.body.employeeId,
      firstName: req.body.firstName.trim(),
      middleName: req.body.middleName ? req.body.middleName.trim() : '',
      lastName: req.body.lastName.trim(),
      suffix: req.body.suffix || '',
      gender: req.body.gender,
      civilStatus: req.body.civilStatus || '',
      religion: req.body.religion.trim(),
      birthday: new Date(req.body.birthday),
      birthplace: req.body.birthplace.trim(),
      age: parseInt(req.body.age),
      contactNumber: req.body.contactNumber,
      email: req.body.email.trim().toLowerCase(),
      philhealth: req.body.philhealth || '',
      sss: req.body.sss || '',
      pagibig: req.body.pagibig || '',
      tin: req.body.tin || '',
      emergencyContact: validateEmergencyContact(req.body.emergencyContact),
      currentAddress: validateAddress(req.body.currentAddress),
      permanentAddress: req.body.sameAsCurrent ? validateAddress(req.body.currentAddress) : validateAddress(req.body.permanentAddress),
      sameAsCurrent: Boolean(req.body.sameAsCurrent),
      department: req.body.department,
      position: req.body.position,
      teachingLevel: Array.isArray(req.body.teachingLevel) ? req.body.teachingLevel : [],
      workType: req.body.workType,
      workSchedule: validateWorkSchedule(req.body.workSchedule),
      dateStart: req.body.dateStart ? new Date(req.body.dateStart) : null,
      dateSeparated: req.body.dateSeparated ? new Date(req.body.dateSeparated) : null,
      requirements: validateRequirements(req.body.requirements),
      status: 'Active',
      dateEmployed: req.body.dateEmployed ? new Date(req.body.dateEmployed) : new Date()
    };

    console.log('Processed submission data:', JSON.stringify(submissionData, null, 2));

    const newEmployee = new Employee(submissionData);
    const savedEmployee = await newEmployee.save();
    
    console.log('Employee saved successfully:', savedEmployee.employeeId);
    
    const io = req.app.get('io');
    if (io) {
      io.emit('employee-created', savedEmployee);
    }
    
    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: savedEmployee
    });
  } catch (error) {
    console.error('=== EMPLOYEE CREATION ERROR ===');
    console.error('Error details:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
        error: `This ${field} (${value}) is already registered`
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Error creating employee',
      error: error.message
    });
  }
});

router.put('/:id', async (req, res) => {
    try {
        console.log('=== EMPLOYEE UPDATE START ===');
        console.log('Updating employee ID:', req.params.id);
        console.log('Update data received:', JSON.stringify(req.body, null, 2));

        const updateData = { ...req.body };
        
        delete updateData._id;
        delete updateData.employeeId;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        delete updateData.password;

        if (updateData.status) {
            console.log(`Status change requested: ${updateData.status}`);
        }

        if (updateData.emergencyContact && typeof updateData.emergencyContact === 'object') {
            updateData.emergencyContact = validateEmergencyContact(updateData.emergencyContact);
        }

        if (updateData.currentAddress && typeof updateData.currentAddress === 'object') {
            updateData.currentAddress = validateAddress(updateData.currentAddress);
        }

        if (updateData.permanentAddress && typeof updateData.permanentAddress === 'object') {
            updateData.permanentAddress = validateAddress(updateData.permanentAddress);
        }

        if (updateData.requirements && typeof updateData.requirements === 'object') {
            updateData.requirements = validateRequirements(updateData.requirements);
        }

        if (updateData.workSchedule && typeof updateData.workSchedule === 'object') {
            updateData.workSchedule = validateWorkSchedule(updateData.workSchedule);
        }

        if (updateData.teachingLevel && !Array.isArray(updateData.teachingLevel)) {
            try {
                updateData.teachingLevel = JSON.parse(updateData.teachingLevel);
            } catch (e) {
                updateData.teachingLevel = [];
            }
        }

        if (updateData.age) {
            updateData.age = parseInt(updateData.age);
        }

        if (updateData.sameAsCurrent && updateData.currentAddress) {
            updateData.permanentAddress = { ...updateData.currentAddress };
        }

        if (updateData.birthday) {
            updateData.birthday = new Date(updateData.birthday);
        }

        if (updateData.dateStart) {
            updateData.dateStart = new Date(updateData.dateStart);
        }

        if (updateData.dateSeparated) {
            updateData.dateSeparated = new Date(updateData.dateSeparated);
        }

        console.log('Final update data:', JSON.stringify(updateData, null, 2));

        const updatedEmployee = await Employee.findByIdAndUpdate(
            req.params.id,
            updateData,
            { 
                new: true, 
                runValidators: true,
                context: 'query'
            }
        ).select('-__v -password');
        
        if (!updatedEmployee) {
            console.log('Employee not found for update:', req.params.id);
            return res.status(404).json({ 
                success: false,
                message: 'Employee not found' 
            });
        }
        
        console.log('Employee updated successfully:', {
            id: updatedEmployee._id,
            employeeId: updatedEmployee.employeeId,
            name: `${updatedEmployee.firstName} ${updatedEmployee.lastName}`,
            status: updatedEmployee.status
        });
        
        const io = req.app.get('io');
        if (io) {
            io.emit('employee-updated', updatedEmployee);
        }
        
        res.json({
            success: true,
            message: 'Employee updated successfully',
            data: updatedEmployee
        });
    } catch (error) {
        console.error('=== EMPLOYEE UPDATE ERROR ===');
        console.error('Error details:', error);
        
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            const value = error.keyValue[field];
            
            return res.status(400).json({
                success: false,
                message: `${field} already exists`,
                error: `This ${field} (${value}) is already registered`
            });
        }
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: validationErrors
            });
        }
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID format'
            });
        }
        
        res.status(400).json({
            success: false,
            message: 'Error updating employee',
            error: error.message
        });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        console.log('Archiving employee with ID:', req.params.id);
        
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { status: 'Archived' },
            { new: true }
        ).select('-__v -password');
        
        if (!employee) {
            console.log('Employee not found for archiving:', req.params.id);
            return res.status(404).json({ 
                success: false,
                message: 'Employee not found' 
            });
        }

        console.log('Employee archived successfully:', {
            id: employee._id,
            employeeId: employee.employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            newStatus: employee.status
        });
        
        const io = req.app.get('io');
        if (io) {
            io.emit('employee-archived', employee);
        }
        
        res.json({
            success: true,
            message: 'Employee archived successfully',
            data: employee
        });
    } catch (error) {
        console.error('Error archiving employee:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID format'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error archiving employee',
            error: error.message
        });
    }
});

router.patch('/:id/restore', async (req, res) => {
    try {
        console.log('Restoring employee with ID:', req.params.id);
        
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { status: 'Active' },
            { new: true }
        ).select('-__v -password');
        
        if (!employee) {
            console.log('Employee not found for restoration:', req.params.id);
            return res.status(404).json({ 
                success: false,
                message: 'Employee not found' 
            });
        }

        console.log('Employee restored successfully:', {
            id: employee._id,
            employeeId: employee.employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            newStatus: employee.status
        });
        
        const io = req.app.get('io');
        if (io) {
            io.emit('employee-restored', employee);
        }
        
        res.json({
            success: true,
            message: 'Employee restored successfully',
            data: employee
        });
    } catch (error) {
        console.error('Error restoring employee:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID format'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error restoring employee',
            error: error.message
        });
    }
});

router.patch('/:id/rfid', async (req, res) => {
  try {
    const { rfidUid, isRfidAssigned } = req.body;
    
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const updateData = {};
    if (rfidUid !== undefined) updateData.rfidUid = rfidUid;
    if (isRfidAssigned !== undefined) updateData.isRfidAssigned = isRfidAssigned;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v -password');

    if (!updatedEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found during update'
      });
    }

    console.log('RFID updated via PATCH:', {
      employeeId: updatedEmployee.employeeId,
      name: `${updatedEmployee.firstName} ${updatedEmployee.lastName}`,
      rfidUid: updatedEmployee.rfidUid,
      isRfidAssigned: updatedEmployee.isRfidAssigned
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('employee-rfid-updated', updatedEmployee);
    }

    res.json({
      success: true,
      message: 'RFID assignment updated successfully',
      data: updatedEmployee
    });
  } catch (error) {
    console.error('Error updating RFID via PATCH:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating RFID assignment',
      error: error.message
    });
  }
});

router.patch('/:id/rfid/remove', async (req, res) => {
  try {
    const employeeId = req.params.id;
    
    console.log('=== RFID REMOVAL START ===');
    console.log('Removing RFID for employee ID:', employeeId);

    const employee = await Employee.findById(employeeId);
    
    if (!employee) {
      console.log('Employee not found with ID:', employeeId);
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    console.log('Found employee:', {
      employeeId: employee.employeeId,
      name: `${employee.firstName} ${employee.lastName}`,
      currentRfid: employee.rfidUid,
      isRfidAssigned: employee.isRfidAssigned
    });

    if (!employee.isRfidAssigned || !employee.rfidUid) {
      console.log('Employee has no RFID assigned:', employee.employeeId);
      return res.status(400).json({
        success: false,
        message: 'Employee does not have an RFID assigned'
      });
    }

    const removedRfid = employee.rfidUid;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { 
        rfidUid: null,
        isRfidAssigned: false
      },
      { 
        new: true,
        runValidators: true
      }
    );

    if (!updatedEmployee) {
      console.log('Failed to update employee record');
      return res.status(500).json({
        success: false,
        message: 'Failed to update employee record'
      });
    }

    console.log('Employee record updated successfully:', {
      employeeId: updatedEmployee.employeeId,
      newRfid: updatedEmployee.rfidUid,
      newIsRfidAssigned: updatedEmployee.isRfidAssigned
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('employee-rfid-removed', updatedEmployee);
    }

    res.json({
      success: true,
      message: 'RFID assignment removed successfully',
      data: {
        employeeId: updatedEmployee.employeeId,
        name: `${updatedEmployee.firstName} ${updatedEmployee.lastName}`,
        removedRfid: removedRfid,
        removedAt: new Date()
      }
    });

  } catch (error) {
    console.error('=== RFID REMOVAL ERROR ===');
    console.error('RFID removal error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error removing RFID assignment',
      error: error.message
    });
  }
});

router.patch('/:id/password', async (req, res) => {
    try {
        const { password, newPassword } = req.body;
        
        if (!password || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        const employee = await Employee.findById(req.params.id);
        
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const isCurrentPasswordValid = await employee.comparePassword(password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        employee.password = newPassword;
        employee.requiresPasswordChange = false;
        await employee.save();

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Error updating password:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID format'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error updating password',
            error: error.message
        });
    }
});

router.patch('/:id/password/reset', async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        employee.password = '';
        employee.requiresPasswordChange = true;
        await employee.save();

        res.json({
            success: true,
            message: 'Password reset successfully',
            data: {
                employeeId: employee.employeeId,
                defaultPassword: employee.getDefaultPassword()
            }
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID format'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error resetting password',
            error: error.message
        });
    }
});

router.get('/:id/login-history', async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id)
            .select('loginHistory lastLogin')
            .slice('loginHistory', -10);

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json({
            success: true,
            data: {
                lastLogin: employee.lastLogin,
                loginHistory: employee.loginHistory || []
            }
        });
    } catch (error) {
        console.error('Error fetching login history:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID format'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error fetching login history',
            error: error.message
        });
    }
});

router.get('/stats/summary', async (req, res) => {
    try {
        const totalEmployees = await Employee.countDocuments();
        const activeEmployees = await Employee.countDocuments({ status: 'Active' });
        const archivedEmployees = await Employee.countDocuments({ status: 'Archived' });
        const rfidAssigned = await Employee.countDocuments({ isRfidAssigned: true });
        
        const departmentStats = await Employee.aggregate([
            { $match: { status: 'Active' } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        const workTypeStats = await Employee.aggregate([
            { $match: { status: 'Active' } },
            { $group: { _id: '$workType', count: { $sum: 1 } } }
        ]);
        
        res.json({
            success: true,
            data: {
                total: totalEmployees,
                active: activeEmployees,
                archived: archivedEmployees,
                rfidAssigned: rfidAssigned,
                departments: departmentStats,
                workTypes: workTypeStats
            }
        });
    } catch (error) {
        console.error('Error fetching employee statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching employee statistics',
            error: error.message
        });
    }
});

router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const { limit = 20 } = req.query;
        
        if (!query || query.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters long'
            });
        }

        const searchFilter = {
            status: 'Active',
            $or: [
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } },
                { employeeId: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { department: { $regex: query, $options: 'i' } },
                { position: { $regex: query, $options: 'i' } }
            ]
        };

        const employees = await Employee.find(searchFilter)
            .limit(parseInt(limit))
            .select('employeeId firstName lastName department position email')
            .sort({ firstName: 1, lastName: 1 });

        res.json({
            success: true,
            data: employees,
            count: employees.length
        });
    } catch (error) {
        console.error('Error searching employees:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching employees',
            error: error.message
        });
    }
});

router.get('/department/:department', async (req, res) => {
    try {
        const { department } = req.params;
        const { status = 'Active' } = req.query;
        
        const filter = { department, status };
        
        const employees = await Employee.find(filter)
            .select('employeeId firstName lastName position email workType isRfidAssigned')
            .sort({ firstName: 1, lastName: 1 });

        res.json({
            success: true,
            data: employees,
            count: employees.length,
            department: department
        });
    } catch (error) {
        console.error('Error fetching employees by department:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching employees by department',
            error: error.message
        });
    }
});

router.get('/health/status', async (req, res) => {
    try {
        const totalEmployees = await Employee.countDocuments();
        const activeEmployees = await Employee.countDocuments({ status: 'Active' });
        const archivedEmployees = await Employee.countDocuments({ status: 'Archived' });
        const employeesWithRFID = await Employee.countDocuments({ isRfidAssigned: true });
        
        res.json({
            success: true,
            data: {
                status: 'OK',
                database: 'Connected',
                totalEmployees,
                activeEmployees,
                archivedEmployees,
                employeesWithRFID,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            success: false,
            message: 'Service unhealthy',
            error: error.message
        });
    }
});

module.exports = router;
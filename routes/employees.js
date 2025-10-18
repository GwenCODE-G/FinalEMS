const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

// GET all employees with filtering, pagination, and search
router.get('/', async (req, res) => {
    try {
        const { 
            department, 
            status = 'all', // Changed default to 'all'
            search,
            page = 1, 
            limit = 50,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;
        
        let filter = {};
        
        // Filter by status - FIXED: Only filter if status is specified and not 'all'
        if (status && status !== 'all') {
            filter.status = status;
        }
        
        // Filter by department
        if (department && department !== 'all') {
            filter.department = department;
        }
        
        // Search across multiple fields
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

        // Sort configuration
        const sortConfig = {};
        sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        // Execute query with pagination and sorting
        const employees = await Employee.find(filter)
            .sort(sortConfig)
            .limit(limitNum)
            .skip(skip)
            .select('-__v -password');

        // Get total count for pagination
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

// GET single employee by ID
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

// CREATE new employee
router.post('/', async (req, res) => {
    try {
        console.log('=== EMPLOYEE CREATION START ===');
        console.log('Received data:', JSON.stringify(req.body, null, 2));

        // Generate employee ID if not provided
        if (!req.body.employeeId) {
            const departmentCode = getDepartmentCode(req.body.department);
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            req.body.employeeId = `${departmentCode}${randomNum}`;
        }

        // Validate required fields
        const requiredFields = ['firstName', 'lastName', 'email', 'department', 'position', 'workType', 'gender', 'birthday', 'age', 'contactNumber'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Set default work schedule if not provided
        if (!req.body.workSchedule) {
            req.body.workSchedule = {
                Monday: { active: true, start: '07:00', end: '16:00' },
                Tuesday: { active: true, start: '07:00', end: '16:00' },
                Wednesday: { active: true, start: '07:00', end: '16:00' },
                Thursday: { active: true, start: '07:00', end: '16:00' },
                Friday: { active: true, start: '07:00', end: '16:00' },
                Saturday: { active: false, start: '', end: '' },
                Sunday: { active: false, start: '', end: '' }
            };
        }

        // Ensure current address is properly structured
        if (!req.body.currentAddress) {
            req.body.currentAddress = {
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

        // Ensure permanent address is properly structured
        if (!req.body.permanentAddress) {
            req.body.permanentAddress = {
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

        // Ensure emergency contact is properly structured
        if (!req.body.emergencyContact) {
            req.body.emergencyContact = {
                firstName: '',
                lastName: '',
                relationship: '',
                type: 'Landline',
                mobile: '',
                landline: ''
            };
        }

        // Ensure requirements is properly structured
        if (!req.body.requirements) {
            req.body.requirements = {};
        }

        // Ensure teachingLevel is an array
        if (req.body.teachingLevel && !Array.isArray(req.body.teachingLevel)) {
            req.body.teachingLevel = [];
        }

        // Convert age to number
        if (req.body.age) {
            req.body.age = parseInt(req.body.age);
        }

        // Set default date employed if not provided
        if (!req.body.dateEmployed) {
            req.body.dateEmployed = new Date();
        }

        // Handle sameAsCurrent address logic
        if (req.body.sameAsCurrent && req.body.currentAddress) {
            req.body.permanentAddress = { ...req.body.currentAddress };
        }

        console.log('Processed data before creation:', JSON.stringify(req.body, null, 2));

        const newEmployee = new Employee(req.body);
        const savedEmployee = await newEmployee.save();
        
        console.log('Employee saved successfully:', savedEmployee.employeeId);
        
        // Emit socket event if available
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

// UPDATE employee - FIXED: Properly handles status updates
router.put('/:id', async (req, res) => {
    try {
        console.log('=== EMPLOYEE UPDATE START ===');
        console.log('Updating employee ID:', req.params.id);
        console.log('Update data received:', JSON.stringify(req.body, null, 2));

        const updateData = { ...req.body };
        
        // Remove fields that shouldn't be updated
        delete updateData._id;
        delete updateData.employeeId;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        delete updateData.password; // Password should be updated through separate endpoint

        // Log status changes for debugging
        if (updateData.status) {
            console.log(`🔄 Status change requested: ${updateData.status}`);
        }

        // Ensure emergency contact is properly structured
        if (updateData.emergencyContact && typeof updateData.emergencyContact === 'object') {
            updateData.emergencyContact = {
                firstName: updateData.emergencyContact.firstName || '',
                lastName: updateData.emergencyContact.lastName || '',
                relationship: updateData.emergencyContact.relationship || '',
                type: updateData.emergencyContact.type || 'Landline',
                mobile: updateData.emergencyContact.mobile || '',
                landline: updateData.emergencyContact.landline || ''
            };
        }

        // Ensure current address is properly structured
        if (updateData.currentAddress && typeof updateData.currentAddress === 'object') {
            updateData.currentAddress = {
                blkLt: updateData.currentAddress.blkLt || '',
                street: updateData.currentAddress.street || '',
                area: updateData.currentAddress.area || '',
                barangay: updateData.currentAddress.barangay || '',
                city: updateData.currentAddress.city || '',
                province: updateData.currentAddress.province || '',
                postalCode: updateData.currentAddress.postalCode || '',
                country: updateData.currentAddress.country || 'Philippines'
            };
        }

        // Ensure permanent address is properly structured
        if (updateData.permanentAddress && typeof updateData.permanentAddress === 'object') {
            updateData.permanentAddress = {
                blkLt: updateData.permanentAddress.blkLt || '',
                street: updateData.permanentAddress.street || '',
                area: updateData.permanentAddress.area || '',
                barangay: updateData.permanentAddress.barangay || '',
                city: updateData.permanentAddress.city || '',
                province: updateData.permanentAddress.province || '',
                postalCode: updateData.permanentAddress.postalCode || '',
                country: updateData.permanentAddress.country || 'Philippines'
            };
        }

        // Ensure requirements is properly structured
        if (updateData.requirements && typeof updateData.requirements === 'object') {
            updateData.requirements = { ...updateData.requirements };
        }

        // Ensure teachingLevel is an array
        if (updateData.teachingLevel && !Array.isArray(updateData.teachingLevel)) {
            try {
                updateData.teachingLevel = JSON.parse(updateData.teachingLevel);
            } catch (e) {
                updateData.teachingLevel = [];
            }
        }

        // Convert age to number
        if (updateData.age) {
            updateData.age = parseInt(updateData.age);
        }

        // Handle sameAsCurrent address logic
        if (updateData.sameAsCurrent && updateData.currentAddress) {
            updateData.permanentAddress = { ...updateData.currentAddress };
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
        
        console.log('✅ Employee updated successfully:', {
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

// DELETE employee (archive) - FIXED: This should archive, not delete
router.delete('/:id', async (req, res) => {
    try {
        console.log('🔄 Archiving employee with ID:', req.params.id);
        
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

        console.log('✅ Employee archived successfully:', {
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

// RESTORE employee (unarchive)
router.patch('/:id/restore', async (req, res) => {
    try {
        console.log('🔄 Restoring employee with ID:', req.params.id);
        
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

        console.log('✅ Employee restored successfully:', {
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

// GET employee statistics
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

// SEARCH employees
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

// GET employees by department
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

// UPDATE employee RFID assignment
router.patch('/:id/rfid', async (req, res) => {
    try {
        const { rfidUid } = req.body;
        
        if (!rfidUid) {
            return res.status(400).json({
                success: false,
                message: 'RFID UID is required'
            });
        }

        // Check if RFID is already assigned to another employee
        const existingAssignment = await Employee.findOne({
            rfidUid: rfidUid,
            _id: { $ne: req.params.id },
            status: 'Active'
        });

        if (existingAssignment) {
            return res.status(400).json({
                success: false,
                message: `RFID already assigned to ${existingAssignment.firstName} ${existingAssignment.lastName}`
            });
        }

        const updatedEmployee = await Employee.findByIdAndUpdate(
            req.params.id,
            { 
                rfidUid: rfidUid,
                isRfidAssigned: true
            },
            { new: true }
        ).select('-__v -password');

        if (!updatedEmployee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const io = req.app.get('io');
        if (io) {
            io.emit('employee-rfid-updated', updatedEmployee);
        }

        res.json({
            success: true,
            message: 'RFID assigned successfully',
            data: updatedEmployee
        });
    } catch (error) {
        console.error('Error updating employee RFID:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID format'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error updating employee RFID',
            error: error.message
        });
    }
});

// REMOVE RFID assignment
router.patch('/:id/rfid/remove', async (req, res) => {
    try {
        const updatedEmployee = await Employee.findByIdAndUpdate(
            req.params.id,
            { 
                rfidUid: null,
                isRfidAssigned: false
            },
            { new: true }
        ).select('-__v -password');

        if (!updatedEmployee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const io = req.app.get('io');
        if (io) {
            io.emit('employee-rfid-removed', updatedEmployee);
        }

        res.json({
            success: true,
            message: 'RFID assignment removed successfully',
            data: updatedEmployee
        });
    } catch (error) {
        console.error('Error removing RFID assignment:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID format'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error removing RFID assignment',
            error: error.message
        });
    }
});

// UPDATE employee password
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

        // Verify current password
        const isCurrentPasswordValid = await employee.comparePassword(password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
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

// RESET employee password to default
router.patch('/:id/password/reset', async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // This will trigger the pre-save middleware to set the default password
        employee.password = ''; // Empty password triggers default password generation
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

// GET employee login history
router.get('/:id/login-history', async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id)
            .select('loginHistory lastLogin')
            .slice('loginHistory', -10); // Get last 10 login records

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

// HEALTH CHECK endpoint
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

// Helper function to generate department codes
function getDepartmentCode(department) {
    const codes = {
        'Academic Department': 'ACA',
        'Administrative Department': 'ADM',
        'Maintenance and Facilities Department': 'MFD'
    };
    return codes[department] || 'EMP';
}

module.exports = router;
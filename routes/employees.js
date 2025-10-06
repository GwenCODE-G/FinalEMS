const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

router.get('/', async (req, res) => {
    try {
        const { 
            department, 
            status = 'Active',
            search,
            page = 1, 
            limit = 50,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;
        
        let filter = { status: 'Active' };
        
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

        const employees = await Employee.find(filter)
            .sort(sortConfig)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('-__v');

        const total = await Employee.countDocuments(filter);

        res.json({
            success: true,
            data: employees,
            pagination: {
                current: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRecords: total,
                limit: parseInt(limit)
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
        const employee = await Employee.findById(req.params.id).select('-__v');
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

        if (!req.body.employeeId) {
            const departmentCode = getDepartmentCode(req.body.department);
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            req.body.employeeId = `${departmentCode}${randomNum}`;
        }

        const requiredFields = ['firstName', 'lastName', 'email', 'department', 'position', 'workType', 'gender', 'birthday', 'age', 'contactNumber'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

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

        if (!req.body.emergencyContact) {
            req.body.emergencyContact = {
                name: '',
                relationship: '',
                mobile: '',
                landline: ''
            };
        }

        if (req.body.teachingLevel && !Array.isArray(req.body.teachingLevel)) {
            req.body.teachingLevel = [];
        }

        const newEmployee = new Employee(req.body);
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

        const updateData = { ...req.body };
        delete updateData._id;
        delete updateData.employeeId;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        if (updateData.emergencyContact && typeof updateData.emergencyContact === 'object') {
            updateData.emergencyContact = {
                name: updateData.emergencyContact.name || '',
                relationship: updateData.emergencyContact.relationship || '',
                mobile: updateData.emergencyContact.mobile || '',
                landline: updateData.emergencyContact.landline || ''
            };
        }

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

        const updatedEmployee = await Employee.findByIdAndUpdate(
            req.params.id,
            updateData,
            { 
                new: true, 
                runValidators: true,
                context: 'query'
            }
        ).select('-__v');
        
        if (!updatedEmployee) {
            return res.status(404).json({ 
                success: false,
                message: 'Employee not found' 
            });
        }
        
        console.log('Employee updated successfully:', updatedEmployee.employeeId);
        
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
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { status: 'Archived' },
            { new: true }
        ).select('-__v');
        
        if (!employee) {
            return res.status(404).json({ 
                success: false,
                message: 'Employee not found' 
            });
        }
        
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
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { status: 'Active' },
            { new: true }
        ).select('-__v');
        
        if (!employee) {
            return res.status(404).json({ 
                success: false,
                message: 'Employee not found' 
            });
        }
        
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

function getDepartmentCode(department) {
    const codes = {
        'Academic Department': 'ACA',
        'Administrative Department': 'ADM',
        'Maintenance and Facilities Department': 'MFD',
        'Teaching Department': 'TCH',
        'Support Staff': 'SUP'
    };
    return codes[department] || 'EMP';
}

module.exports = router;
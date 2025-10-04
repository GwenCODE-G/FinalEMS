const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

// GET all employees
router.get('/', async (req, res) => {
    try {
        const { department, status, page = 1, limit = 10 } = req.query;
        
        let filter = {};
        if (department) filter.department = department;
        if (status) filter.status = status;

        const employees = await Employee.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Employee.countDocuments(filter);

        res.json({
            success: true,
            data: employees,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                count: employees.length,
                totalRecords: total
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

// GET employee by ID
router.get('/:id', async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
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
        res.status(500).json({ 
            success: false,
            message: 'Error fetching employee',
            error: error.message 
        });
    }
});

// POST create new employee
router.post('/', async (req, res) => {
    try {
        console.log('=== EMPLOYEE CREATION START ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        // Generate employee ID if not provided
        if (!req.body.employeeId) {
            const departmentCode = getDepartmentCode(req.body.department);
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            req.body.employeeId = `${departmentCode}${randomNum}`;
            console.log('Generated employee ID:', req.body.employeeId);
        }

        // Validate required fields
        const requiredFields = ['firstName', 'lastName', 'email', 'department', 'position', 'workType', 'gender', 'birthday', 'age', 'contactNumber'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            console.log('Missing required fields:', missingFields);
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

        // Set default addresses if not provided
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

        // Set default emergency contact if not provided
        if (!req.body.emergencyContact) {
            req.body.emergencyContact = {
                name: '',
                relationship: '',
                mobile: '',
                landline: ''
            };
        }

        console.log('Creating employee with processed data:', req.body);

        const newEmployee = new Employee(req.body);
        const savedEmployee = await newEmployee.save();
        
        console.log('Employee saved successfully:', savedEmployee.employeeId);
        console.log('=== EMPLOYEE CREATION END ===');
        
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
            console.log(`Duplicate key error: ${field} = ${value}`);
            
            return res.status(400).json({
                success: false,
                message: `${field} already exists`,
                error: `This ${field} (${value}) is already registered`
            });
        }
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            console.log('Validation errors:', validationErrors);
            
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

// PUT update employee
router.put('/:id', async (req, res) => {
    try {
        const updatedEmployee = await Employee.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!updatedEmployee) {
            return res.status(404).json({ 
                success: false,
                message: 'Employee not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Employee updated successfully',
            data: updatedEmployee
        });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(400).json({
            success: false,
            message: 'Error updating employee',
            error: error.message
        });
    }
});

// DELETE employee (archive)
router.delete('/:id', async (req, res) => {
    try {
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { status: 'Archived' },
            { new: true }
        );
        
        if (!employee) {
            return res.status(404).json({ 
                success: false,
                message: 'Employee not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Employee archived successfully',
            data: employee
        });
    } catch (error) {
        console.error('Error archiving employee:', error);
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
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { status: 'Active' },
            { new: true }
        );
        
        if (!employee) {
            return res.status(404).json({ 
                success: false,
                message: 'Employee not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Employee restored successfully',
            data: employee
        });
    } catch (error) {
        console.error('Error restoring employee:', error);
        res.status(500).json({
            success: false,
            message: 'Error restoring employee',
            error: error.message
        });
    }
});

// Helper function to generate department codes
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
const express = require('express');
const router = express.Router();
const Department = require('../models/Department');

// GET all departments
router.get('/', async (req, res) => {
    try {
        const departments = await Department.find().sort({ name: 1 });
        res.json({
            success: true,
            count: departments.length,
            data: departments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// GET single department by ID
router.get('/:id', async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        
        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }
        
        res.json({
            success: true,
            data: department
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// CREATE new department
router.post('/', async (req, res) => {
    try {
        const department = new Department(req.body);
        const savedDepartment = await department.save();
        
        res.status(201).json({
            success: true,
            message: 'Department created successfully',
            data: savedDepartment
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Department name already exists'
            });
        }
        res.status(400).json({
            success: false,
            message: 'Error creating department',
            error: error.message
        });
    }
});

// UPDATE department
router.put('/:id', async (req, res) => {
    try {
        const department = await Department.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Department updated successfully',
            data: department
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error updating department',
            error: error.message
        });
    }
});

// DELETE department
router.delete('/:id', async (req, res) => {
    try {
        const department = await Department.findByIdAndDelete(req.params.id);
        
        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Department deleted successfully',
            data: department
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting department',
            error: error.message
        });
    }
});

module.exports = router;
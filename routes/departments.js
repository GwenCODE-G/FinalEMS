const express = require('express');
const router = express.Router();
const Department = require('../models/Department');

router.get('/', async (req, res) => {
  try {
    console.log('Fetching all departments...');
    const departments = await Department.find().sort({ name: 1 });
    console.log(`Found ${departments.length} departments`);
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ 
      message: 'Error fetching departments',
      error: error.message 
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    res.json(department);
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ 
      message: 'Error fetching department',
      error: error.message 
    });
  }
});

router.post('/', async (req, res) => {
  try {
    console.log('Creating new department:', req.body);
    
    if (!req.body.name || !req.body.description) {
      return res.status(400).json({
        message: 'Name and description are required'
      });
    }
    
    const department = new Department({
      name: req.body.name.trim(),
      description: req.body.description.trim(),
      employeeCount: req.body.employeeCount || 0
    });
    
    const savedDepartment = await department.save();
    console.log('Department created successfully:', savedDepartment._id);
    
    res.status(201).json({
      message: 'Department created successfully',
      department: savedDepartment
    });
  } catch (error) {
    console.error('Error creating department:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Department with this name already exists'
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ 
      message: 'Error creating department',
      error: error.message 
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    console.log('Updating department:', req.params.id, req.body);
    
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    const updateData = {
      name: req.body.name?.trim() || department.name,
      description: req.body.description?.trim() || department.description
    };
    
    if (req.body.employeeCount !== undefined) {
      updateData.employeeCount = parseInt(req.body.employeeCount) || 0;
    }
    
    const updatedDepartment = await Department.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    console.log('Department updated successfully');
    
    res.json({
      message: 'Department updated successfully',
      department: updatedDepartment
    });
  } catch (error) {
    console.error('Error updating department:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Department with this name already exists'
      });
    }
    
    res.status(500).json({ 
      message: 'Error updating department',
      error: error.message 
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    console.log('Deleting department:', req.params.id);
    
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    if (department.employeeCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete department with existing employees'
      });
    }
    
    await Department.findByIdAndDelete(req.params.id);
    console.log('Department deleted successfully');
    
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ 
      message: 'Error deleting department',
      error: error.message 
    });
  }
});

module.exports = router;
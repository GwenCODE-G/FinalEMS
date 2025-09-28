const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Improved storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

// Improved file filter
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files (JPEG, JPG, PNG, GIF) are allowed!'));
};

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only 1 file
  },
  fileFilter: fileFilter
});

// Improved error handling for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size must be less than 5MB' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Only one file is allowed' });
    }
  }
  if (err.message === 'Only image files (JPEG, JPG, PNG, GIF) are allowed!') {
    return res.status(400).json({ message: err.message });
  }
  next(err);
};

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

// POST create new employee
router.post('/', upload.single('profilePicture'), handleMulterError, async (req, res) => {
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

    // Handle profile picture
    if (req.file) {
      employeeData.profilePicture = req.file.filename;
      console.log('Profile picture saved:', req.file.filename);
    }

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
    
    // Clean up uploaded file if employee creation fails
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete uploaded file:', err);
      });
    }
    
    if (error.code === 11000) {
      if (error.keyPattern.employeeId) {
        return res.status(409).json({ message: 'Employee ID already exists. Please try again.' });
      }
      if (error.keyPattern.email) {
        return res.status(409).json({ message: 'Email already registered.' });
      }
    }
    res.status(400).json({ message: error.message || 'Failed to create employee.' });
  }
});

// PUT update employee
router.put('/:id', upload.single('profilePicture'), handleMulterError, async (req, res) => {
  try {
    const employeeId = req.params.id;
    const employeeToUpdate = await Employee.findById(employeeId);
    if (!employeeToUpdate) {
      // Clean up uploaded file if employee not found
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Failed to delete uploaded file:', err);
        });
      }
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const parsedBody = parseJsonFields(req.body);
    const oldDepartment = employeeToUpdate.department;

    const updateData = {
      ...parsedBody,
      age: parseInt(parsedBody.age),
      teachingLevel: Array.isArray(parsedBody.teachingLevel) ? parsedBody.teachingLevel : (parsedBody.teachingLevel ? [parsedBody.teachingLevel] : []),
    };

    // Handle profile picture update
    if (req.file) {
      // Delete old profile picture if it exists
      if (employeeToUpdate.profilePicture) {
        const oldImagePath = path.join(__dirname, '../uploads', employeeToUpdate.profilePicture);
        fs.unlink(oldImagePath, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.error('Failed to delete old profile picture:', err);
          }
        });
      }
      updateData.profilePicture = req.file.filename;
      console.log('Profile picture updated to:', req.file.filename);
    } else if (parsedBody.removeProfilePicture === 'true' || parsedBody.profilePicture === 'null') {
      // Remove profile picture if requested
      if (employeeToUpdate.profilePicture) {
        const oldImagePath = path.join(__dirname, '../uploads', employeeToUpdate.profilePicture);
        fs.unlink(oldImagePath, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.error('Failed to delete old profile picture:', err);
          }
        });
      }
      updateData.profilePicture = null;
    }

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
    
    // Clean up uploaded file if update fails
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete uploaded file:', err);
      });
    }
    
    if (error.code === 11000) {
      if (error.keyPattern.employeeId) {
        return res.status(409).json({ message: 'Employee ID already exists.' });
      }
      if (error.keyPattern.email) {
        return res.status(409).json({ message: 'Email already registered.' });
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

module.exports = router;
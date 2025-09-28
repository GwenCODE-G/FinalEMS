const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Department name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Department description is required'],
    trim: true
  },
  employeeCount: {
    type: Number,
    default: 0,
    min: [0, 'Employee count cannot be negative']
  }
}, {
  collection: 'EMS_Department',
  timestamps: true
});

module.exports = mongoose.model('Department', departmentSchema);
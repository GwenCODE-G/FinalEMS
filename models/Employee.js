const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  blkLt: String,
  street: String,
  area: String,
  barangay: String,
  city: String,
  province: String,
  postalCode: String,
  country: String
});

const emergencyContactSchema = new mongoose.Schema({
  name: String,
  relationship: String,
  mobile: String,
  landline: String
});

const workScheduleSchema = new mongoose.Schema({
  Monday: { 
    active: { type: Boolean, default: true },
    start: { type: String, default: '07:00' },
    end: { type: String, default: '16:00' }
  },
  Tuesday: { 
    active: { type: Boolean, default: true },
    start: { type: String, default: '07:00' },
    end: { type: String, default: '16:00' }
  },
  Wednesday: { 
    active: { type: Boolean, default: true },
    start: { type: String, default: '07:00' },
    end: { type: String, default: '16:00' }
  },
  Thursday: { 
    active: { type: Boolean, default: true },
    start: { type: String, default: '07:00' },
    end: { type: String, default: '16:00' }
  },
  Friday: { 
    active: { type: Boolean, default: true },
    start: { type: String, default: '07:00' },
    end: { type: String, default: '16:00' }
  },
  Saturday: { 
    active: { type: Boolean, default: false },
    start: { type: String, default: '' },
    end: { type: String, default: '' }
  },
  Sunday: { 
    active: { type: Boolean, default: false },
    start: { type: String, default: '' },
    end: { type: String, default: '' }
  }
});

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  middleName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: true
  },
  birthday: {
    type: Date,
    required: true
  },
  age: {
    type: Number,
    required: true,
    min: 18
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true
  },
  emergencyContact: emergencyContactSchema,
  philhealth: {
    type: String,
    trim: true
  },
  sss: {
    type: String,
    trim: true
  },
  pagibig: {
    type: String,
    trim: true
  },
  currentAddress: addressSchema,
  permanentAddress: addressSchema,
  department: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  teachingLevel: [{
    type: String,
    enum: ['Pre-Kindergarten', 'Kindergarten', 'Elementary', 'High-School', 'Senior High-School']
  }],
  workType: {
    type: String,
    enum: ['Full-Time', 'Part-Time'],
    required: true
  },
  workSchedule: {
    type: workScheduleSchema,
    default: () => ({
      Monday: { active: true, start: '07:00', end: '16:00' },
      Tuesday: { active: true, start: '07:00', end: '16:00' },
      Wednesday: { active: true, start: '07:00', end: '16:00' },
      Thursday: { active: true, start: '07:00', end: '16:00' },
      Friday: { active: true, start: '07:00', end: '16:00' },
      Saturday: { active: false, start: '', end: '' },
      Sunday: { active: false, start: '', end: '' }
    })
  },
  profilePicture: String,
  status: {
    type: String,
    enum: ['Active', 'Archived'],
    default: 'Active'
  },
  rfidUid: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true
  },
  isRfidAssigned: {
    type: Boolean,
    default: false
  },
  dateEmployed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'EMS_Employee'
});

// Index for better performance
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ rfidUid: 1 });
employeeSchema.index({ status: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
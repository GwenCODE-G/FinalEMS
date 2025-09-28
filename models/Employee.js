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

const workDaySchema = new mongoose.Schema({
  Monday: { type: Boolean, default: false },
  Tuesday: { type: Boolean, default: false },
  Wednesday: { type: Boolean, default: false },
  Thursday: { type: Boolean, default: false },
  Friday: { type: Boolean, default: false },
  Saturday: { type: Boolean, default: false },
  Sunday: { type: Boolean, default: false }
});

const workScheduleSchema = new mongoose.Schema({
  Monday: { 
    start: { type: String, default: '07:00' },
    end: { type: String, default: '17:00' }
  },
  Tuesday: { 
    start: { type: String, default: '07:00' },
    end: { type: String, default: '17:00' }
  },
  Wednesday: { 
    start: { type: String, default: '07:00' },
    end: { type: String, default: '17:00' }
  },
  Thursday: { 
    start: { type: String, default: '07:00' },
    end: { type: String, default: '17:00' }
  },
  Friday: { 
    start: { type: String, default: '07:00' },
    end: { type: String, default: '17:00' }
  },
  Saturday: { 
    start: { type: String, default: '07:00' },
    end: { type: String, default: '17:00' }
  },
  Sunday: { 
    start: { type: String, default: '07:00' },
    end: { type: String, default: '17:00' }
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
    required: true
  },
  middleName: String,
  lastName: {
    type: String,
    required: true
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
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  emergencyContact: emergencyContactSchema,
  philhealth: String,
  sss: String,
  pagibig: String,
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
  teachingLevel: [String],
  workType: {
    type: String,
    enum: ['Full-Time', 'Part-Time'],
    required: true
  },
  workDays: {
    type: workDaySchema,
    default: () => ({
      Monday: true,
      Tuesday: true,
      Wednesday: true,
      Thursday: true,
      Friday: true,
      Saturday: false,
      Sunday: false
    })
  },
  workSchedule: {
    type: workScheduleSchema,
    default: () => ({
      Monday: { start: '08:00', end: '17:00' },
      Tuesday: { start: '08:00', end: '17:00' },
      Wednesday: { start: '08:00', end: '17:00' },
      Thursday: { start: '08:00', end: '17:00' },
      Friday: { start: '08:00', end: '17:00' },
      Saturday: { start: '09:00', end: '13:00' },
      Sunday: { start: '00:00', end: '00:00' }
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
    sparse: true
  },
  isRfidAssigned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'EMS_Employee'
});

module.exports = mongoose.model('Employee', employeeSchema);
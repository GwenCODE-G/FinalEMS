const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  blkLt: {
    type: String,
    trim: true
  },
  street: {
    type: String,
    trim: true
  },
  area: {
    type: String,
    trim: true
  },
  barangay: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true,
    required: true
  },
  province: {
    type: String,
    trim: true,
    required: true
  },
  postalCode: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    default: 'Philippines',
    trim: true
  }
});

const emergencyContactSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  relationship: {
    type: String,
    trim: true
  },
  mobile: {
    type: String,
    trim: true
  },
  landline: {
    type: String,
    trim: true
  }
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
    unique: true,
    trim: true,
    uppercase: true
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
  civilStatus: {
    type: String,
    enum: ['Single', 'Married', 'Divorced', 'Widowed', 'Separated', ''],
    default: ''
  },
  birthday: {
    type: Date,
    required: true
  },
  age: {
    type: Number,
    required: true,
    min: 0
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
employeeSchema.index({ email: 1 });
employeeSchema.index({ rfidUid: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ createdAt: -1 });

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.middleName ? this.middleName + ' ' : ''}${this.lastName}`.trim();
});

// Method to check if employee is active
employeeSchema.methods.isActive = function() {
  return this.status === 'Active';
};

// Static method to find by RFID
employeeSchema.statics.findByRFID = function(rfidUid) {
  return this.findOne({ rfidUid: rfidUid.toUpperCase(), status: 'Active' });
};

// Static method to find by employee ID
employeeSchema.statics.findByEmployeeId = function(employeeId) {
  return this.findOne({ employeeId: employeeId.toUpperCase() });
};

module.exports = mongoose.model('Employee', employeeSchema);
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  blkLt: { type: String, trim: true },
  street: { type: String, trim: true },
  area: { type: String, trim: true },
  barangay: { type: String, trim: true },
  city: { type: String, trim: true, required: true },
  province: { type: String, trim: true, required: true },
  postalCode: { type: String, trim: true },
  country: { type: String, default: 'Philippines', trim: true }
});

const emergencyContactSchema = new mongoose.Schema({
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  relationship: { type: String, trim: true },
  type: { type: String, enum: ['Mobile', 'Landline'], default: 'Landline' },
  mobile: { type: String, trim: true },
  landline: { type: String, trim: true }
});

const workScheduleSchema = new mongoose.Schema({
  Monday: { active: { type: Boolean, default: true }, start: { type: String, default: '07:00' }, end: { type: String, default: '16:00' } },
  Tuesday: { active: { type: Boolean, default: true }, start: { type: String, default: '07:00' }, end: { type: String, default: '16:00' } },
  Wednesday: { active: { type: Boolean, default: true }, start: { type: String, default: '07:00' }, end: { type: String, default: '16:00' } },
  Thursday: { active: { type: Boolean, default: true }, start: { type: String, default: '07:00' }, end: { type: String, default: '16:00' } },
  Friday: { active: { type: Boolean, default: true }, start: { type: String, default: '07:00' }, end: { type: String, default: '16:00' } },
  Saturday: { active: { type: Boolean, default: false }, start: { type: String, default: '' }, end: { type: String, default: '' } },
  Sunday: { active: { type: Boolean, default: false }, start: { type: String, default: '' }, end: { type: String, default: '' } }
});

const requirementsSchema = new mongoose.Schema({
  tinRequirements: {
    presentForm: { type: Boolean, default: false },
    submitCopy: { type: Boolean, default: false },
    notYetSubmitted: { type: Boolean, default: true }
  },
  sssRequirements: {
    presentForm: { type: Boolean, default: false },
    presentID: { type: Boolean, default: false },
    submitCopy: { type: Boolean, default: false },
    notYetSubmitted: { type: Boolean, default: true }
  },
  philhealthRequirements: {
    presentMDR: { type: Boolean, default: false },
    presentID: { type: Boolean, default: false },
    submitCopy: { type: Boolean, default: false },
    notYetSubmitted: { type: Boolean, default: true }
  },
  pagibigRequirements: {
    presentMDF: { type: Boolean, default: false },
    presentID: { type: Boolean, default: false },
    submitCopy: { type: Boolean, default: false },
    notYetSubmitted: { type: Boolean, default: true }
  },
  healthCardRequirements: {
    presentOriginal: { type: Boolean, default: false },
    submitCopy: { type: Boolean, default: false },
    notYetSubmitted: { type: Boolean, default: true }
  },
  professionalIDRequirements: {
    presentOriginal: { type: Boolean, default: false },
    submitCopy: { type: Boolean, default: false },
    notYetSubmitted: { type: Boolean, default: true }
  },
  driversLicenseRequirements: {
    presentOriginal: { type: Boolean, default: false },
    submitCopy: { type: Boolean, default: false },
    notYetSubmitted: { type: Boolean, default: true }
  },
  barangayWorkingPermitRequirements: {
    submitCopy: { type: Boolean, default: false },
    submitOriginal: { type: Boolean, default: false },
    notYetSubmitted: { type: Boolean, default: true }
  },
  birthCertificateRequirements: {
    presentOriginal: { type: Boolean, default: false },
    submitCopy: { type: Boolean, default: false },
    notYetSubmitted: { type: Boolean, default: true }
  },
  policeNbiRequirements: {
    submitCopy: { type: Boolean, default: false },
    submitOriginal: { type: Boolean, default: false },
    notYetSubmitted: { type: Boolean, default: true }
  },
  barangayClearanceRequirements: {
    submitCopy: { type: Boolean, default: false },
    submitOriginal: { type: Boolean, default: false },
    notYetSubmitted: { type: Boolean, default: true }
  },
  cedulaRequirements: {
    presentOriginal: { type: Boolean, default: false },
    submitCopy: { type: Boolean, default: false },
    notYetSubmitted: { type: Boolean, default: true }
  }
}, { _id: false });

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, trim: true },
  lastName: { type: String, required: true, trim: true },
  suffix: { type: String, trim: true },
  gender: { type: String, enum: ['Male', 'Female'], required: true },
  civilStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed', 'Separated', ''], default: '' },
  religion: { type: String, required: true, trim: true },
  birthday: { type: Date, required: true },
  birthplace: { type: String, required: true, trim: true },
  age: { type: Number, required: true, min: 18, max: 100 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  contactNumber: { type: String, required: true, trim: true },
  password: {
    type: String,
    required: false
  },
  requiresPasswordChange: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginHistory: [{
    timestamp: Date,
    ipAddress: String,
    userAgent: String
  }],
  tin: { type: String, trim: true },
  sss: { type: String, trim: true },
  philhealth: { type: String, trim: true },
  pagibig: { type: String, trim: true },
  emergencyContact: emergencyContactSchema,
  currentAddress: { type: addressSchema, required: true },
  permanentAddress: addressSchema,
  sameAsCurrent: { type: Boolean, default: false },
  department: { type: String, required: true, trim: true },
  position: { type: String, required: true, trim: true },
  teachingLevel: [{ type: String, enum: ['Pre-Kindergarten', 'Kindergarten', 'Elementary', 'High-School', 'Senior High-School'] }],
  workType: { type: String, enum: ['Full-Time', 'Part-Time'], required: true },
  workSchedule: { type: workScheduleSchema, default: () => ({
    Monday: { active: true, start: '07:00', end: '16:00' },
    Tuesday: { active: true, start: '07:00', end: '16:00' },
    Wednesday: { active: true, start: '07:00', end: '16:00' },
    Thursday: { active: true, start: '07:00', end: '16:00' },
    Friday: { active: true, start: '07:00', end: '16:00' },
    Saturday: { active: false, start: '', end: '' },
    Sunday: { active: false, start: '', end: '' }
  })},
  profilePicture: String,
  requirements: { 
    type: requirementsSchema, 
    default: () => ({
      tinRequirements: { presentForm: false, submitCopy: false, notYetSubmitted: true },
      sssRequirements: { presentForm: false, presentID: false, submitCopy: false, notYetSubmitted: true },
      philhealthRequirements: { presentMDR: false, presentID: false, submitCopy: false, notYetSubmitted: true },
      pagibigRequirements: { presentMDF: false, presentID: false, submitCopy: false, notYetSubmitted: true },
      healthCardRequirements: { presentOriginal: false, submitCopy: false, notYetSubmitted: true },
      professionalIDRequirements: { presentOriginal: false, submitCopy: false, notYetSubmitted: true },
      driversLicenseRequirements: { presentOriginal: false, submitCopy: false, notYetSubmitted: true },
      barangayWorkingPermitRequirements: { submitCopy: false, submitOriginal: false, notYetSubmitted: true },
      birthCertificateRequirements: { presentOriginal: false, submitCopy: false, notYetSubmitted: true },
      policeNbiRequirements: { submitCopy: false, submitOriginal: false, notYetSubmitted: true },
      barangayClearanceRequirements: { submitCopy: false, submitOriginal: false, notYetSubmitted: true },
      cedulaRequirements: { presentOriginal: false, submitCopy: false, notYetSubmitted: true }
    })
  },
  dateStart: { type: Date },
  dateSeparated: { type: Date },
  dateEmployed: { type: Date, default: Date.now },
  status: { type: String, enum: ['Active', 'Archived'], default: 'Active' },
  rfidUid: { 
    type: String, 
    unique: true, 
    sparse: true, 
    trim: true, 
    uppercase: true,
    set: function(value) {
      if (!value) return value;
      const cleanUid = value.replace(/\s/g, '').toUpperCase();
      if (cleanUid.length === 8) {
        return cleanUid.match(/.{1,2}/g)?.join(' ').toUpperCase() || cleanUid;
      }
      return cleanUid;
    }
  },
  isRfidAssigned: { type: Boolean, default: false },
  createdBy: { type: String, default: 'System' },
  lastModifiedBy: { type: String, default: 'System' }
}, {
  timestamps: true,
  collection: 'EMS_Employee',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ email: 1 });
employeeSchema.index({ rfidUid: 1 }, { sparse: true });
employeeSchema.index({ status: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ position: 1 });

employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.middleName ? this.middleName + ' ' : ''}${this.lastName}`.trim();
});

employeeSchema.virtual('displayName').get(function() {
  return `${this.lastName}, ${this.firstName}${this.middleName ? ' ' + this.middleName : ''}`;
});

employeeSchema.virtual('formattedBirthday').get(function() {
  return this.birthday ? this.birthday.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A';
});

employeeSchema.virtual('calculatedAge').get(function() {
  if (!this.birthday) return null;
  const today = new Date();
  const birthDate = new Date(this.birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

employeeSchema.virtual('employmentDuration').get(function() {
  if (!this.dateEmployed) return null;
  const today = new Date();
  const employedDate = new Date(this.dateEmployed);
  const diffTime = Math.abs(today - employedDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''}${months > 0 ? `, ${months} month${months > 1 ? 's' : ''}` : ''}`;
  }
  return `${months} month${months > 1 ? 's' : ''}`;
});

employeeSchema.virtual('normalizedRfidUid').get(function() {
  if (!this.rfidUid) return null;
  return this.rfidUid.replace(/\s/g, '').toUpperCase();
});

employeeSchema.pre('save', async function(next) {
  if (!this.isModified('password') && !this.isNew) {
    return next();
  }

  if (this.password && this.password.startsWith('$2b$')) {
    console.log('Password already hashed, skipping re-hash');
    return next();
  }

  try {
    if (this.isNew && (!this.password || this.password.trim() === '')) {
      const defaultPassword = `Brighton${this.employeeId ? this.employeeId.slice(-4) : '1234'}`;
      console.log(`Setting default password for new employee: ${defaultPassword}`);
      
      const saltRounds = 12;
      this.password = await bcrypt.hash(defaultPassword, saltRounds);
      this.requiresPasswordChange = true;
      
      console.log('Default password set successfully');
    } 
    else if (this.isModified('password') && this.password && this.password.trim() !== '') {
      console.log('Hashing modified password');
      const saltRounds = 12;
      this.password = await bcrypt.hash(this.password, saltRounds);
      console.log('Password hashed successfully');
    }
    
    next();
  } catch (error) {
    console.error('Error in password middleware:', error);
    next(error);
  }
});

employeeSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    console.log('No password hash stored for employee');
    return false;
  }
  
  if (!candidatePassword || candidatePassword.trim() === '') {
    return false;
  }
  
  try {
    const result = await bcrypt.compare(candidatePassword, this.password);
    return result;
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

employeeSchema.methods.getDefaultPassword = function() {
  return `Brighton${this.employeeId ? this.employeeId.slice(-4) : '1234'}`;
};

employeeSchema.pre('save', function(next) {
  if (this.birthday && this.isModified('birthday')) {
    const today = new Date();
    const birthDate = new Date(this.birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    this.age = age;
  }
  next();
});

employeeSchema.pre('save', function(next) {
  if (this.rfidUid && this.isModified('rfidUid')) {
    const cleanUid = this.rfidUid.replace(/\s/g, '');
    
    if (cleanUid.length === 8) {
      this.rfidUid = cleanUid.match(/.{1,2}/g).join(' ');
      console.log(`Formatted RFID UID: "${this.rfidUid}" (Normalized: "${cleanUid}")`);
    } else {
      this.rfidUid = cleanUid;
      console.log(`Invalid RFID UID length: ${cleanUid}, expected 8 characters`);
    }
    
    this.isRfidAssigned = true;
  } else if (!this.rfidUid && this.isModified('rfidUid')) {
    this.isRfidAssigned = false;
    console.log('RFID UID removed, employee unassigned');
  }

  if (this.isModified() && !this.lastModifiedBy) {
    this.lastModifiedBy = 'System';
  }

  if (this.sameAsCurrent && this.currentAddress) {
    this.permanentAddress = { ...this.currentAddress.toObject() };
  }

  next();
});

employeeSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.middleName ? this.middleName + ' ' : ''}${this.lastName}`.trim();
};

employeeSchema.methods.archive = function() {
  this.status = 'Archived';
  return this.save();
};

employeeSchema.methods.restore = function() {
  this.status = 'Active';
  return this.save();
};

employeeSchema.methods.isActive = function() {
  return this.status === 'Active';
};

employeeSchema.methods.hasRFID = function() {
  return this.isRfidAssigned && this.rfidUid;
};

employeeSchema.methods.getNormalizedRfidUid = function() {
  if (!this.rfidUid) return null;
  return this.rfidUid.replace(/\s/g, '').toUpperCase();
};

employeeSchema.methods.getScheduleForDay = function(day) {
  const normalizedDay = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
  return this.workSchedule[normalizedDay];
};

employeeSchema.methods.worksOnDay = function(day) {
  const schedule = this.getScheduleForDay(day);
  return schedule ? schedule.active : false;
};

employeeSchema.methods.doesRfidMatch = function(scannedUid) {
  if (!this.rfidUid || !scannedUid) return false;
  
  const normalizedScanned = scannedUid.replace(/\s/g, '').toUpperCase();
  const normalizedAssigned = this.rfidUid.replace(/\s/g, '').toUpperCase();
  
  console.log(`RFID Matching: "${normalizedScanned}" vs "${normalizedAssigned}"`);
  
  return normalizedScanned === normalizedAssigned;
};

employeeSchema.statics.findActive = function() {
  return this.find({ status: 'Active' });
};

employeeSchema.statics.findArchived = function() {
  return this.find({ status: 'Archived' });
};

employeeSchema.statics.findByDepartment = function(department) {
  return this.find({ department, status: 'Active' });
};

employeeSchema.statics.findByPosition = function(position) {
  return this.find({ position, status: 'Active' });
};

employeeSchema.statics.findByRFID = function(rfidUid) {
  if (!rfidUid) return null;
  
  const normalizedUid = rfidUid.replace(/\s/g, '').toUpperCase();
  console.log(`Searching employee by RFID: "${normalizedUid}"`);
  
  return this.findOne({ 
    status: 'Active',
    $or: [
      { rfidUid: { $regex: new RegExp(`^${normalizedUid}$`, 'i') } },
      { rfidUid: { $regex: new RegExp(normalizedUid, 'i') } }
    ]
  });
};

employeeSchema.statics.findByRFIDComprehensive = async function(rfidUid) {
  if (!rfidUid) return null;
  
  const normalizedUid = rfidUid.replace(/\s/g, '').toUpperCase();
  console.log(`Comprehensive RFID search: "${normalizedUid}"`);
  
  let employee = await this.findOne({
    status: 'Active',
    isRfidAssigned: true
  });
  
  if (!employee) {
    const allEmployees = await this.find({ 
      status: 'Active',
      isRfidAssigned: true 
    });
    
    for (const emp of allEmployees) {
      if (emp.doesRfidMatch(normalizedUid)) {
        employee = emp;
        console.log(`Found employee with comprehensive matching: ${emp.employeeId}`);
        break;
      }
    }
  }
  
  return employee;
};

employeeSchema.statics.findByEmployeeId = function(employeeId) {
  return this.findOne({ employeeId: employeeId.toUpperCase() });
};

employeeSchema.statics.withRFID = function() {
  return this.find({ isRfidAssigned: true, status: 'Active' });
};

employeeSchema.statics.withoutRFID = function() {
  return this.find({ isRfidAssigned: false, status: 'Active' });
};

employeeSchema.statics.search = function(query) {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    $or: [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { employeeId: searchRegex },
      { email: searchRegex },
      { department: searchRegex },
      { position: searchRegex }
    ],
    status: 'Active'
  });
};

employeeSchema.statics.getAllRfidAssignments = function() {
  return this.find({ 
    isRfidAssigned: true,
    status: 'Active'
  }).select('employeeId firstName lastName rfidUid department position');
};

employeeSchema.statics.isRfidAvailable = async function(rfidUid, excludeEmployeeId = null) {
  if (!rfidUid) return true;
  
  const normalizedUid = rfidUid.replace(/\s/g, '').toUpperCase();
  
  const query = {
    status: 'Active',
    isRfidAssigned: true,
    $or: [
      { rfidUid: { $regex: new RegExp(`^${normalizedUid}$`, 'i') } },
      { rfidUid: { $regex: new RegExp(normalizedUid, 'i') } }
    ]
  };
  
  if (excludeEmployeeId) {
    query.employeeId = { $ne: excludeEmployeeId };
  }
  
  const existing = await this.findOne(query);
  return !existing;
};

employeeSchema.pre('save', function(next) {
  if (this.rfidUid && this.isRfidAssigned) {
    const cleanUid = this.rfidUid.replace(/\s/g, '');
    if (cleanUid.length !== 8) {
      const error = new Error(`RFID UID must be exactly 8 characters long. Got: ${cleanUid.length} characters`);
      return next(error);
    }
    
    if (!/^[0-9A-F]{8}$/i.test(cleanUid)) {
      const error = new Error(`RFID UID must contain only hexadecimal characters (0-9, A-F). Got: ${cleanUid}`);
      return next(error);
    }
  }

  next();
});

module.exports = mongoose.model('Employee', employeeSchema);
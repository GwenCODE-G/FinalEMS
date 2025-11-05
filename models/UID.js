const mongoose = require('mongoose');

const uidSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
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
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  employeeName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  deactivatedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  collectionName: {
    type: String,
    default: 'EMS_UID'
  },
  databaseName: {
    type: String,
    default: 'BrightonSystem'
  }
}, {
  timestamps: true,
  collection: 'EMS_UID',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
uidSchema.index({ uid: 1, isActive: 1 });
uidSchema.index({ employeeId: 1 });
uidSchema.index({ isActive: 1 });
uidSchema.index({ department: 1 });
uidSchema.index({ collectionName: 1 });

// ==================== VIRTUALS ====================

uidSchema.virtual('formattedUid').get(function() {
  if (!this.uid) return '';
  const cleanUid = this.uid.replace(/\s/g, '').toUpperCase();
  if (cleanUid.length === 8) {
    return cleanUid.match(/.{1,2}/g)?.join(' ').toUpperCase() || cleanUid;
  }
  return this.uid.toUpperCase();
});

uidSchema.virtual('normalizedUid').get(function() {
  if (!this.uid) return '';
  return this.uid.replace(/\s/g, '').toUpperCase();
});

uidSchema.virtual('assignmentDuration').get(function() {
  if (!this.assignedAt) return null;
  const start = new Date(this.assignedAt);
  const end = this.deactivatedAt ? new Date(this.deactivatedAt) : new Date();
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

uidSchema.virtual('isCurrentlyActive').get(function() {
  return this.isActive && !this.deactivatedAt;
});

// ==================== METHODS ====================

// Method to deactivate RFID assignment
uidSchema.methods.deactivate = function(reason = 'Manual deactivation') {
  this.isActive = false;
  this.deactivatedAt = new Date();
  this.lastModified = new Date();
  return this.save();
};

// Method to reactivate RFID assignment
uidSchema.methods.reactivate = function() {
  this.isActive = true;
  this.deactivatedAt = null;
  this.lastModified = new Date();
  return this.save();
};

// Method to check if UID matches
uidSchema.methods.doesUidMatch = function(scannedUid) {
  if (!this.uid || !scannedUid) return false;
  
  const normalizedScanned = scannedUid.replace(/\s/g, '').toUpperCase();
  const normalizedAssigned = this.uid.replace(/\s/g, '').toUpperCase();
  
  console.log(`UID Matching: "${normalizedScanned}" vs "${normalizedAssigned}"`);
  
  return normalizedScanned === normalizedAssigned;
};

// Method to get assignment info
uidSchema.methods.getAssignmentInfo = function() {
  return {
    uid: this.uid,
    formattedUid: this.formattedUid,
    normalizedUid: this.normalizedUid,
    employeeId: this.employeeId,
    employeeName: this.employeeName,
    department: this.department,
    position: this.position,
    assignedAt: this.assignedAt,
    isActive: this.isActive,
    deactivatedAt: this.deactivatedAt,
    assignmentDuration: this.assignmentDuration,
    collection: this.collectionName,
    database: this.databaseName
  };
};

// ==================== STATIC METHODS ====================

// Find by UID (case-insensitive)
uidSchema.statics.findByUID = function(uid) {
  const normalizedUid = uid.replace(/\s/g, '').toUpperCase();
  return this.findOne({ 
    uid: { $regex: new RegExp(`^${normalizedUid}$`, 'i') },
    isActive: true 
  });
};

// Find by employee ID
uidSchema.statics.findByEmployeeId = function(employeeId) {
  return this.findOne({ 
    employeeId: employeeId,
    isActive: true 
  });
};

// Find all active assignments
uidSchema.statics.findActiveAssignments = function() {
  return this.find({ isActive: true }).sort({ assignedAt: -1 });
};

// Find all inactive assignments
uidSchema.statics.findInactiveAssignments = function() {
  return this.find({ isActive: false }).sort({ deactivatedAt: -1 });
};

// Find assignments by department
uidSchema.statics.findByDepartment = function(department) {
  return this.find({ 
    department: department,
    isActive: true 
  }).sort({ employeeName: 1 });
};

// Check if UID is available
uidSchema.statics.isUidAvailable = async function(uid, excludeEmployeeId = null) {
  if (!uid) return true;
  
  const normalizedUid = uid.replace(/\s/g, '').toUpperCase();
  
  const query = {
    isActive: true,
    uid: { $regex: new RegExp(`^${normalizedUid}$`, 'i') }
  };
  
  if (excludeEmployeeId) {
    query.employeeId = { $ne: excludeEmployeeId };
  }
  
  const existing = await this.findOne(query);
  return !existing;
};

// Get assignment statistics
uidSchema.statics.getAssignmentStats = async function() {
  try {
    const totalAssignments = await this.countDocuments();
    const activeAssignments = await this.countDocuments({ isActive: true });
    const inactiveAssignments = await this.countDocuments({ isActive: false });
    
    const departmentStats = await this.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const recentAssignments = await this.find({ isActive: true })
      .sort({ assignedAt: -1 })
      .limit(10);
    
    return {
      totalAssignments,
      activeAssignments,
      inactiveAssignments,
      departmentStats,
      recentAssignments,
      collection: 'EMS_UID',
      database: 'BrightonSystem'
    };
  } catch (error) {
    console.error('Error getting assignment stats:', error);
    throw error;
  }
};

// Bulk deactivate by employee IDs
uidSchema.statics.bulkDeactivate = async function(employeeIds, reason = 'Bulk deactivation') {
  try {
    const result = await this.updateMany(
      { employeeId: { $in: employeeIds }, isActive: true },
      {
        isActive: false,
        deactivatedAt: new Date(),
        lastModified: new Date()
      }
    );
    
    console.log(`Bulk deactivated ${result.modifiedCount} RFID assignments`);
    return result;
  } catch (error) {
    console.error('Error in bulk deactivation:', error);
    throw error;
  }
};

// Find duplicate assignments
uidSchema.statics.findDuplicateAssignments = async function() {
  try {
    const duplicates = await this.aggregate([
      {
        $group: {
          _id: '$uid',
          count: { $sum: 1 },
          assignments: { $push: '$$ROOT' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $project: {
          uid: '$_id',
          count: 1,
          assignments: {
            $filter: {
              input: '$assignments',
              as: 'assignment',
              cond: { $eq: ['$$assignment.isActive', true] }
            }
          }
        }
      },
      {
        $match: {
          'assignments.1': { $exists: true }
        }
      }
    ]);
    
    return duplicates;
  } catch (error) {
    console.error('Error finding duplicate assignments:', error);
    throw error;
  }
};

// Get assignment history for employee
uidSchema.statics.getEmployeeAssignmentHistory = async function(employeeId) {
  try {
    const history = await this.find({ employeeId: employeeId })
      .sort({ assignedAt: -1 });
    
    return history;
  } catch (error) {
    console.error('Error getting employee assignment history:', error);
    throw error;
  }
};

// Validate UID format
uidSchema.statics.validateUidFormat = function(uid) {
  if (!uid) {
    return { valid: false, message: 'UID is required' };
  }
  
  const normalizedUid = uid.replace(/\s/g, '').toUpperCase();
  
  if (normalizedUid.length !== 8) {
    return {
      valid: false,
      message: `UID must be exactly 8 characters long. Current: ${normalizedUid.length} characters`
    };
  }
  
  if (!/^[0-9A-F]{8}$/i.test(normalizedUid)) {
    return {
      valid: false,
      message: 'UID must contain only hexadecimal characters (0-9, A-F)'
    };
  }
  
  return { valid: true, message: 'Valid UID format' };
};

// ==================== MIDDLEWARE ====================

// Pre-save middleware to ensure collection and database names
uidSchema.pre('save', function(next) {
  this.lastModified = new Date();
  this.collectionName = 'EMS_UID';
  this.databaseName = 'BrightonSystem';
  
  // Validate UID format before saving
  if (this.isModified('uid')) {
    const validation = this.constructor.validateUidFormat(this.uid);
    if (!validation.valid) {
      return next(new Error(validation.message));
    }
  }
  
  next();
});

// Pre-validate middleware
uidSchema.pre('validate', function(next) {
  if (!this.collectionName) {
    this.collectionName = 'EMS_UID';
  }
  if (!this.databaseName) {
    this.databaseName = 'BrightonSystem';
  }
  next();
});

// Post-save middleware to log changes
uidSchema.post('save', function(doc) {
  console.log(`UID record ${doc.isActive ? 'saved' : 'deactivated'} in EMS_UID collection:`, {
    uid: doc.uid,
    employeeId: doc.employeeId,
    employeeName: doc.employeeName,
    isActive: doc.isActive,
    collection: doc.collectionName,
    database: doc.databaseName,
    timestamp: new Date().toISOString()
  });
});

// Post-remove middleware
uidSchema.post('remove', function(doc) {
  console.log(`UID record permanently removed from EMS_UID collection:`, {
    uid: doc.uid,
    employeeId: doc.employeeId,
    employeeName: doc.employeeName,
    collection: doc.collectionName,
    database: doc.databaseName,
    timestamp: new Date().toISOString()
  });
});

const UID = mongoose.model('UID', uidSchema);

module.exports = UID;
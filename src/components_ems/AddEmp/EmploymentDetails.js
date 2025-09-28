import React, { } from 'react';

const EmploymentDetails = ({ 
  formData, 
  errors, 
  departments, 
  positions, 
  handleInputChange, 
  handleWorkScheduleChange, 
  generateEmployeeId 
}) => {
  // Ensure workSchedule is always defined
  const workSchedule = formData.workSchedule || {
    Monday: { active: true, start: '07:00', end: '16:00' },
    Tuesday: { active: true, start: '07:00', end: '16:00' },
    Wednesday: { active: true, start: '07:00', end: '16:00' },
    Thursday: { active: true, start: '07:00', end: '16:00' },
    Friday: { active: true, start: '07:00', end: '16:00' },
    Saturday: { active: false, start: '', end: '' },
    Sunday: { active: false, start: '', end: '' }
  };

  // Ensure departments is always an array with proper handling
  const departmentsList = Array.isArray(departments) ? departments : [];
  
  // Ensure positions is always an array
  const positionsList = Array.isArray(positions) ? positions : [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-[#400504]">Employment Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Department Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Department *</label>
          <select
            name="department"
            value={formData.department || ''}
            onChange={handleInputChange}
            className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${
              errors.department ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Select Department</option>
            {departmentsList.length > 0 ? (
              departmentsList.map(dept => (
                <option key={dept._id || dept.name} value={dept.name}>
                  {dept.name}
                </option>
              ))
            ) : (
              <option value="" disabled>Loading departments...</option>
            )}
          </select>
          {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
          {departmentsList.length === 0 && (
            <p className="text-yellow-600 text-xs mt-1">No departments available. Please add departments first.</p>
          )}
        </div>
        
        {/* Position Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Position *</label>
          <select
            name="position"
            value={formData.position || ''}
            onChange={handleInputChange}
            className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${
              errors.position ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Select Position</option>
            {positionsList.length > 0 ? (
              positionsList.map((pos, index) => (
                <option key={index} value={pos}>
                  {pos}
                </option>
              ))
            ) : (
              <option value="" disabled>No positions available</option>
            )}
          </select>
          {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position}</p>}
        </div>
      </div>
      
      {/* Teaching Level (only for Academic Teachers) */}
      {formData.department === 'Academic' && formData.position === 'Teacher' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Teaching Level</label>
          <div className="mt-2 space-y-2">
            {['Pre-Kindergarten', 'Kindergarten', 'Elementary', 'High-School', 'Senior High-School'].map(level => (
              <div key={level} className="flex items-center">
                <input
                  type="checkbox"
                  name="teachingLevel"
                  value={level}
                  checked={Array.isArray(formData.teachingLevel) && formData.teachingLevel.includes(level)}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-[#400504] focus:ring-[#400504] border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">{level}</label>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Work Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Type of Work *</label>
        <select
          name="workType"
          value={formData.workType || ''}
          onChange={handleInputChange}
          className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${
            errors.workType ? 'border-red-500' : 'border-gray-300'
          }`}
          required
        >
          <option value="">Select Work Type</option>
          <option value="Full-Time">Full-Time</option>
          <option value="Part-Time">Part-Time</option>
        </select>
        {errors.workType && <p className="text-red-500 text-xs mt-1">{errors.workType}</p>}
      </div>
      
      {/* Work Schedule */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Work Schedule *</label>
        {errors.workSchedule && <p className="text-red-500 text-xs mt-1">{errors.workSchedule}</p>}
        <div className="mt-2 space-y-2">
          {Object.entries(workSchedule).map(([day, schedule]) => (
            <div key={day} className="flex items-center space-x-2">
              <input
                type="checkbox"
                name={`workDay_${day}`}
                checked={schedule.active || false}
                onChange={handleInputChange}
                className="h-4 w-4 text-[#400504] focus:ring-[#400504] border-gray-300 rounded"
              />
              <span className="w-20 text-sm font-medium">{day}</span>
              <input
                type="time"
                value={schedule.start || ''}
                onChange={(e) => handleWorkScheduleChange(day, 'start', e.target.value)}
                className="border border-gray-300 rounded-md shadow-sm p-1 w-24"
                disabled={!schedule.active}
                required={schedule.active}
              />
              <span className="text-sm">to</span>
              <input
                type="time"
                value={schedule.end || ''}
                onChange={(e) => handleWorkScheduleChange(day, 'end', e.target.value)}
                className="border border-gray-300 rounded-md shadow-sm p-1 w-24"
                disabled={!schedule.active}
                required={schedule.active}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Employee ID Display */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Employee ID</label>
        <input
          type="text"
          value={generateEmployeeId()}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100"
          readOnly
        />
        <p className="text-sm text-gray-500 mt-1">This ID will be automatically generated</p>
      </div>
    </div>
  );
};

export default EmploymentDetails;
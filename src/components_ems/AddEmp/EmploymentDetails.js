import React, { useState, useEffect } from 'react';

const EmploymentDetails = ({ 
  formData, 
  errors, 
  handleInputChange, 
  handleWorkScheduleChange, 
  generateEmployeeId 
}) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getPositionsByDepartment = (department) => {
    const positionsMap = {
      'Academic Department': ['Teacher'],
      'Administrative Department': [
        'Principal',
        'Registrar Staff',
        'Accounting / Cashier',
        'Guidance Counselors',
        'HR Personnel',
        'Admission Officers',
        'IT Support Staff'
      ],
      'Maintenance and Facilities Department': [
        'Janitor and Utility Worker',
        'Security Guards',
        'Maintenance Technicians',
        'GroundKeepers',
        'Facilities Manager/Supervisor',
        'Service Driver'
      ]
    };
    return positionsMap[department] || [];
  };

  const availablePositions = getPositionsByDepartment(formData.department);

  useEffect(() => {
    if (formData.department === 'Academic Department' && formData.position === 'Teacher') {
      if (!formData.teachingLevel || !Array.isArray(formData.teachingLevel) || formData.teachingLevel.length === 0) {
        const allTeachingLevels = ['Pre-Kindergarten', 'Kindergarten', 'Elementary', 'High-School', 'Senior High-School'];
        handleInputChange({
          target: {
            name: 'teachingLevel',
            value: allTeachingLevels
          }
        });
      }
    }
  }, [formData.department, formData.position, formData.teachingLevel, handleInputChange]);

  const handleDepartmentChange = (e) => {
    const newDepartment = e.target.value;
    handleInputChange(e);
    
    if (formData.position && !getPositionsByDepartment(newDepartment).includes(formData.position)) {
      handleInputChange({
        target: {
          name: 'position',
          value: ''
        }
      });
    }
  };

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/departments');
        const result = await response.json();
        
        if (result.success) {
          setDepartments(result.data);
        } else {
          throw new Error(result.message);
        }
      } catch (err) {
        setError('Failed to load departments');
      } finally {
        setLoading(false);
      }
    };

    loadDepartments();
  }, []);

  const handleTeachingLevelChange = (level) => {
    const currentLevels = Array.isArray(formData.teachingLevel) ? formData.teachingLevel : [];
    const updatedLevels = currentLevels.includes(level)
      ? currentLevels.filter(l => l !== level)
      : [...currentLevels, level];
    
    handleInputChange({
      target: {
        name: 'teachingLevel',
        value: updatedLevels
      }
    });
  };

  const workSchedule = formData.workSchedule || {
    Monday: { active: true, start: '07:00', end: '16:00' },
    Tuesday: { active: true, start: '07:00', end: '16:00' },
    Wednesday: { active: true, start: '07:00', end: '16:00' },
    Thursday: { active: true, start: '07:00', end: '16:00' },
    Friday: { active: true, start: '07:00', end: '16:00' },
    Saturday: { active: false, start: '', end: '' },
    Sunday: { active: false, start: '', end: '' }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-[#400504]">Employment Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Department *</label>
          <select
            name="department"
            value={formData.department || ''}
            onChange={handleDepartmentChange}
            className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${
              errors.department ? 'border-red-500' : 'border-gray-300'
            }`}
            required
            disabled={loading}
          >
            <option value="">Select Department</option>
            {loading ? (
              <option value="" disabled>Loading departments...</option>
            ) : error ? (
              <option value="" disabled>Error loading departments</option>
            ) : departments.length > 0 ? (
              departments.map(dept => (
                <option key={dept._id} value={dept.name}>
                  {dept.name}
                </option>
              ))
            ) : (
              <option value="" disabled>No departments available</option>
            )}
          </select>
          {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
        </div>
        
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
            disabled={!formData.department || availablePositions.length === 0}
          >
            <option value="">Select Position</option>
            {availablePositions.map((pos, index) => (
              <option key={index} value={pos}>
                {pos}
              </option>
            ))}
          </select>
          {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position}</p>}
        </div>
      </div>
      
      {formData.department === 'Academic Department' && formData.position === 'Teacher' && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teaching Level *
          </label>
          <div className="mt-2 space-y-2">
            {['Pre-Kindergarten', 'Kindergarten', 'Elementary', 'High-School', 'Senior High-School'].map(level => (
              <div key={level} className="flex items-center">
                <input
                  type="checkbox"
                  checked={Array.isArray(formData.teachingLevel) && formData.teachingLevel.includes(level)}
                  onChange={() => handleTeachingLevelChange(level)}
                  className="h-4 w-4 text-[#400504] focus:ring-[#400504] border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">{level}</label>
              </div>
            ))}
          </div>
          {errors.teachingLevel && <p className="text-red-500 text-xs mt-1">{errors.teachingLevel}</p>}
        </div>
      )}
      
      <div className="max-w-xs">
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
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Work Schedule *</label>
        {errors.workSchedule && <p className="text-red-500 text-xs mt-1">{errors.workSchedule}</p>}
        <div className="mt-2 space-y-2">
          {Object.entries(workSchedule).map(([day, schedule]) => (
            <div key={day} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={schedule.active || false}
                onChange={(e) => handleWorkScheduleChange(day, 'active', e.target.checked)}
                className="h-4 w-4 text-[#400504] focus:ring-[#400504] border-gray-300 rounded"
              />
              <span className="w-20 text-sm font-medium">{day}</span>
              <input
                type="time"
                value={schedule.start || ''}
                onChange={(e) => handleWorkScheduleChange(day, 'start', e.target.value)}
                className="border border-gray-300 rounded-md shadow-sm p-1 w-24"
                disabled={!schedule.active}
              />
              <span className="text-sm">to</span>
              <input
                type="time"
                value={schedule.end || ''}
                onChange={(e) => handleWorkScheduleChange(day, 'end', e.target.value)}
                className="border border-gray-300 rounded-md shadow-sm p-1 w-24"
                disabled={!schedule.active}
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="max-w-xs">
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
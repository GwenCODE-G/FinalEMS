// frontend/src/components_ems/ActionEmp/EditEmployeeModal.js
import React, { useState, useEffect, useCallback } from 'react';
import PhoneNumberValidation from '../AddEmp/PhoneNumberValidation';

const EditEmployeeModal = ({ isOpen, onClose, employee, onEmployeeUpdated, apiBaseUrl }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    gender: '',
    civilStatus: '',
    religion: '',
    birthday: '',
    birthplace: '',
    age: '',
    contactNumber: '',
    email: '',
    philhealth: '',
    sss: '',
    pagibig: '',
    tin: '',
    emergencyContact: {
      firstName: '',
      lastName: '',
      relationship: '',
      type: 'Landline',
      mobile: '',
      landline: ''
    },
    currentAddress: {
      blkLt: '',
      block: '',
      lot: '',
      street: '',
      area: '',
      barangay: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Philippines'
    },
    permanentAddress: {
      blkLt: '',
      block: '',
      lot: '',
      street: '',
      area: '',
      barangay: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Philippines'
    },
    sameAsCurrent: false,
    department: '',
    position: '',
    teachingLevel: [],
    workType: '',
    workSchedule: {
      Monday: { active: true, start: '07:00', end: '16:00' },
      Tuesday: { active: true, start: '07:00', end: '16:00' },
      Wednesday: { active: true, start: '07:00', end: '16:00' },
      Thursday: { active: true, start: '07:00', end: '16:00' },
      Friday: { active: true, start: '07:00', end: '16:00' },
      Saturday: { active: false, start: '', end: '' },
      Sunday: { active: false, start: '', end: '' }
    },
    dateStart: '',
    dateSeparated: '',
    requirements: {
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
    }
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [phoneValidation, setPhoneValidation] = useState({
    contactNumber: { isValid: null, loading: false },
    emergencyMobile: { isValid: null, loading: false }
  });

  // Initialize form data when employee prop changes
  useEffect(() => {
    if (employee) {
      const formattedData = {
        ...employee,
        birthday: employee.birthday ? new Date(employee.birthday).toISOString().split('T')[0] : '',
        dateStart: employee.dateStart ? new Date(employee.dateStart).toISOString().split('T')[0] : '',
        dateSeparated: employee.dateSeparated ? new Date(employee.dateSeparated).toISOString().split('T')[0] : '',
        dateEmployed: employee.dateEmployed ? new Date(employee.dateEmployed).toISOString().split('T')[0] : '',
        emergencyContact: employee.emergencyContact || {
          firstName: '',
          lastName: '',
          relationship: '',
          type: 'Landline',
          mobile: '',
          landline: ''
        },
        currentAddress: employee.currentAddress || {
          blkLt: '',
          block: '',
          lot: '',
          street: '',
          area: '',
          barangay: '',
          city: '',
          province: '',
          postalCode: '',
          country: 'Philippines'
        },
        permanentAddress: employee.permanentAddress || {
          blkLt: '',
          block: '',
          lot: '',
          street: '',
          area: '',
          barangay: '',
          city: '',
          province: '',
          postalCode: '',
          country: 'Philippines'
        },
        teachingLevel: employee.teachingLevel || [],
        workSchedule: employee.workSchedule || {
          Monday: { active: true, start: '07:00', end: '16:00' },
          Tuesday: { active: true, start: '07:00', end: '16:00' },
          Wednesday: { active: true, start: '07:00', end: '16:00' },
          Thursday: { active: true, start: '07:00', end: '16:00' },
          Friday: { active: true, start: '07:00', end: '16:00' },
          Saturday: { active: false, start: '', end: '' },
          Sunday: { active: false, start: '', end: '' }
        },
        requirements: employee.requirements || {
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
        }
      };
      setFormData(formattedData);
    }
  }, [employee]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/departments`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDepartments(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }, [apiBaseUrl]);

  const updatePositions = useCallback(() => {
    let departmentPositions = [];
    switch (formData.department) {
      case 'Academic Department':
        departmentPositions = ['Teacher'];
        break;
      case 'Administrative Department':
        departmentPositions = ['Principal', 'Registrar', 'Accounting/Cashier', 'Guidance Counselors','HR Personnel', 'Admission Officer', 'IT Support Staff'];
        break;
      case 'Maintenance and Facilities Department':
        departmentPositions = ['Maintenance Staff', 'Security Guard', 'Janitor and Utility Worker','GroundKeepers', 'Service Driver'];
        break;
      default:
        departmentPositions = [];
    }
    setPositions(departmentPositions);
    
    // Reset position if current position is not in new department
    if (formData.position && !departmentPositions.includes(formData.position)) {
      setFormData(prev => ({ ...prev, position: '' }));
    }
  }, [formData.department, formData.position]);

  const calculateAge = useCallback(() => {
    if (formData.birthday) {
      const birthDate = new Date(formData.birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      setFormData(prev => ({ ...prev, age: age.toString() }));
    }
  }, [formData.birthday]);

  // Fetch initial data
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Update positions when department changes
  useEffect(() => {
    if (formData.department) {
      updatePositions();
    }
  }, [formData.department, updatePositions]);

  // Calculate age when birthday changes
  useEffect(() => {
    if (formData.birthday) {
      calculateAge();
    }
  }, [formData.birthday, calculateAge]);

  // Handle same as current address
  useEffect(() => {
    if (formData.sameAsCurrent && formData.currentAddress) {
      setFormData(prev => ({
        ...prev,
        permanentAddress: { ...prev.currentAddress }
      }));
    }
  }, [formData.sameAsCurrent, formData.currentAddress]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox' && name === 'teachingLevel') {
      const updatedLevels = checked
        ? [...(formData.teachingLevel || []), value]
        : (formData.teachingLevel || []).filter(level => level !== value);
      
      setFormData(prev => ({ ...prev, teachingLevel: updatedLevels }));
    } else if (type === 'checkbox' && name.startsWith('workDay_')) {
      const day = name.replace('workDay_', '');
      setFormData(prev => ({
        ...prev,
        workSchedule: {
          ...prev.workSchedule,
          [day]: {
            ...prev.workSchedule[day],
            active: checked,
            start: checked ? (prev.workSchedule[day]?.start || '07:00') : '',
            end: checked ? (prev.workSchedule[day]?.end || '16:00') : ''
          }
        }
      }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleWorkScheduleChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        [day]: {
          ...prev.workSchedule[day],
          [field]: value
        }
      }
    }));
  };

  const handleContactNumberChange = (phoneNumber, isValid) => {
    setFormData(prev => ({ ...prev, contactNumber: phoneNumber }));
    setPhoneValidation(prev => ({
      ...prev,
      contactNumber: { ...prev.contactNumber, isValid, loading: false }
    }));
  };

  const handleEmergencyMobileChange = (phoneNumber, isValid) => {
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        mobile: phoneNumber
      }
    }));
    setPhoneValidation(prev => ({
      ...prev,
      emergencyMobile: { ...prev.emergencyMobile, isValid, loading: false }
    }));
  };

  const handleCheckboxGroup = (groupName, option, isChecked) => {
    const currentRequirements = formData.requirements || {};
    const currentGroup = currentRequirements[groupName] || {};
    
    const updatedGroup = { ...currentGroup };
    
    if (option === 'notYetSubmitted') {
      if (isChecked) {
        Object.keys(updatedGroup).forEach(key => {
          updatedGroup[key] = false;
        });
        updatedGroup.notYetSubmitted = true;
      } else {
        updatedGroup.notYetSubmitted = false;
      }
    } else {
      updatedGroup.notYetSubmitted = false;
      updatedGroup[option] = isChecked;
    }
    
    const updatedRequirements = {
      ...currentRequirements,
      [groupName]: updatedGroup
    };
    
    setFormData(prev => ({
      ...prev,
      requirements: updatedRequirements
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const updateData = {
        ...formData,
        age: parseInt(formData.age),
        teachingLevel: formData.teachingLevel || [],
        requirements: formData.requirements || {}
      };

      // Remove MongoDB internal fields
      delete updateData._id;
      delete updateData.__v;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      delete updateData.password;

      const response = await fetch(`${apiBaseUrl}/api/employees/${employee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        onEmployeeUpdated();
        onClose();
      } else {
        setErrors({ submit: result.message || 'Error updating employee' });
      }
    } catch (error) {
      setErrors({ submit: 'Network error: Could not connect to server' });
    } finally {
      setLoading(false);
    }
  };

  // Helper Components
  const CheckboxGroup = ({ groupName, options }) => {
    const currentRequirements = formData.requirements || {};
    const currentGroup = currentRequirements[groupName] || {};
    
    return (
      <div className="flex flex-col gap-1 mt-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center">
            <input
              id={`${groupName}-${option.value}`}
              type="checkbox"
              checked={!!currentGroup[option.value]}
              onChange={(e) => handleCheckboxGroup(groupName, option.value, e.target.checked)}
              className="h-3 w-3 text-[#400504] focus:ring-[#400504] border-gray-300 rounded"
              disabled={
                option.value === 'notYetSubmitted' 
                  ? Object.keys(currentGroup).some(key => key !== 'notYetSubmitted' && currentGroup[key])
                  : currentGroup.notYetSubmitted
              }
            />
            <label htmlFor={`${groupName}-${option.value}`} className="ml-2 text-xs text-gray-700">
              {option.label}
            </label>
          </div>
        ))}
      </div>
    );
  };

  const WorkScheduleSection = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Work Schedule *</label>
        {errors.workSchedule && <p className="text-red-500 text-xs">{errors.workSchedule}</p>}
        <div className="space-y-2">
          {days.map(day => (
            <div key={day} className="flex items-center space-x-4 p-2 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id={`workDay_${day}`}
                checked={formData.workSchedule?.[day]?.active || false}
                onChange={(e) => handleWorkScheduleChange(day, 'active', e.target.checked)}
                className="h-4 w-4 text-[#400504] focus:ring-[#400504] border-gray-300 rounded"
              />
              <label htmlFor={`workDay_${day}`} className="w-24 text-sm font-medium text-gray-700">
                {day}
              </label>
              <input
                type="time"
                value={formData.workSchedule?.[day]?.start || ''}
                onChange={(e) => handleWorkScheduleChange(day, 'start', e.target.value)}
                disabled={!formData.workSchedule?.[day]?.active}
                className="border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-gray-500">to</span>
              <input
                type="time"
                value={formData.workSchedule?.[day]?.end || ''}
                onChange={(e) => handleWorkScheduleChange(day, 'end', e.target.value)}
                disabled={!formData.workSchedule?.[day]?.active}
                className="border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getPhoneValidationStatus = (fieldName) => {
    const validation = phoneValidation[fieldName];
    if (validation.isValid === true) {
      return { text: 'Valid Philippine number', color: 'text-green-600', bg: 'bg-green-50' };
    }
    if (validation.isValid === false) {
      return { text: 'Invalid number format', color: 'text-red-600', bg: 'bg-red-50' };
    }
    return null;
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        <div className="bg-[#400504] p-4 rounded-t-lg sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Edit Employee - {employee.firstName} {employee.lastName}</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{errors.submit}</p>
            </div>
          )}

          {/* Basic Information Section */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold text-[#400504] mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-1">
                  Middle Name
                </label>
                <input
                  id="middleName"
                  name="middleName"
                  type="text"
                  value={formData.middleName || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                  <div className="w-20">
                    <select
                      id="suffix"
                      name="suffix"
                      value={formData.suffix || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors text-sm"
                    >
                      <option value="">Suffix</option>
                      <option value="Jr.">Jr.</option>
                      <option value="Sr.">Sr.</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                      <option value="V">V</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label htmlFor="civilStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Civil Status *
                </label>
                <select
                  id="civilStatus"
                  name="civilStatus"
                  value={formData.civilStatus || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                  required
                >
                  <option value="">Select Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Separated">Separated</option>
                </select>
              </div>

              <div>
                <label htmlFor="religion" className="block text-sm font-medium text-gray-700 mb-1">
                  Religion *
                </label>
                <select
                  id="religion"
                  name="religion"
                  value={formData.religion || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                  required
                >
                  <option value="">Select Religion</option>
                  <option value="Roman Catholic">Roman Catholic</option>
                  <option value="Islam">Islam</option>
                  <option value="Evangelical">Evangelical</option>
                  <option value="Iglesia ni Cristo">Iglesia ni Cristo</option>
                  <option value="Protestant">Protestant</option>
                  <option value="Baptist">Baptist</option>
                  <option value="Born Again">Born Again</option>
                  <option value="Mormon">Mormon</option>
                  <option value="Seventh-day Adventist">Seventh-day Adventist</option>
                  <option value="Ang Dating Daan">Ang Dating Daan</option>
                  <option value="Jehovah's Witness">Jehovah's Witness</option>
                  <option value="Buddhism">Buddhism</option>
                  <option value="Hinduism">Hinduism</option>
                  <option value="Judaism">Judaism</option>
                  <option value="None">None</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-3">
                    <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-1">
                      Birthday *
                    </label>
                    <input
                      id="birthday"
                      name="birthday"
                      type="date"
                      value={formData.birthday || ''}
                      onChange={handleInputChange}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                      Age
                    </label>
                    <input
                      id="age"
                      name="age"
                      type="text"
                      value={formData.age || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed text-center"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="birthplace" className="block text-sm font-medium text-gray-700 mb-1">
                Birthplace *
              </label>
              <input
                id="birthplace"
                name="birthplace"
                type="text"
                value={formData.birthplace || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                placeholder="City, Province"
                required
              />
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold text-[#400504] mb-4">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number *
                </label>
                <PhoneNumberValidation
                  value={formData.contactNumber || ''}
                  onChange={handleContactNumberChange}
                  required={true}
                  placeholder="+63 912 345 6789"
                />
                {getPhoneValidationStatus('contactNumber') && (
                  <div className={`text-xs px-2 py-1 rounded mt-1 ${getPhoneValidationStatus('contactNumber').color} ${getPhoneValidationStatus('contactNumber').bg}`}>
                    {getPhoneValidationStatus('contactNumber').text}
                  </div>
                )}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                  placeholder="employee@email.com"
                  required
                />
              </div>
            </div>

            {/* Government IDs */}
            <div className="mt-6">
              <h4 className="text-md font-semibold text-[#400504] mb-3">Government IDs</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="tin" className="block text-sm font-medium text-gray-700 mb-1">
                    TIN Number
                  </label>
                  <input
                    id="tin"
                    name="tin"
                    type="text"
                    value={formData.tin || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                    placeholder="Enter 9-digit TIN"
                    maxLength={9}
                  />
                  <CheckboxGroup 
                    groupName="tinRequirements"
                    options={[
                      { value: 'presentForm', label: 'Present 1904/1905 Form W/RDO Code 25B' },
                      { value: 'submitCopy', label: 'Submit PhotoCopy' },
                      { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
                    ]}
                  />
                </div>

                <div>
                  <label htmlFor="sss" className="block text-sm font-medium text-gray-700 mb-1">
                    SSS Number
                  </label>
                  <input
                    id="sss"
                    name="sss"
                    type="text"
                    value={formData.sss || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                    placeholder="Enter SSS number"
                    maxLength={12}
                  />
                  <CheckboxGroup 
                    groupName="sssRequirements"
                    options={[
                      { value: 'presentForm', label: 'Present E-1 Form' },
                      { value: 'presentID', label: 'Present ID' },
                      { value: 'submitCopy', label: 'Submit PhotoCopy' },
                      { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
                    ]}
                  />
                </div>
                
                <div>
                  <label htmlFor="philhealth" className="block text-sm font-medium text-gray-700 mb-1">
                    PhilHealth Number
                  </label>
                  <input
                    id="philhealth"
                    name="philhealth"
                    type="text"
                    value={formData.philhealth || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                    placeholder="Enter PhilHealth number"
                    maxLength={12}
                  />
                  <CheckboxGroup 
                    groupName="philhealthRequirements"
                    options={[
                      { value: 'presentMDR', label: 'Present Original MDR' },
                      { value: 'presentID', label: 'Present ID' },
                      { value: 'submitCopy', label: 'Submit PhotoCopy' },
                      { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
                    ]}
                  />
                </div>
                
                <div>
                  <label htmlFor="pagibig" className="block text-sm font-medium text-gray-700 mb-1">
                    PAG-IBIG Number
                  </label>
                  <input
                    id="pagibig"
                    name="pagibig"
                    type="text"
                    value={formData.pagibig || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                    placeholder="Enter PAG-IBIG number"
                    maxLength={12}
                  />
                  <CheckboxGroup 
                    groupName="pagibigRequirements"
                    options={[
                      { value: 'presentMDF', label: 'Present Original MDF' },
                      { value: 'presentID', label: 'Present ID' },
                      { value: 'submitCopy', label: 'Submit PhotoCopy' },
                      { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* BPLO Requirements */}
            <div className="mt-6">
              <h4 className="text-md font-semibold text-[#400504] mb-3">BPLO Requirements (CSJDM)</h4>
              
              <div className="bg-gray-50 p-4 rounded-lg border space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HEALTH CARD
                  </label>
                  <CheckboxGroup 
                    groupName="healthCardRequirements"
                    options={[
                      { value: 'presentOriginal', label: 'Present Original' },
                      { value: 'submitCopy', label: 'Submit PhotoCopy' },
                      { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Professional ID Card/License
                  </label>
                  <CheckboxGroup 
                    groupName="professionalIDRequirements"
                    options={[
                      { value: 'presentOriginal', label: 'Present Original' },
                      { value: 'submitCopy', label: 'Submit PhotoCopy' },
                      { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DRIVER'S ID Card/License
                  </label>
                  <CheckboxGroup 
                    groupName="driversLicenseRequirements"
                    options={[
                      { value: 'presentOriginal', label: 'Present Original' },
                      { value: 'submitCopy', label: 'Submit PhotoCopy' },
                      { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barangay Working Permit
                  </label>
                  <CheckboxGroup 
                    groupName="barangayWorkingPermitRequirements"
                    options={[
                      { value: 'submitCopy', label: 'Submit PhotoCopy' },
                      { value: 'submitOriginal', label: 'Submit ORIGINAL' },
                      { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Occupational Permit */}
            <div className="mt-6">
              <h4 className="text-md font-semibold text-[#400504] mb-3">OCCUPATIONAL PERMIT</h4>
              
              <div className="bg-gray-50 p-4 rounded-lg border space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    BIRTH CERTIFICATE
                  </label>
                  <CheckboxGroup 
                    groupName="birthCertificateRequirements"
                    options={[
                      { value: 'presentOriginal', label: 'Present Original' },
                      { value: 'submitCopy', label: 'Submit PhotoCopy' },
                      { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Police Clearance or NBI Clearance
                  </label>
                  <CheckboxGroup 
                    groupName="policeNbiRequirements"
                    options={[
                      { value: 'submitCopy', label: 'Submit PhotoCopy' },
                      { value: 'submitOriginal', label: 'Submit ORIGINAL' },
                      { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barangay Clearance
                  </label>
                  <CheckboxGroup 
                    groupName="barangayClearanceRequirements"
                    options={[
                      { value: 'submitCopy', label: 'Submit PhotoCopy' },
                      { value: 'submitOriginal', label: 'Submit ORIGINAL' },
                      { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CEDULA
                  </label>
                  <CheckboxGroup 
                    groupName="cedulaRequirements"
                    options={[
                      { value: 'presentOriginal', label: 'Present Original' },
                      { value: 'submitCopy', label: 'Submit PhotoCopy' },
                      { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Employment Dates */}
            <div className="mt-6">
              <h4 className="text-md font-semibold text-[#400504] mb-3">Employment Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dateStart" className="block text-sm font-medium text-gray-700 mb-1">
                    DATE START
                  </label>
                  <input
                    id="dateStart"
                    name="dateStart"
                    type="date"
                    value={formData.dateStart || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                  />
                </div>
                
                <div>
                  <label htmlFor="dateSeparated" className="block text-sm font-medium text-gray-700 mb-1">
                    DATE SEPARATED
                  </label>
                  <input
                    id="dateSeparated"
                    name="dateSeparated"
                    type="date"
                    value={formData.dateSeparated || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="mt-6">
              <h4 className="text-md font-semibold text-[#400504] mb-3">Emergency Contact</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="emergencyContact.firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    id="emergencyContact.firstName"
                    name="emergencyContact.firstName"
                    type="text"
                    value={formData.emergencyContact?.firstName || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="emergencyContact.lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    id="emergencyContact.lastName"
                    name="emergencyContact.lastName"
                    type="text"
                    value={formData.emergencyContact?.lastName || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="emergencyContact.relationship" className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship *
                  </label>
                  <select
                    id="emergencyContact.relationship"
                    name="emergencyContact.relationship"
                    value={formData.emergencyContact?.relationship || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                    required
                  >
                    <option value="">Select Relationship</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Aunt">Aunt</option>
                    <option value="Uncle">Uncle</option>
                    <option value="Cousin">Cousin</option>
                    <option value="Father-in-law">Father-in-law</option>
                    <option value="Mother-in-law">Mother-in-law</option>
                    <option value="Brother-in-law">Brother-in-law</option>
                    <option value="Sister-in-law">Sister-in-law</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label htmlFor="emergencyContact.type" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Type *
                  </label>
                  <select
                    id="emergencyContact.type"
                    name="emergencyContact.type"
                    value={formData.emergencyContact?.type || 'Landline'}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                  >
                    <option value="Landline">Landline</option>
                    <option value="Mobile">Mobile</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number *
                  </label>
                  {formData.emergencyContact?.type === 'Mobile' ? (
                    <PhoneNumberValidation
                      value={formData.emergencyContact?.mobile || ''}
                      onChange={handleEmergencyMobileChange}
                      required={true}
                      placeholder="+63 912 345 6789"
                    />
                  ) : (
                    <input
                      name="emergencyContact.landline"
                      type="text"
                      value={formData.emergencyContact?.landline || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                      placeholder="e.g., 02-123-4567"
                      required
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Current Address */}
            <div className="mt-6">
              <h4 className="text-md font-semibold text-[#400504] mb-3">Current Address</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="currentAddress.street" className="block text-sm font-medium text-gray-700 mb-1">
                    Street *
                  </label>
                  <input
                    id="currentAddress.street"
                    name="currentAddress.street"
                    type="text"
                    value={formData.currentAddress?.street || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="currentAddress.area" className="block text-sm font-medium text-gray-700 mb-1">
                    Area *
                  </label>
                  <input
                    id="currentAddress.area"
                    name="currentAddress.area"
                    type="text"
                    value={formData.currentAddress?.area || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Block/Lot
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        name="currentAddress.block"
                        type="text"
                        value={formData.currentAddress?.block || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                        placeholder="Block"
                      />
                    </div>
                    <div>
                      <input
                        name="currentAddress.lot"
                        type="text"
                        value={formData.currentAddress?.lot || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                        placeholder="Lot"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label htmlFor="currentAddress.city" className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    id="currentAddress.city"
                    name="currentAddress.city"
                    type="text"
                    value={formData.currentAddress?.city || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="currentAddress.province" className="block text-sm font-medium text-gray-700 mb-1">
                    Province *
                  </label>
                  <input
                    id="currentAddress.province"
                    name="currentAddress.province"
                    type="text"
                    value={formData.currentAddress?.province || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="currentAddress.postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    id="currentAddress.postalCode"
                    name="currentAddress.postalCode"
                    type="text"
                    value={formData.currentAddress?.postalCode || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Same as Current Address Checkbox */}
            <div className="mt-4">
              <div className="flex items-center">
                <input
                  id="sameAsCurrent"
                  name="sameAsCurrent"
                  type="checkbox"
                  checked={formData.sameAsCurrent || false}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-[#400504] focus:ring-[#400504] border-gray-300 rounded"
                />
                <label htmlFor="sameAsCurrent" className="ml-2 block text-sm text-gray-900">
                  Use same address for permanent address
                </label>
              </div>
            </div>

            {/* Permanent Address (if not same as current) */}
            {!formData.sameAsCurrent && (
              <div className="mt-6">
                <h4 className="text-md font-semibold text-[#400504] mb-3">Permanent Address</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="permanentAddress.street" className="block text-sm font-medium text-gray-700 mb-1">
                      Street *
                    </label>
                    <input
                      id="permanentAddress.street"
                      name="permanentAddress.street"
                      type="text"
                      value={formData.permanentAddress?.street || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="permanentAddress.area" className="block text-sm font-medium text-gray-700 mb-1">
                      Area *
                    </label>
                    <input
                      id="permanentAddress.area"
                      name="permanentAddress.area"
                      type="text"
                      value={formData.permanentAddress?.area || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Block/Lot
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input
                          name="permanentAddress.block"
                          type="text"
                          value={formData.permanentAddress?.block || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                          placeholder="Block"
                        />
                      </div>
                      <div>
                        <input
                          name="permanentAddress.lot"
                          type="text"
                          value={formData.permanentAddress?.lot || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                          placeholder="Lot"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label htmlFor="permanentAddress.city" className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      id="permanentAddress.city"
                      name="permanentAddress.city"
                      type="text"
                      value={formData.permanentAddress?.city || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="permanentAddress.province" className="block text-sm font-medium text-gray-700 mb-1">
                      Province *
                    </label>
                    <input
                      id="permanentAddress.province"
                      name="permanentAddress.province"
                      type="text"
                      value={formData.permanentAddress?.province || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="permanentAddress.postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      id="permanentAddress.postalCode"
                      name="permanentAddress.postalCode"
                      type="text"
                      value={formData.permanentAddress?.postalCode || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Employment Details Section */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold text-[#400504] mb-4">Employment Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select
                  id="department"
                  name="department"
                  value={formData.department || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                  Position *
                </label>
                <select
                  id="position"
                  name="position"
                  value={formData.position || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                  required
                  disabled={!formData.department || positions.length === 0}
                >
                  <option value="">Select Position</option>
                  {positions.map((pos, index) => (
                    <option key={index} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Teaching Levels for Academic Teachers */}
            {formData.department === 'Academic Department' && formData.position === 'Teacher' && (
              <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teaching Level *
                </label>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="workType" className="block text-sm font-medium text-gray-700 mb-1">
                  Work Type *
                </label>
                <select
                  id="workType"
                  name="workType"
                  value={formData.workType || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                  required
                >
                  <option value="">Select Work Type</option>
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                </select>
              </div>

              <div>
                <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID
                </label>
                <input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  value={formData.employeeId || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  readOnly
                />
              </div>
            </div>

            {/* Work Schedule */}
            <div className="mt-6">
              <WorkScheduleSection />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-[#400504] text-white rounded-lg hover:bg-[#300404] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                'Update Employee'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEmployeeModal;
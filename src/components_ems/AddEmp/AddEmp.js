// frontend/src/components_ems/AddEmp/AddEmp.js - COMPLETE FIXED CODE
import React, { useState, useEffect, useCallback } from 'react';
import BasicInfo from './BasicInfo';
import ContactInfo from './ContactInfo';
import EmploymentDetails from './EmploymentDetails';
import ReviewInfo from './ReviewInfo';
import StepProgress from './StepProgress';
import FormNavigation from './FormNavigation';

const AddEmp = ({ onCancel, onEmployeeAdded }) => {
  const initialFormData = {
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
  };

  const [formData, setFormData] = useState(initialFormData);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [step, setStep] = useState(1);
  const [isMinor, setIsMinor] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/departments');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDepartments(data.data);
        } else {
          console.error('Failed to fetch departments:', data.message);
          setDepartments([]);
        }
      } else {
        console.error('Failed to fetch departments:', response.status);
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    }
  }, []);

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setSuccessMessage('');
      if (onEmployeeAdded) {
        onEmployeeAdded();
      }
      onCancel();
    }, 3000);
  };

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
    setFormData(prev => ({ ...prev, position: '' }));
  }, [formData.department]);

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
      setIsMinor(age < 18);
    }
  }, [formData.birthday]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (formData.department) {
      updatePositions();
    }
  }, [formData.department, updatePositions]);

  useEffect(() => {
    if (formData.birthday) {
      calculateAge();
    }
  }, [formData.birthday, calculateAge]);

  useEffect(() => {
    if (formData.sameAsCurrent) {
      setFormData(prev => ({
        ...prev,
        permanentAddress: { ...prev.currentAddress }
      }));
    }
  }, [formData.sameAsCurrent, formData.currentAddress]);

  const validateStep = (step) => {
    const newErrors = {};
    
    switch(step) {
      case 1:
        // Basic Information validation
        if (!formData.firstName?.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.religion?.trim()) newErrors.religion = 'Religion is required';
        if (!formData.birthday) newErrors.birthday = 'Birthday is required';
        if (!formData.birthplace?.trim()) newErrors.birthplace = 'Birthplace is required';
        if (!formData.age) newErrors.age = 'Age is required';
        break;
        
      case 2:
        // Contact Information validation
        if (!formData.contactNumber?.trim()) newErrors.contactNumber = 'Contact number is required';
        
        if (!formData.email?.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Invalid email format';
        }
        
        // Emergency contact validation
        if (!formData.emergencyContact?.firstName?.trim()) {
          newErrors.emergencyContactFirstName = 'Emergency contact first name is required';
        }
        if (!formData.emergencyContact?.lastName?.trim()) {
          newErrors.emergencyContactLastName = 'Emergency contact last name is required';
        }
        if (!formData.emergencyContact?.relationship?.trim()) {
          newErrors.emergencyContactRelationship = 'Emergency contact relationship is required';
        }
        
        // Emergency contact number validation
        if (formData.emergencyContact?.type === 'Mobile') {
          if (!formData.emergencyContact?.mobile?.trim()) {
            newErrors.emergencyContactNumber = 'Emergency mobile number is required';
          }
        } else {
          if (!formData.emergencyContact?.landline?.trim()) {
            newErrors.emergencyContactNumber = 'Emergency landline number is required';
          }
        }
        
        // Current address validation
        if (!formData.currentAddress?.street?.trim()) {
          if (!newErrors.currentAddress) newErrors.currentAddress = {};
          newErrors.currentAddress.street = 'Street is required';
        }
        if (!formData.currentAddress?.area?.trim()) {
          if (!newErrors.currentAddress) newErrors.currentAddress = {};
          newErrors.currentAddress.area = 'Area is required';
        }
        if (!formData.currentAddress?.barangay?.trim()) {
          if (!newErrors.currentAddress) newErrors.currentAddress = {};
          newErrors.currentAddress.barangay = 'Barangay is required';
        }
        if (!formData.currentAddress?.city?.trim()) {
          if (!newErrors.currentAddress) newErrors.currentAddress = {};
          newErrors.currentAddress.city = 'City is required';
        }
        if (!formData.currentAddress?.province?.trim()) {
          if (!newErrors.currentAddress) newErrors.currentAddress = {};
          newErrors.currentAddress.province = 'Province is required';
        }
        break;
        
      case 3:
        // Employment Details validation
        if (!formData.department?.trim()) newErrors.department = 'Department is required';
        if (!formData.position?.trim()) newErrors.position = 'Position is required';
        if (!formData.workType) newErrors.workType = 'Work type is required';
        
        // Work schedule validation
        const hasActiveDay = Object.values(formData.workSchedule || {}).some(day => day.active);
        if (!hasActiveDay) {
          newErrors.workSchedule = 'At least one work day must be selected';
        }
        
        // Validate active days have times
        Object.entries(formData.workSchedule || {}).forEach(([day, schedule]) => {
          if (schedule.active) {
            if (!schedule.start) {
              newErrors.workSchedule = `Start time is required for ${day}`;
            }
            if (!schedule.end) {
              newErrors.workSchedule = `End time is required for ${day}`;
            }
          }
        });
        break;
        
      case 4:
        // Final validation before submission
        if (!formData.firstName?.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.religion?.trim()) newErrors.religion = 'Religion is required';
        if (!formData.birthday) newErrors.birthday = 'Birthday is required';
        if (!formData.birthplace?.trim()) newErrors.birthplace = 'Birthplace is required';
        if (!formData.contactNumber?.trim()) newErrors.contactNumber = 'Contact number is required';
        if (!formData.email?.trim()) newErrors.email = 'Email is required';
        if (!formData.department?.trim()) newErrors.department = 'Department is required';
        if (!formData.position?.trim()) newErrors.position = 'Position is required';
        if (!formData.workType) newErrors.workType = 'Work type is required';
        
        // Emergency contact validation
        if (!formData.emergencyContact?.firstName?.trim()) {
          newErrors.emergencyContactFirstName = 'Emergency contact first name is required';
        }
        if (!formData.emergencyContact?.lastName?.trim()) {
          newErrors.emergencyContactLastName = 'Emergency contact last name is required';
        }
        if (!formData.emergencyContact?.relationship?.trim()) {
          newErrors.emergencyContactRelationship = 'Emergency contact relationship is required';
        }
        
        // Current address validation
        if (!formData.currentAddress?.street?.trim()) {
          if (!newErrors.currentAddress) newErrors.currentAddress = {};
          newErrors.currentAddress.street = 'Street is required';
        }
        if (!formData.currentAddress?.area?.trim()) {
          if (!newErrors.currentAddress) newErrors.currentAddress = {};
          newErrors.currentAddress.area = 'Area is required';
        }
        if (!formData.currentAddress?.barangay?.trim()) {
          if (!newErrors.currentAddress) newErrors.currentAddress = {};
          newErrors.currentAddress.barangay = 'Barangay is required';
        }
        if (!formData.currentAddress?.city?.trim()) {
          if (!newErrors.currentAddress) newErrors.currentAddress = {};
          newErrors.currentAddress.city = 'City is required';
        }
        if (!formData.currentAddress?.province?.trim()) {
          if (!newErrors.currentAddress) newErrors.currentAddress = {};
          newErrors.currentAddress.province = 'Province is required';
        }
        break;
        
      default:
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox' && name === 'teachingLevel') {
      const updatedLevels = checked
        ? [...formData.teachingLevel, value]
        : formData.teachingLevel.filter(level => level !== value);
      
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
            start: checked ? '07:00' : '',
            end: checked ? '16:00' : ''
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
    } else if (typeof value === 'object' && value !== null) {
      setFormData(prev => ({
        ...prev,
        [name]: value
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setHasAttemptedSubmit(true);
    
    if (!validateStep(4)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const submissionData = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName?.trim() || '',
        lastName: formData.lastName.trim(),
        suffix: formData.suffix || '',
        gender: formData.gender,
        civilStatus: formData.civilStatus || '',
        religion: formData.religion.trim(),
        birthday: formData.birthday,
        birthplace: formData.birthplace.trim(),
        age: parseInt(formData.age),
        contactNumber: formData.contactNumber,
        email: formData.email.trim().toLowerCase(),
        philhealth: formData.philhealth || '',
        sss: formData.sss || '',
        pagibig: formData.pagibig || '',
        tin: formData.tin || '',
        emergencyContact: {
          firstName: formData.emergencyContact.firstName.trim(),
          lastName: formData.emergencyContact.lastName.trim(),
          relationship: formData.emergencyContact.relationship.trim(),
          type: formData.emergencyContact.type || 'Landline',
          mobile: formData.emergencyContact.mobile || '',
          landline: formData.emergencyContact.landline || ''
        },
        currentAddress: {
          blkLt: formData.currentAddress.blkLt || '',
          block: formData.currentAddress.block || '',
          lot: formData.currentAddress.lot || '',
          street: formData.currentAddress.street.trim(),
          area: formData.currentAddress.area.trim(),
          barangay: formData.currentAddress.barangay.trim(),
          city: formData.currentAddress.city.trim(),
          province: formData.currentAddress.province.trim(),
          postalCode: formData.currentAddress.postalCode || '',
          country: formData.currentAddress.country || 'Philippines'
        },
        permanentAddress: formData.sameAsCurrent ? {
          blkLt: formData.currentAddress.blkLt || '',
          block: formData.currentAddress.block || '',
          lot: formData.currentAddress.lot || '',
          street: formData.currentAddress.street.trim(),
          area: formData.currentAddress.area.trim(),
          barangay: formData.currentAddress.barangay.trim(),
          city: formData.currentAddress.city.trim(),
          province: formData.currentAddress.province.trim(),
          postalCode: formData.currentAddress.postalCode || '',
          country: formData.currentAddress.country || 'Philippines'
        } : {
          blkLt: formData.permanentAddress.blkLt || '',
          block: formData.permanentAddress.block || '',
          lot: formData.permanentAddress.lot || '',
          street: formData.permanentAddress.street?.trim() || '',
          area: formData.permanentAddress.area?.trim() || '',
          barangay: formData.permanentAddress.barangay?.trim() || '',
          city: formData.permanentAddress.city?.trim() || '',
          province: formData.permanentAddress.province?.trim() || '',
          postalCode: formData.permanentAddress.postalCode || '',
          country: formData.permanentAddress.country || 'Philippines'
        },
        sameAsCurrent: formData.sameAsCurrent,
        department: formData.department,
        position: formData.position,
        teachingLevel: formData.teachingLevel || [],
        workType: formData.workType,
        workSchedule: formData.workSchedule,
        dateStart: formData.dateStart || null,
        dateSeparated: formData.dateSeparated || null,
        requirements: formData.requirements,
        status: 'Active'
      };

      console.log('Submitting employee data:', JSON.stringify(submissionData, null, 2));

      const response = await fetch('http://localhost:5000/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Employee created successfully:', result.data);
        showSuccessMessage(`Employee ${formData.firstName} ${formData.lastName} added successfully!`);
      } else {
        console.error('Error response:', result);
        let errorMessage = result.message || 'Error adding employee';
        
        if (result.error) {
          if (typeof result.error === 'string') {
            errorMessage = result.error;
          } else if (result.errors) {
            errorMessage = result.errors.join(', ');
          }
        }
        
        showSuccessMessage(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Network error:', error);
      showSuccessMessage('Network error: Could not connect to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateEmployeeId = () => {
    const departmentCode = {
      'Academic Department': 'ACA',
      'Administrative Department': 'ADM',
      'Maintenance and Facilities Department': 'MFD'
    }[formData.department] || 'EMP';
    
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${departmentCode}${randomNum}`;
  };

  const nextStep = () => {
    console.log('Next button clicked, current step:', step);
    console.log('Validation errors:', errors);
    
    if (!validateStep(step)) {
      console.log('Validation failed, stopping navigation');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    console.log('Validation passed, proceeding to next step');
    
    if (step === 1 && isMinor) {
      console.log('Minor detected, showing confirmation');
      if (!window.confirm('This employee is a minor. Are you sure you want to proceed?')) {
        return;
      }
    }
    
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      {/* Success Message Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all">
            <div className="bg-[#400504] p-4 rounded-t-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-[#cba235]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-white">
                    {successMessage.includes('Error:') ? 'Error' : 'Success'}
                  </h3>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                {successMessage.includes('Error:') ? (
                  <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-12 w-12 text-[#cba235]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <p className={`text-center text-lg font-medium ${
                successMessage.includes('Error:') ? 'text-red-600' : 'text-gray-900'
              }`}>
                {successMessage.replace('Error: ', '')}
              </p>
              <p className="text-center text-gray-600 mt-2">
                {successMessage.includes('Error:') 
                  ? 'Please try again.' 
                  : 'The employee has been added to the system.'
                }
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-3 rounded-b-lg">
              <div className="flex justify-center">
                <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
              </div>
              <p className="text-center text-xs text-gray-500 mt-2">
                Closing automatically...
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#400504]">Add New Employee</h2>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
      
      <StepProgress step={step} />
      
      {/* Error Display - Show on review step if validation fails */}
      {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-red-800 font-medium">Please fix the following errors before submitting:</h3>
          </div>
          <ul className="mt-2 text-red-700 text-sm list-disc list-inside">
            {Object.values(errors).map((error, index) => (
              <li key={index}>{typeof error === 'object' ? Object.values(error).join(', ') : error}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Go to First Step to Fix Errors
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md w-full">
        {step === 1 && (
          <BasicInfo 
            formData={formData} 
            errors={errors} 
            isMinor={isMinor} 
            handleInputChange={handleInputChange} 
          />
        )}
        
        {step === 2 && (
          <ContactInfo 
            formData={formData} 
            errors={errors} 
            handleInputChange={handleInputChange} 
          />
        )}
        
        {step === 3 && (
          <EmploymentDetails 
            formData={formData} 
            errors={errors} 
            departments={departments} 
            positions={positions} 
            handleInputChange={handleInputChange} 
            handleWorkScheduleChange={handleWorkScheduleChange} 
            generateEmployeeId={generateEmployeeId} 
          />
        )}
        
        {step === 4 && (
          <ReviewInfo 
            formData={formData} 
            isMinor={isMinor} 
            generateEmployeeId={generateEmployeeId} 
          />
        )}
        
        <FormNavigation 
          step={step} 
          prevStep={prevStep} 
          nextStep={nextStep} 
          isMinor={isMinor}
          isSubmitting={isSubmitting}
          validateStep={validateStep}
        />
      </form>
    </div>
  );
};

export default AddEmp;
import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import BasicInfo from '../AddEmp/BasicInfo';
import ContactInfo from '../AddEmp/ContactInfo';
import EmploymentDetails from '../AddEmp/EmploymentDetails';
import ReviewInfo from '../AddEmp/ReviewInfo';
import StepProgress from '../AddEmp/StepProgress';
import FormNavigation from '../AddEmp/FormNavigation';

const EditEmployeeModal = ({ isOpen, onClose, employee, onEmployeeUpdated, apiBaseUrl }) => {
  const [formData, setFormData] = useState({});
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isMinor, setIsMinor] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  useEffect(() => {
    if (employee) {
      // Transform employee data to match form structure
      const transformedData = {
        ...employee,
        currentAddress: employee.currentAddress || {
          blkLt: '', street: '', area: '', barangay: '', city: '', province: '', postalCode: '', country: 'Philippines'
        },
        permanentAddress: employee.permanentAddress || {
          blkLt: '', street: '', area: '', barangay: '', city: '', province: '', postalCode: '', country: 'Philippines'
        },
        emergencyContact: employee.emergencyContact || {
          firstName: '', lastName: '', relationship: '', type: 'Landline', mobile: '', landline: ''
        },
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
        },
        teachingLevel: employee.teachingLevel || [],
        sameAsCurrent: employee.sameAsCurrent || false
      };
      
      setFormData(transformedData);
      
      // Check if employee is minor
      if (employee.age && employee.age < 18) {
        setIsMinor(true);
      }
    }
  }, [employee]);

  const validateStep = (step) => {
    const newErrors = {};
    
    switch(step) {
      case 1:
        if (!formData.firstName?.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.birthday) newErrors.birthday = 'Birthday is required';
        if (!formData.age) newErrors.age = 'Age is required';
        break;
      case 2:
        if (!formData.contactNumber) newErrors.contactNumber = 'Contact number is required';
        if (!formData.email?.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
        break;
      case 3:
        if (!formData.department) newErrors.department = 'Department is required';
        if (!formData.position) newErrors.position = 'Position is required';
        if (!formData.workType) newErrors.workType = 'Work type is required';
        break;
      case 4:
        // Final validation before submission
        if (!formData.firstName?.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.birthday) newErrors.birthday = 'Birthday is required';
        if (!formData.contactNumber) newErrors.contactNumber = 'Contact number is required';
        if (!formData.email?.trim()) newErrors.email = 'Email is required';
        if (!formData.department) newErrors.department = 'Department is required';
        if (!formData.position) newErrors.position = 'Position is required';
        if (!formData.workType) newErrors.workType = 'Work type is required';
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
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Prepare update data - exclude fields that shouldn't be updated
      const updateData = {
        firstName: formData.firstName?.trim(),
        middleName: formData.middleName?.trim(),
        lastName: formData.lastName?.trim(),
        suffix: formData.suffix,
        gender: formData.gender,
        civilStatus: formData.civilStatus,
        religion: formData.religion,
        birthday: formData.birthday,
        age: parseInt(formData.age),
        contactNumber: formData.contactNumber,
        email: formData.email?.trim().toLowerCase(),
        philhealth: formData.philhealth || '',
        sss: formData.sss || '',
        pagibig: formData.pagibig || '',
        tin: formData.tin || '',
        emergencyContact: {
          firstName: formData.emergencyContact?.firstName?.trim(),
          lastName: formData.emergencyContact?.lastName?.trim(),
          relationship: formData.emergencyContact?.relationship || '',
          type: formData.emergencyContact?.type || 'Landline',
          mobile: formData.emergencyContact?.mobile || '',
          landline: formData.emergencyContact?.landline || ''
        },
        currentAddress: formData.currentAddress,
        permanentAddress: formData.sameAsCurrent ? formData.currentAddress : formData.permanentAddress,
        sameAsCurrent: formData.sameAsCurrent,
        department: formData.department,
        position: formData.position,
        teachingLevel: formData.teachingLevel,
        workType: formData.workType,
        workSchedule: formData.workSchedule,
        dateStart: formData.dateStart || null,
        dateSeparated: formData.dateSeparated || null,
        requirements: formData.requirements || {},
        rfidUid: formData.rfidUid,
        isRfidAssigned: formData.isRfidAssigned,
        status: formData.status
      };

      console.log('Updating employee data:', updateData);

      const response = await fetch(`${apiBaseUrl}/api/employees/${employee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Employee updated successfully:', result.data);
        setSuccess(`Employee ${formData.firstName} ${formData.lastName} updated successfully!`);
        
        setTimeout(() => {
          onEmployeeUpdated();
          onClose();
        }, 1500);
      } else {
        console.error('Error response:', result);
        let errorMessage = result.message || 'Error updating employee';
        
        if (result.error) {
          if (typeof result.error === 'string') {
            errorMessage = result.error;
          } else if (result.errors) {
            errorMessage = result.errors.join(', ');
          }
        }
        
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Network error:', error);
      setError('Network error: Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (!validateStep(step)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (step === 1 && isMinor) {
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

  const generateEmployeeId = () => {
    return employee.employeeId; // Keep the original employee ID
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="relative inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-[#400504] text-white">
            <div className="flex items-center">
              <h3 className="text-xl font-semibold">
                Edit Employee - {employee.firstName} {employee.lastName}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors"
              disabled={loading}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-red-800 font-medium">Error updating employee:</h3>
                </div>
                <p className="mt-2 text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-green-800 font-medium">{success}</h3>
                </div>
              </div>
            )}

            <StepProgress step={step} />
            
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
            
            <form onSubmit={handleSubmit}>
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
                  departments={[]} // Will be loaded by the component
                  positions={[]} // Will be loaded by the component
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
                isSubmitting={loading}
                validateStep={validateStep}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditEmployeeModal;
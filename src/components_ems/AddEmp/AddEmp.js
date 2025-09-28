import React, { useState, useEffect, useCallback } from 'react';
import BasicInfo from './BasicInfo';
import ContactInfo from './ContactInfo';
import EmploymentDetails from './EmploymentDetails';
import ReviewInfo from './ReviewInfo';
import StepProgress from './StepProgress';
import FormNavigation from './FormNavigation';

const AddEmp = ({ onCancel }) => {
  const initialFormData = {
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '',
    birthday: '',
    age: '',
    contactNumber: '',
    email: '',
    philhealth: '',
    sss: '',
    pagibig: '',
    emergencyContact: {
      type: 'Mobile',
      number: ''
    },
    currentAddress: {
      blkLt: '',
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
    profilePicture: null
  };

  const [formData, setFormData] = useState(initialFormData);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [step, setStep] = useState(1);
  const [isMinor, setIsMinor] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchDepartments = useCallback(async () => {
    try {
      const token = localStorage.getItem('ems_token');
      const response = await fetch('http://localhost:5000/api/departments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      } else {
        console.error('Failed to fetch departments');
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    }
  }, []);

  const updatePositions = useCallback(() => {
    let departmentPositions = [];
    switch (formData.department) {
      case 'Academic':
        departmentPositions = ['Teacher'];
        break;
      case 'Facilities & Operation':
        departmentPositions = ['Maintenance', 'Guard'];
        break;
      case 'Administrative & Support':
        departmentPositions = ['IT Support', 'Cashier', 'Registrar', 'Admission Officer'];
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
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.birthday) newErrors.birthday = 'Birthday is required';
        break;
      case 2:
        if (!formData.contactNumber) newErrors.contactNumber = 'Contact number is required';
        else if (!/^\d{11}$/.test(formData.contactNumber)) newErrors.contactNumber = 'Contact number must be 11 digits';
        
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
        
        if (!formData.emergencyContact.number) {
          newErrors.emergencyContact = 'Emergency contact number is required';
        } else if (formData.emergencyContact.type === 'Mobile' && !/^\d{11}$/.test(formData.emergencyContact.number)) {
          newErrors.emergencyContact = 'Mobile number must be 11 digits';
        } else if (formData.emergencyContact.type === 'Landline' && !/^\d{8}$/.test(formData.emergencyContact.number)) {
          newErrors.emergencyContact = 'Landline number must be 8 digits';
        }
        break;
      case 3:
        if (!formData.department) newErrors.department = 'Department is required';
        if (!formData.position) newErrors.position = 'Position is required';
        if (!formData.workType) newErrors.workType = 'Work type is required';
        
        const hasActiveDay = Object.values(formData.workSchedule).some(day => day.active);
        if (!hasActiveDay) newErrors.workSchedule = 'At least one work day must be selected';
        
        Object.entries(formData.workSchedule).forEach(([day, schedule]) => {
          if (schedule.active) {
            if (!schedule.start) newErrors.workSchedule = `Start time is required for ${day}`;
            else if (!schedule.end) newErrors.workSchedule = `End time is required for ${day}`;
          }
        });
        break;
      default:
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
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
    } else if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
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
      if (name === 'contactNumber' && !/^\d{0,11}$/.test(value)) return;
      if (name === 'sss' && !/^\d{0,10}$/.test(value)) return;
      if (name === 'pagibig' && !/^\d{0,12}$/.test(value)) return;
      if (name === 'philhealth' && !/^\d{0,12}$/.test(value)) return;
      if (name === 'emergencyContact.number') {
        const maxLength = formData.emergencyContact.type === 'Mobile' ? 11 : 8;
        if (!new RegExp(`^\\d{0,${maxLength}}$`).test(value)) return;
      }
      
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
    
    if (!validateStep(4)) return;
    
    try {
      const token = localStorage.getItem('ems_token');
      const formDataToSend = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (key === 'profilePicture' && formData[key]) {
          formDataToSend.append(key, formData[key]);
        } else if (typeof formData[key] === 'object' && key !== 'profilePicture') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      const response = await fetch('http://localhost:5000/api/employees', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        alert('Employee added successfully!');
        onCancel();
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Error adding employee');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error adding employee');
    }
  };

  const generateEmployeeId = () => {
    const departmentCode = {
      'Academic': 'ACAT',
      'Facilities & Operation': 'FAOP',
      'Administrative & Support': 'ADSU'
    }[formData.department] || 'EMP';
    
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `${departmentCode}${randomNum}`;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    
    if (step === 1 && isMinor) {
      if (!window.confirm('This employee is a minor. Are you sure you want to proceed?')) {
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#400504]">Add New Employee</h2>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>
      
      <StepProgress step={step} />
      
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
        />
      </form>
    </div>
  );
};

export default AddEmp;
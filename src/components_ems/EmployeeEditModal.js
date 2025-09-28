import React, { useState, useEffect } from 'react';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';

const EmployeeEditModal = ({ isOpen, onClose, employee, onEmployeeUpdated, apiBaseUrl }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '',
    birthday: '',
    age: '',
    email: '',
    contactNumber: '',
    department: '',
    position: '',
    workType: '',
    teachingLevel: [],
    sss: '',
    philhealth: '',
    pagibig: '',
    profilePicture: null,
    removeProfilePicture: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  // Department to positions mapping
  const departmentPositions = {
    'Academic': ['Teacher'],
    'Facilities & Operation': ['Maintenance', 'Guard'],
    'Administrative & Support': ['IT Support', 'Cashier', 'Registrar', 'Admission Officer']
  };

  // Teaching levels
  const teachingLevels = ['Pre-Kindergarten', 'Kindergarten', 'Elementary', 'High-School', 'Senior High-School'];

  useEffect(() => {
    if (employee) {
      // Format the data for the form
      const formattedData = {
        firstName: employee.firstName || '',
        middleName: employee.middleName || '',
        lastName: employee.lastName || '',
        gender: employee.gender || '',
        birthday: employee.birthday ? new Date(employee.birthday).toISOString().split('T')[0] : '',
        age: employee.age || '',
        email: employee.email || '',
        contactNumber: employee.contactNumber || '',
        department: employee.department || '',
        position: employee.position || '',
        workType: employee.workType || '',
        teachingLevel: employee.teachingLevel || [],
        sss: employee.sss || '',
        philhealth: employee.philhealth || '',
        pagibig: employee.pagibig || '',
        profilePicture: employee.profilePicture || '',
        removeProfilePicture: false
      };
      setFormData(formattedData);

      // Set image preview
      if (employee.profilePicture) {
        setImagePreview(`${apiBaseUrl}/uploads/${employee.profilePicture}?t=${new Date().getTime()}`);
      } else {
        setImagePreview('/default-avatar.png');
      }
    }
  }, [employee, apiBaseUrl]);

  useEffect(() => {
    // Fetch departments
    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem('ems_token');
        const response = await fetch(`${apiBaseUrl}/api/departments`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setDepartments(data);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };

    if (isOpen) {
      fetchDepartments();
    }
  }, [isOpen, apiBaseUrl]);

  useEffect(() => {
    // Update positions when department changes
    if (formData.department && departmentPositions[formData.department]) {
      setPositions(departmentPositions[formData.department]);
    } else {
      setPositions([]);
    }
  }, [formData.department]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('ems_token');
      
      // Create FormData for file upload
      const submitData = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (key === 'profilePicture' && formData[key] instanceof File) {
          submitData.append(key, formData[key]);
        } else if (key === 'teachingLevel') {
          submitData.append(key, JSON.stringify(formData[key]));
        } else if (key === 'removeProfilePicture') {
          // Only append if we're removing the picture
          if (formData[key]) {
            submitData.append(key, 'true');
          }
        } else {
          submitData.append(key, formData[key]);
        }
      });

      const response = await fetch(`${apiBaseUrl}/api/employees/${employee._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: submitData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update employee');
      }

      const updatedEmployee = await response.json();
      setSuccess('Employee updated successfully!');
      
      // Call the update callback
      setTimeout(() => {
        onEmployeeUpdated();
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error updating employee:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (type === 'checkbox' && name === 'teachingLevel') {
      const updatedLevels = checked
        ? [...formData.teachingLevel, value]
        : formData.teachingLevel.filter(level => level !== value);
      
      setFormData(prev => ({ ...prev, teachingLevel: updatedLevels }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'file') {
      const file = files[0];
      if (file) {
        setFormData(prev => ({ ...prev, [name]: file }));
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ 
      ...prev, 
      profilePicture: null,
      removeProfilePicture: true 
    }));
    setImagePreview('/default-avatar.png');
  };

  const calculateAge = (birthday) => {
    if (!birthday) return '';
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age.toString();
  };

  const handleBirthdayChange = (e) => {
    const birthday = e.target.value;
    const age = calculateAge(birthday);
    setFormData(prev => ({ ...prev, birthday, age }));
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="relative inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#400504] to-[#5a0705]">
            <div className="flex items-center">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-white">
                  Edit Employee
                </h3>
                <p className="text-white text-opacity-80 text-sm">
                  Update information for {employee.firstName} {employee.lastName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-10"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-700 text-sm">{success}</span>
              </div>
            </div>
          )}

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Profile Picture */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h4>
                    
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Profile Preview"
                          className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg"
                        />
                        {loading && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 space-y-3 w-full">
                        <label className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <PhotoIcon className="h-5 w-5 text-gray-600 mr-2" />
                          <span className="text-sm font-medium text-gray-700">Change Photo</span>
                          <input
                            type="file"
                            name="profilePicture"
                            onChange={handleChange}
                            accept="image/*"
                            className="hidden"
                            disabled={loading}
                          />
                        </label>
                        
                        {imagePreview !== '/default-avatar.png' && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                            disabled={loading}
                          >
                            Remove Photo
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Employee ID Display */}
                    <div className="mt-6 p-3 bg-white rounded-lg border border-gray-200">
                      <label className="block text-xs font-medium text-gray-500 uppercase">Employee ID</label>
                      <p className="text-lg font-mono font-bold text-[#400504]">{employee.employeeId}</p>
                    </div>
                  </div>
                </div>

                {/* Right Column - Form Fields */}
                <div className="lg:col-span-2">
                  <div className="space-y-6">
                    {/* Personal Information */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="h-5 w-5 text-[#cba235] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Personal Information
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name *
                          </label>
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                            required
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Middle Name
                          </label>
                          <input
                            type="text"
                            name="middleName"
                            value={formData.middleName}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                            required
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Gender *
                          </label>
                          <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                            required
                            disabled={loading}
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Birthday *
                          </label>
                          <input
                            type="date"
                            name="birthday"
                            value={formData.birthday}
                            onChange={handleBirthdayChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                            required
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Age
                          </label>
                          <input
                            type="text"
                            value={formData.age}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                            readOnly
                            disabled
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="h-5 w-5 text-[#cba235] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Contact Information
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                            required
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contact Number *
                          </label>
                          <input
                            type="text"
                            name="contactNumber"
                            value={formData.contactNumber}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Employment Information */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="h-5 w-5 text-[#cba235] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Employment Information
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Department *
                          </label>
                          <select
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                            required
                            disabled={loading}
                          >
                            <option value="">Select Department</option>
                            {departments.map(dept => (
                              <option key={dept._id} value={dept.name}>{dept.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Position *
                          </label>
                          <select
                            name="position"
                            value={formData.position}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                            required
                            disabled={loading}
                          >
                            <option value="">Select Position</option>
                            {positions.map(pos => (
                              <option key={pos} value={pos}>{pos}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Work Type *
                          </label>
                          <select
                            name="workType"
                            value={formData.workType}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                            required
                            disabled={loading}
                          >
                            <option value="">Select Work Type</option>
                            <option value="Full-Time">Full-Time</option>
                            <option value="Part-Time">Part-Time</option>
                          </select>
                        </div>
                      </div>

                      {/* Teaching Levels (only for Academic Teachers) */}
                      {formData.department === 'Academic' && formData.position === 'Teacher' && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Teaching Levels
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {teachingLevels.map(level => (
                              <label key={level} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  name="teachingLevel"
                                  value={level}
                                  checked={formData.teachingLevel.includes(level)}
                                  onChange={handleChange}
                                  className="h-4 w-4 text-[#cba235] focus:ring-[#cba235] border-gray-300 rounded"
                                  disabled={loading}
                                />
                                <span className="text-sm text-gray-700">{level}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Government IDs */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="h-5 w-5 text-[#cba235] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Government IDs
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SSS Number
                          </label>
                          <input
                            type="text"
                            name="sss"
                            value={formData.sss}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            PhilHealth
                          </label>
                          <input
                            type="text"
                            name="philhealth"
                            value={formData.philhealth}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            PAG-IBIG
                          </label>
                          <input
                            type="text"
                            name="pagibig"
                            value={formData.pagibig}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-[#cba235] to-[#d4b44c] border border-transparent rounded-lg hover:from-[#dbb545] hover:to-[#e4c55d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#cba235] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  'Update Employee'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmployeeEditModal;
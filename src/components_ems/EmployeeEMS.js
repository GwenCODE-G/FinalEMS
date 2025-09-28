import React, { useState, useEffect, useCallback } from 'react';
import { 
  EyeIcon, 
  PencilIcon, 
  ArchiveBoxIcon, 
  PlusIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// Import the modal components
import EmployeeViewModal from './EmployeeViewModal';
import EmployeeEditModal from './EmployeeEditModal';
import ArchiveEmployeeModal from './ArchiveEmployeeModal';

const EmployeeEMS = ({ onAddEmployee, onViewDepartment, refreshTrigger }) => {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [apiBaseUrl] = useState('http://localhost:5000');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  
  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archived'

  // Define fetchEmployees with useCallback to avoid infinite re-renders
  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('ems_token');
      const response = await fetch(`${apiBaseUrl}/api/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  // Fetch employees on component mount and when refreshTrigger changes
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees, refreshTrigger]);

  // Filter employees based on search term and active/archived status
  useEffect(() => {
    const filtered = employees.filter(employee => {
      const matchesSearch = 
        (employee.employeeId && employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (employee.firstName && employee.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (employee.middleName && employee.middleName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (employee.lastName && employee.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (employee.department && employee.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (employee.position && employee.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (employee.email && employee.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = activeTab === 'active' 
        ? employee.status === 'Active'
        : employee.status === 'Archived';

      return matchesSearch && matchesStatus;
    });
    setFilteredEmployees(filtered);
  }, [searchTerm, employees, activeTab]);

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setSuccessMessage('');
    }, 5000);
  };

  // Modal handlers
  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setViewModalOpen(true);
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setEditModalOpen(true);
  };

  const handleArchiveEmployee = (employee) => {
    setSelectedEmployee(employee);
    setArchiveModalOpen(true);
  };

  const handleEmployeeUpdated = () => {
    fetchEmployees();
    showSuccessMessage('Employee updated successfully!');
  };

  const handleEmployeeArchived = () => {
    fetchEmployees();
    showSuccessMessage('Employee archived successfully!');
  };

  const handleEmployeeRestored = () => {
    fetchEmployees();
    showSuccessMessage('Employee restored successfully!');
  };

  // Improved image error handler
  const handleImageError = (e, employeeId) => {
    console.log(`Image load error for employee ${employeeId}, using default avatar`);
    
    // Mark this image as failed in state
    setImageErrors(prev => ({
      ...prev,
      [employeeId]: true
    }));
    
    // Use default avatar
    e.target.src = '/default-avatar.png';
    
    // Add error styling
    e.target.classList.add('bg-gray-200', 'border-gray-300');
    e.target.classList.remove('border-[#cba235]');
    
    // Prevent infinite error loop
    e.target.onerror = null;
  };

  // Improved profile image URL generator with cache busting
  const getProfileImageUrl = (profilePicture, employeeId) => {
    // If this image has previously failed, return default immediately
    if (imageErrors[employeeId]) {
      return '/default-avatar.png';
    }
    
    if (!profilePicture) {
      return '/default-avatar.png';
    }
    
    // Check if it's a data URL (for newly uploaded images)
    if (profilePicture.startsWith('data:image')) {
      return profilePicture;
    }
    
    // Check if it's already a full URL
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    }
    
    // For uploaded files, construct the URL with cache busting
    // Use a random parameter to prevent caching
    const random = Math.random().toString(36).substring(7);
    return `${apiBaseUrl}/uploads/${profilePicture}?v=${random}`;
  };

  const formatRfidUid = (uid) => {
    if (!uid) return 'Not Assigned';
    return uid.toUpperCase();
  };

  const getWorkTypeBadge = (workType) => {
    return workType === 'Full-Time' 
      ? 'bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full'
      : 'bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full';
  };

  const getStatusBadge = (status) => {
    return status === 'Active'
      ? 'bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full'
      : 'bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full';
  };

  const getRfidBadge = (rfidUid, isAssigned) => {
    if (!rfidUid || !isAssigned) {
      return 'bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full';
    }
    return 'bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full';
  };

  // Preload default avatar to prevent flickering
  useEffect(() => {
    const preloadImage = (src) => {
      const img = new Image();
      img.src = src;
    };
    
    preloadImage('/default-avatar.png');
  }, []);

  // Calculate statistics
  const activeEmployees = employees.filter(e => e.status === 'Active');
  const archivedEmployees = employees.filter(e => e.status === 'Archived');
  const rfidAssigned = employees.filter(e => e.isRfidAssigned).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#400504]"></div>
        <span className="ml-4 text-lg">Loading employees...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-2">Error loading employees</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={fetchEmployees}
            className="px-4 py-2 bg-[#400504] text-white rounded-lg hover:bg-[#300404] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-[#400504] text-white px-6 py-3 rounded-lg shadow-lg border-l-4 border-[#cba235]">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-[#cba235]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{successMessage}</p>
              </div>
              <button
                onClick={() => setShowSuccess(false)}
                className="ml-auto text-[#cba235] hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-[#400504]">Employee Management</h1>
          <p className="text-gray-600 text-sm">Manage all employee records and information</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 lg:flex-none lg:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search employees..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onViewDepartment}
              className="flex items-center px-3 py-2 bg-white text-[#400504] border border-[#400504] rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              <BuildingOfficeIcon className="h-4 w-4 mr-2" />
              Departments
            </button>
            <button
              onClick={onAddEmployee}
              className="flex items-center px-3 py-2 bg-[#cba235] text-[#400504] rounded-lg hover:bg-[#dbb545] transition-colors font-medium text-sm"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Employee
            </button>
            <button
              onClick={fetchEmployees}
              className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              title="Refresh"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 px-1 border-b-2 font-medium text-xs ${
              activeTab === 'active'
                ? 'border-[#cba235] text-[#400504]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserGroupIcon className="h-4 w-4 inline mr-2" />
            Active ({activeEmployees.length})
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`py-2 px-1 border-b-2 font-medium text-xs ${
              activeTab === 'archived'
                ? 'border-[#cba235] text-[#400504]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ArchiveBoxIcon className="h-4 w-4 inline mr-2" />
            Archived ({archivedEmployees.length})
          </button>
        </nav>
      </div>

      {/* Statistics Cards - Compact Version */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Total</p>
              <p className="text-lg font-bold text-gray-900">{employees.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Active</p>
              <p className="text-lg font-bold text-gray-900">{activeEmployees.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">RFID</p>
              <p className="text-lg font-bold text-gray-900">{rfidAssigned}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <ArchiveBoxIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Archived</p>
              <p className="text-lg font-bold text-gray-900">{archivedEmployees.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Employees Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-[#400504]">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Employee
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Department
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Position
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Work Type
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                  RFID
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50 transition-colors">
                    {/* Employee Profile Column */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <img
                            src={getProfileImageUrl(employee.profilePicture, employee._id)}
                            alt={`${employee.firstName} ${employee.lastName}`}
                            className="h-8 w-8 rounded-full object-cover border border-[#cba235] bg-gray-200"
                            onError={(e) => handleImageError(e, employee._id)}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {employee.employeeId}
                          </div>
                          <div className="text-xs text-gray-400 truncate max-w-[120px]">
                            {employee.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department Column */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.department}</div>
                    </td>

                    {/* Position Column */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.position}</div>
                      {employee.teachingLevel && employee.teachingLevel.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {employee.teachingLevel.slice(0, 2).join(', ')}
                          {employee.teachingLevel.length > 2 && '...'}
                        </div>
                      )}
                    </td>

                    {/* Work Type Column */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={getWorkTypeBadge(employee.workType)}>
                        {employee.workType}
                      </span>
                    </td>

                    {/* RFID Column */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={getRfidBadge(employee.rfidUid, employee.isRfidAssigned)}>
                        {employee.rfidUid ? formatRfidUid(employee.rfidUid) : 'Not Assigned'}
                      </span>
                    </td>

                    {/* Status Column */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={getStatusBadge(employee.status)}>
                        {employee.status}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => handleViewEmployee(employee)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEditEmployee(employee)}
                          className="text-[#cba235] hover:text-[#dbb545] p-1 rounded transition-colors"
                          title="Edit Employee"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleArchiveEmployee(employee)}
                          className={`p-1 rounded transition-colors ${
                            employee.status === 'Active' 
                              ? 'text-red-600 hover:text-red-800' 
                              : 'text-green-600 hover:text-green-800'
                          }`}
                          title={employee.status === 'Active' ? 'Archive Employee' : 'Restore Employee'}
                        >
                          <ArchiveBoxIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-base font-medium text-gray-900 mb-1">
                        {searchTerm ? 'No employees found' : `No ${activeTab} employees`}
                      </h3>
                      <p className="text-gray-500 text-sm mb-3">
                        {searchTerm 
                          ? 'Try adjusting your search terms'
                          : activeTab === 'active' 
                            ? 'Get started by adding your first employee'
                            : 'No archived employees found'
                        }
                      </p>
                      {!searchTerm && activeTab === 'active' && (
                        <button
                          onClick={onAddEmployee}
                          className="inline-flex items-center px-3 py-2 bg-[#cba235] text-[#400504] rounded-lg hover:bg-[#dbb545] transition-colors font-medium text-sm"
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Add First Employee
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {filteredEmployees.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <span>
                Showing {filteredEmployees.length} of {activeTab === 'active' ? activeEmployees.length : archivedEmployees.length} {activeTab} employees
              </span>
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedEmployee && (
        <>
          <EmployeeViewModal
            isOpen={viewModalOpen}
            onClose={() => setViewModalOpen(false)}
            employee={selectedEmployee}
            getProfileImageUrl={getProfileImageUrl}
            handleImageError={handleImageError}
          />
          
          <EmployeeEditModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            employee={selectedEmployee}
            onEmployeeUpdated={handleEmployeeUpdated}
            apiBaseUrl={apiBaseUrl}
          />
          
          <ArchiveEmployeeModal
            isOpen={archiveModalOpen}
            onClose={() => setArchiveModalOpen(false)}
            employee={selectedEmployee}
            onEmployeeArchived={handleEmployeeArchived}
            onEmployeeRestored={handleEmployeeRestored}
            apiBaseUrl={apiBaseUrl}
          />
        </>
      )}
    </div>
  );
};

export default EmployeeEMS;
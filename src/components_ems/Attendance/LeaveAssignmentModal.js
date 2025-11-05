import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaTimes, FaInfoCircle, 
  FaSync, FaCheck, FaExclamationTriangle,
  FaDatabase
} from 'react-icons/fa';
import axios from 'axios';

const LeaveAssignmentModal = ({ 
  isOpen, 
  onClose, 
  employee, 
  onAssignSuccess 
}) => {
  const [leaveData, setLeaveData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    leaveType: 'Vacation',
    status: 'Approved'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [assignmentStatus, setAssignmentStatus] = useState('');
  const [maxYear, setMaxYear] = useState(2030);

  const safeEmployee = employee || {};
  const employeeName = safeEmployee.firstName && safeEmployee.lastName 
    ? `${safeEmployee.firstName} ${safeEmployee.lastName}`
    : 'Unknown Employee';
  const employeeId = safeEmployee.employeeId || 'Unknown ID';

  const getDateConstraints = useCallback(() => {
    const currentYear = new Date().getFullYear();
    
    if (currentYear >= maxYear) {
      const newMaxYear = currentYear + 5;
      setMaxYear(newMaxYear);
      return {
        minDate: '2024-10-01',
        maxDate: `${newMaxYear}-12-31`
      };
    }
    
    return {
      minDate: '2024-10-01',
      maxDate: `${maxYear}-12-31`
    };
  }, [maxYear]);

  const checkAndUpdateMaxYear = useCallback(() => {
    const currentYear = new Date().getFullYear();
    if (currentYear >= maxYear - 1) {
      setMaxYear(currentYear + 5);
    }
  }, [maxYear]);

  const getDateConstraintsForDisplay = useCallback(() => {
    const constraints = getDateConstraints();
    const minDate = new Date(constraints.minDate);
    const maxDate = new Date(constraints.maxDate);
    
    return {
      minDate: minDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      maxDate: maxDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    };
  }, [getDateConstraints]);

  useEffect(() => {
    const findBackendUrl = async () => {
      const ports = [5000, 5001, 3001, 3000, 8080];
      for (let port of ports) {
        try {
          await axios.get(`http://localhost:${port}/api/test`, { timeout: 3000 });
          setApiBaseUrl(`http://localhost:${port}`);
          break;
        } catch (error) {
          continue;
        }
      }
    };
    
    if (isOpen) {
      findBackendUrl();
      checkAndUpdateMaxYear();
      
      const today = new Date();
      const constraints = getDateConstraints();
      const minDate = new Date(constraints.minDate);
      
      let defaultStartDate = today;
      if (today < minDate) {
        defaultStartDate = minDate;
      }
      
      const formattedDate = defaultStartDate.toISOString().split('T')[0];
      
      setLeaveData({
        startDate: formattedDate,
        endDate: formattedDate,
        reason: '',
        leaveType: 'Vacation',
        status: 'Approved'
      });
      setValidationErrors({});
      setIsSubmitting(false);
      setAssignmentStatus('');
    }
  }, [isOpen, checkAndUpdateMaxYear, getDateConstraints]);

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        checkAndUpdateMaxYear();
      }, 30 * 24 * 60 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [isOpen, maxYear, checkAndUpdateMaxYear]);

  const validateForm = () => {
    const errors = {};
    const constraints = getDateConstraints();

    if (!leaveData.startDate) {
      errors.startDate = 'Start date is required';
    } else {
      const startDate = new Date(leaveData.startDate);
      const minDate = new Date(constraints.minDate);
      const maxDate = new Date(constraints.maxDate);
      
      if (startDate < minDate) {
        errors.startDate = `Start date cannot be before ${getDateConstraintsForDisplay().minDate}`;
      }
      
      if (startDate > maxDate) {
        errors.startDate = `Start date cannot be after ${getDateConstraintsForDisplay().maxDate}`;
      }
    }

    if (!leaveData.endDate) {
      errors.endDate = 'End date is required';
    } else {
      const endDate = new Date(leaveData.endDate);
      const minDate = new Date(constraints.minDate);
      const maxDate = new Date(constraints.maxDate);
      
      if (endDate < minDate) {
        errors.endDate = `End date cannot be before ${getDateConstraintsForDisplay().minDate}`;
      }
      
      if (endDate > maxDate) {
        errors.endDate = `End date cannot be after ${getDateConstraintsForDisplay().maxDate}`;
      }
    }

    if (leaveData.startDate && leaveData.endDate) {
      const start = new Date(leaveData.startDate);
      const end = new Date(leaveData.endDate);
      
      if (end < start) {
        errors.endDate = 'End date cannot be before start date';
      }
    }

    if (!leaveData.leaveType) {
      errors.leaveType = 'Leave type is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setLeaveData(prev => ({
      ...prev,
      [field]: value
    }));

    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleAssignLeave = async () => {
    if (!apiBaseUrl) {
      alert('Backend connection not available. Please make sure the backend server is running.');
      return;
    }

    if (!safeEmployee.employeeId) {
      alert('Employee information is incomplete. Cannot assign leave.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setAssignmentStatus('assigning');

    try {
      console.log('Assigning leave to both collections:', {
        employeeId: safeEmployee.employeeId,
        startDate: leaveData.startDate,
        endDate: leaveData.endDate,
        reason: leaveData.reason,
        leaveType: leaveData.leaveType,
        status: leaveData.status,
        database: 'BrightonSystem',
        collections: ['EMS_Leaves', 'EMS_Attendance']
      });

      const response = await axios.post(`${apiBaseUrl}/api/attendance/leave`, {
        employeeId: safeEmployee.employeeId,
        startDate: leaveData.startDate,
        endDate: leaveData.endDate,
        reason: leaveData.reason,
        leaveType: leaveData.leaveType,
        status: leaveData.status
      });

      if (response.data.success) {
        console.log('Leave assignment successful in both collections:', response.data);
        setAssignmentStatus('success');
        
        setTimeout(() => {
          if (onAssignSuccess) {
            onAssignSuccess();
          }
          onClose();
        }, 1500);
      } else {
        throw new Error(response.data.message || 'Failed to assign leave');
      }
    } catch (error) {
      console.error('Leave assignment error:', error);
      setAssignmentStatus('error');
      
      if (error.response?.data?.message) {
        alert(`Leave Assignment Failed: ${error.response.data.message}`);
      } else {
        alert('Error assigning leave. Please check the backend connection and try again.');
      }
      
      setIsSubmitting(false);
    }
  };

  const calculateLeaveDays = () => {
    if (!leaveData.startDate || !leaveData.endDate) return 0;
    
    const start = new Date(leaveData.startDate);
    const end = new Date(leaveData.endDate);
    
    if (end < start) return 0;
    
    let days = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const getStatusMessage = () => {
    switch (assignmentStatus) {
      case 'assigning':
        return { message: 'Assigning leave to EMS_Leaves and EMS_Attendance collections...', color: 'text-blue-600' };
      case 'success':
        return { message: 'Leave assigned successfully to both collections!', color: 'text-green-600' };
      case 'error':
        return { message: 'Operation failed. Please try again.', color: 'text-red-600' };
      default:
        return { message: '', color: '' };
    }
  };

  const leaveDays = calculateLeaveDays();
  const dateConstraints = getDateConstraints();
  const displayConstraints = getDateConstraintsForDisplay();
  const status = getStatusMessage();

  if (!isOpen || !safeEmployee.employeeId) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-[#400504]">
            Assign Leave - {employeeName}
          </h3>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <FaInfoCircle className="text-blue-600 mt-1 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-blue-800 font-semibold">Leave Assignment</h4>
                  <p className="text-blue-700 text-sm mt-2">
                    Assigning leave for: <strong>{employeeName}</strong>
                  </p>
                  <p className="text-blue-700 text-sm mt-1">
                    Employee ID: <strong>{employeeId}</strong>
                  </p>
                  <div className="flex items-center mt-2 text-blue-600 text-sm">
                    <FaDatabase className="mr-2" />
                    <span>Will be saved to EMS_Leaves and EMS_Attendance collections</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 text-sm font-medium">
                  Date Range Available:
                </span>
                <span className="text-gray-600 text-xs text-right">
                  {displayConstraints.minDate} to {displayConstraints.maxDate}
                </span>
              </div>
              <div className="text-gray-500 text-xs mt-1">
                Calendar automatically extends every 5 years. Current range: 2024-{maxYear}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={leaveData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm ${
                    validationErrors.startDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  min={dateConstraints.minDate}
                  max={dateConstraints.maxDate}
                  disabled={isSubmitting}
                />
                {validationErrors.startDate && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.startDate}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={leaveData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm ${
                    validationErrors.endDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  min={leaveData.startDate || dateConstraints.minDate}
                  max={dateConstraints.maxDate}
                  disabled={isSubmitting}
                />
                {validationErrors.endDate && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.endDate}</p>
                )}
              </div>
            </div>

            {leaveDays > 0 && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-green-800 text-sm font-medium">
                    Leave Duration:
                  </span>
                  <span className="text-green-700 font-bold">
                    {leaveDays} work day{leaveDays !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leave Type <span className="text-red-500">*</span>
              </label>
              <select
                value={leaveData.leaveType}
                onChange={(e) => handleInputChange('leaveType', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm ${
                  validationErrors.leaveType ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              >
                <option value="Vacation">Vacation Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Emergency">Emergency Leave</option>
                <option value="Personal">Personal Leave</option>
                <option value="Maternity">Maternity Leave</option>
                <option value="Paternity">Paternity Leave</option>
                <option value="Bereavement">Bereavement Leave</option>
                <option value="Study">Study Leave</option>
                <option value="Sabbatical">Sabbatical Leave</option>
              </select>
              {validationErrors.leaveType && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.leaveType}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={leaveData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm"
                disabled={isSubmitting}
              >
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={leaveData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm"
                placeholder="Enter reason for leave..."
                disabled={isSubmitting}
              />
            </div>

            {status.message && (
              <div className={`p-3 rounded-lg border ${status.color.replace('text-', 'bg-').replace('-600', '-100')} ${status.color.replace('text-', 'border-').replace('-600', '-200')}`}>
                <p className={`text-sm font-medium ${status.color}`}>
                  {status.message}
                </p>
              </div>
            )}

            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <FaExclamationTriangle className="text-yellow-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-yellow-800 font-semibold text-sm">Important Notes</h4>
                  <ul className="text-yellow-700 text-xs mt-1 space-y-1">
                    <li>• Leave records will be saved in both EMS_Leaves and EMS_Attendance collections</li>
                    <li>• Only work days (Monday-Friday) are counted</li>
                    <li>• Date range: October 2024 to December {maxYear} (auto-extends)</li>
                    <li>• Existing attendance records will be converted to leave</li>
                    <li>• Employee cannot time in/out during leave period</li>
                    <li>• Time-In, Time-Out, and Status will show "IN_LEAVE" during leave dates</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t sticky bottom-0 bg-white">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssignLeave}
              disabled={isSubmitting || !leaveData.startDate || !leaveData.endDate}
              className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
            >
              {isSubmitting && assignmentStatus === 'assigning' ? (
                <>
                  <FaSync className="animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <FaCheck />
                  <span>Assign Leave</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveAssignmentModal;
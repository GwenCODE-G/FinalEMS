import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaClock, FaSignOutAlt, FaIdCard, 
  FaUserTimes, FaClock as FaClockIcon, FaHistory,
  FaSort, FaSortUp, FaSortDown,
  FaUser, FaBuilding, FaBriefcase,
  FaCheckCircle, FaExclamationTriangle, FaTimesCircle,
  FaInfoCircle, FaSearch, FaSync,
  FaChevronLeft, FaChevronRight,
  FaCalendarPlus
} from 'react-icons/fa';
import axios from 'axios';
import LeaveAssignmentModal from './LeaveAssignmentModal';

const CustomConfirmModal = ({ isOpen, onConfirm, onCancel, title, message, confirmText = "Confirm", cancelText = "Cancel" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-bold text-[#400504]">{title}</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimesCircle />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700">{message}</p>
        </div>

        <div className="p-6 border-t">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] transition-colors"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomAlert = ({ message, type = 'info', onClose }) => {
  const getAlertStyles = () => {
    switch (type) {
      case 'success':
        return {
          background: 'linear-gradient(135deg, #400504 0%, #300303 100%)',
          border: '2px solid #cba235',
          color: 'white'
        };
      case 'error':
        return {
          background: 'linear-gradient(135deg, #400504 0%, #300303 100%)',
          border: '2px solid #ff6b6b',
          color: 'white'
        };
      case 'warning':
        return {
          background: 'linear-gradient(135deg, #400504 0%, #300303 100%)',
          border: '2px solid #cba235',
          color: 'white'
        };
      default:
        return {
          background: 'linear-gradient(135deg, #400504 0%, #300303 100%)',
          border: '2px solid #cba235',
          color: 'white'
        };
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div style={getAlertStyles()} className="px-6 py-4 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {type === 'success' && <FaCheckCircle className="h-5 w-5 text-[#cba235] mr-3" />}
            {type === 'error' && <FaTimesCircle className="h-5 w-5 text-[#ff6b6b] mr-3" />}
            {type === 'warning' && <FaExclamationTriangle className="h-5 w-5 text-[#cba235] mr-3" />}
            <p className="text-sm font-medium">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-[#cba235] hover:text-white transition-colors"
          >
            <FaTimesCircle />
          </button>
        </div>
      </div>
    </div>
  );
};

const RfidAssignmentModal = ({ 
  isOpen, 
  onClose, 
  employee, 
  onAssignSuccess 
}) => {
  const [uidInput, setUidInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

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
      setUidInput('');
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  }, [isOpen]);

  const normalizeUid = (uid) => {
    if (!uid) return '';
    return uid.replace(/\s/g, '').toUpperCase();
  };

  const formatUidForDisplay = (uid) => {
    if (!uid) return '';
    const cleanUid = normalizeUid(uid);
    if (cleanUid.length === 8) {
      return cleanUid.match(/.{1,2}/g)?.join(' ').toUpperCase() || cleanUid;
    }
    return cleanUid;
  };

  const validateUid = (uid) => {
    const normalizedUid = normalizeUid(uid);
    
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

  const handleUidInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    const cleanValue = value.replace(/[^0-9A-F\s]/g, '');
    
    let formatted = '';
    let charCount = 0;
    
    for (let i = 0; i < cleanValue.length; i++) {
      if (cleanValue[i] === ' ') continue;
      
      if (charCount > 0 && charCount % 2 === 0) {
        formatted += ' ';
      }
      formatted += cleanValue[i];
      charCount++;
      
      if (charCount >= 8) break;
    }
    
    setUidInput(formatted.trim());
  };

  const handleAssignRfid = async () => {
    if (!apiBaseUrl) {
      alert('Backend connection not available. Please make sure the backend server is running.');
      return;
    }

    const cleanUid = normalizeUid(uidInput);
    const validation = validateUid(cleanUid);
    
    if (!validation.valid) {
      alert(`Invalid UID Format:\n${validation.message}\n\nExamples:\n• E154E2A9\n• E1 54 E2 A9\n• 4DD6D8B5`);
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Assigning RFID to EMS_UID collection:', {
        employeeId: employee.employeeId,
        uid: cleanUid,
        database: 'BrightonSystem',
        collection: 'EMS_UID'
      });

      const response = await axios.post(`${apiBaseUrl}/api/rfid/assign`, {
        employeeId: employee.employeeId,
        rfidUid: cleanUid
      });

      if (response.data.success) {
        console.log('RFID assignment successful in EMS_UID:', response.data);
        if (onAssignSuccess) {
          onAssignSuccess();
        }
        onClose();
      } else {
        throw new Error(response.data.message || 'Failed to assign RFID');
      }
    } catch (error) {
      console.error('RFID assignment error:', error);
      if (error.response?.data?.message) {
        alert(`RFID Assignment Failed: ${error.response.data.message}`);
      } else {
        alert('Error assigning RFID. Please check the backend connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      setShowConfirm(true);
    }
  };

  const handleConfirmAssign = () => {
    setShowConfirm(false);
    handleAssignRfid();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg w-full max-w-md">
          <div className="flex justify-between items-center p-6 border-b">
            <h3 className="text-lg font-bold text-[#400504]">
              Assign RFID Card
            </h3>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaTimesCircle />
            </button>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start">
                  <FaInfoCircle className="text-blue-600 mt-1 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-blue-800 font-semibold">RFID Card Assignment</h4>
                    <p className="text-blue-700 text-sm mt-2">
                      Assigning RFID to: <strong>{employee.firstName} {employee.lastName}</strong>
                    </p>
                    <p className="text-blue-700 text-sm mt-1">
                      Employee ID: <strong>{employee.employeeId}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label htmlFor="rfid-uid-input" className="block text-sm font-medium text-gray-700">
                  RFID UID <span className="text-red-500">*</span>
                </label>
                
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <input
                      id="rfid-uid-input"
                      name="rfidUid"
                      type="text"
                      value={uidInput}
                      onChange={handleUidInputChange}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter UID (e.g., E1 54 E2 A9)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] focus:border-transparent font-mono text-sm uppercase"
                      maxLength={11}
                      disabled={isSubmitting}
                      autoComplete="off"
                    />
                    {uidInput && (
                      <button
                        type="button"
                        onClick={() => setUidInput('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <FaTimesCircle />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-gray-500">
                    Enter 8 hexadecimal characters (0-9, A-F). Spaces will be added automatically.
                  </p>
                  {uidInput && (
                    <p className="text-xs text-green-600 font-mono">
                      Formatted: {formatUidForDisplay(uidInput)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t">
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
                onClick={() => setShowConfirm(true)}
                disabled={isSubmitting || !uidInput.trim()}
                className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <FaSync className="animate-spin" />
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    <span>Assign RFID</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <CustomConfirmModal
        isOpen={showConfirm}
        onConfirm={handleConfirmAssign}
        onCancel={() => setShowConfirm(false)}
        title="Confirm RFID Assignment"
        message={`Are you sure you want to assign RFID card to ${employee.firstName} ${employee.lastName}?`}
        confirmText="Assign RFID"
        cancelText="Cancel"
      />
    </>
  );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = [];
  
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white sm:px-6">
      <div className="flex justify-between flex-1 sm:hidden">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
            currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
            currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing page <span className="font-medium">{currentPage}</span> of{' '}
            <span className="font-medium">{totalPages}</span> pages
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                currentPage === 1 ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <span className="sr-only">Previous</span>
              <FaChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            
            {pages.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                  page === currentPage
                    ? 'bg-[#400504] text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#400504]'
                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                currentPage === totalPages ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <span className="sr-only">Next</span>
              <FaChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

const AttendanceTable = ({
  employees,
  attendance,
  realTimeUpdates,
  selectedDate,
  onViewHistory,
  onManualTimeIn,
  onManualTimeOut,
  onAssignRfid,
  onRemoveRfid,
  apiBaseUrl
}) => {
  const [sortConfig, setSortConfig] = useState({ key: 'recentActivity', direction: 'desc' });
  const [localUpdates, setLocalUpdates] = useState({});
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [loadingRemove, setLoadingRemove] = useState({});
  const [alert, setAlert] = useState(null);
  const [rfidAssignments, setRfidAssignments] = useState({});
  const [rfidModal, setRfidModal] = useState({ isOpen: false, employee: null });
  const [leaveModal, setLeaveModal] = useState({ isOpen: false, employee: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState({ isOpen: false, employee: null });
  const [employeeLeaves, setEmployeeLeaves] = useState({});

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const isWorkDay = useCallback((employee, date) => {
    if (!employee.workSchedule) return true;
    
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const schedule = employee.workSchedule[dayOfWeek];
    
    return schedule ? schedule.active : false;
  }, []);

  const isOnLeave = useCallback((employeeId, date) => {
    const employeeLeave = employeeLeaves[employeeId];
    if (!employeeLeave) return false;
    
    const checkDate = new Date(date);
    const startDate = new Date(employeeLeave.startDate);
    const endDate = new Date(employeeLeave.endDate);
    
    return checkDate >= startDate && checkDate <= endDate;
  }, [employeeLeaves]);

  const fetchRfidAssignments = useCallback(async () => {
    if (!apiBaseUrl) return;

    try {
      console.log('Fetching RFID assignments from EMS_UID collection...');
      const response = await axios.get(`${apiBaseUrl}/api/rfid/assigned`);
      if (response.data.success) {
        console.log('RFID assignments loaded:', response.data.data.length);
        const rfidMap = {};
        response.data.data.forEach(assignment => {
          rfidMap[assignment.employeeId] = {
            uid: assignment.uid,
            assignedAt: assignment.assignedAt,
            isActive: assignment.isActive,
            collection: 'EMS_UID'
          };
        });
        setRfidAssignments(rfidMap);
      }
    } catch (error) {
      console.error('Error fetching RFID assignments from EMS_UID:', error);
      showAlert('Error loading RFID assignments from database', 'error');
    }
  }, [apiBaseUrl]);

  const fetchEmployeeLeaves = useCallback(async () => {
    if (!apiBaseUrl) return;

    try {
      const response = await axios.get(`${apiBaseUrl}/api/attendance/leaves`);
      if (response.data.success) {
        const leavesMap = {};
        response.data.data.forEach(leave => {
          leavesMap[leave.employeeId] = leave;
        });
        setEmployeeLeaves(leavesMap);
      }
    } catch (error) {
      console.error('Error fetching employee leaves:', error);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (apiBaseUrl) {
      fetchRfidAssignments();
      fetchEmployeeLeaves();
      
      const interval = setInterval(() => {
        fetchRfidAssignments();
        fetchEmployeeLeaves();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [apiBaseUrl, fetchRfidAssignments, fetchEmployeeLeaves]);

  useEffect(() => {
    if (realTimeUpdates && Object.keys(realTimeUpdates).length > 0) {
      console.log('Real-time update received:', realTimeUpdates);
      setLocalUpdates(prev => ({
        ...prev,
        ...realTimeUpdates
      }));
      
      if (realTimeUpdates.type === 'timein' || realTimeUpdates.type === 'timeout') {
        showAlert(
          `${realTimeUpdates.employeeName} - ${realTimeUpdates.type === 'timein' ? 'Time In' : 'Time Out'} recorded successfully`,
          'success'
        );
      }
      
      setFilteredEmployees(prev => [...prev]);
    }
  }, [realTimeUpdates]);

  useEffect(() => {
    const handleRfidScan = (event) => {
      const data = event.detail;
      console.log('RFID scan event received:', data);
      
      setLocalUpdates(prev => ({
        ...prev,
        [data.employeeId]: {
          status: data.type === 'timein' ? 'Present' : 'Present',
          timeIn: data.type === 'timein' ? data.time : null,
          timeOut: data.type === 'timeout' ? data.time : null,
          timestamp: new Date().getTime(),
          hoursWorked: data.hoursWorked || '0h 0m',
          source: 'rfid'
        }
      }));
      
      showAlert(
        `${data.employeeName} - ${data.type === 'timein' ? 'Time In' : 'Time Out'} recorded`,
        'success'
      );
    };

    window.addEventListener('rfid-scan', handleRfidScan);

    return () => {
      window.removeEventListener('rfid-scan', handleRfidScan);
    };
  }, []);

  const getAttendanceStatus = useCallback((employee) => {
    const employeeId = employee.employeeId;
    const today = new Date().toISOString().split('T')[0];
    
    if (isOnLeave(employeeId, selectedDate)) {
      return {
        status: 'In_Leave',
        color: getStatusColor('In_Leave'),
        timeIn: 'IN_LEAVE',
        timeOut: 'IN_LEAVE',
        isWorkDay: false,
        timestamp: 0,
        hoursWorked: 'IN_LEAVE',
        source: 'leave'
      };
    }

    const workDay = isWorkDay(employee, selectedDate);
    if (!workDay) {
      return {
        status: 'No Work',
        color: getStatusColor('No Work'),
        timeIn: 'NO WORK TODAY',
        timeOut: 'NO WORK TODAY',
        isWorkDay: false,
        timestamp: 0,
        hoursWorked: 'NO WORK TODAY',
        source: 'schedule'
      };
    }

    const realTimeUpdate = localUpdates[employeeId];
    if (realTimeUpdate && selectedDate === today) {
      return {
        status: realTimeUpdate.status === 'Completed' ? 'Present' : realTimeUpdate.status,
        color: getStatusColor(realTimeUpdate.status === 'Completed' ? 'Present' : realTimeUpdate.status),
        timeIn: realTimeUpdate.timeIn ? formatTime(realTimeUpdate.timeIn) : '-',
        timeOut: realTimeUpdate.timeOut ? formatTime(realTimeUpdate.timeOut) : '-',
        isWorkDay: true,
        timestamp: realTimeUpdate.timestamp,
        hoursWorked: realTimeUpdate.hoursWorked || '0h 0m',
        source: realTimeUpdate.source || 'system'
      };
    }

    const todayAttendance = Array.isArray(attendance) 
      ? attendance.find(a => a.employeeId === employeeId && a.date === selectedDate)
      : null;
    
    if (todayAttendance) {
      const timeInDisplay = todayAttendance.displayTimeIn || formatTime(todayAttendance.timeIn);
      const timeOutDisplay = todayAttendance.displayTimeOut || formatTime(todayAttendance.timeOut);
      
      let displayStatus = todayAttendance.status;
      if (displayStatus === 'Completed' || displayStatus === 'Late') {
        displayStatus = 'Present';
      }
      
      return {
        status: displayStatus,
        color: getStatusColor(displayStatus),
        timeIn: timeInDisplay,
        timeOut: timeOutDisplay,
        isWorkDay: true,
        timestamp: todayAttendance.timeOut ? new Date(todayAttendance.timeOut).getTime() : 
                  todayAttendance.timeIn ? new Date(todayAttendance.timeIn).getTime() : 0,
        hoursWorked: todayAttendance.hoursWorked || '0h 0m',
        source: todayAttendance.recordType || 'system'
      };
    }
    
    return { 
      status: 'Pending', 
      color: getStatusColor('Pending'), 
      timeIn: '-', 
      timeOut: '-',
      isWorkDay: true,
      timestamp: 0,
      hoursWorked: '0h 0m',
      source: 'system'
    };
  }, [isOnLeave, isWorkDay, selectedDate, localUpdates, attendance]);

  const sortEmployees = useCallback((employees, attendanceList, config) => {
    return [...employees].sort((a, b) => {
      const aStatus = getAttendanceStatus(a);
      const bStatus = getAttendanceStatus(b);

      switch (config.key) {
        case 'recentActivity':
          const aTime = aStatus.timestamp;
          const bTime = bStatus.timestamp;
          return config.direction === 'desc' ? bTime - aTime : aTime - aTime;

        case 'name':
          const aName = `${a.firstName} ${a.lastName}`.toLowerCase();
          const bName = `${b.firstName} ${b.lastName}`.toLowerCase();
          return config.direction === 'desc' ? 
            bName.localeCompare(aName) : aName.localeCompare(bName);

        case 'department':
          return config.direction === 'desc' ? 
            (b.department || '').localeCompare(a.department || '') : 
            (a.department || '').localeCompare(b.department || '');

        case 'position':
          return config.direction === 'desc' ? 
            (b.position || '').localeCompare(a.position || '') : 
            (a.position || '').localeCompare(b.position || '');

        case 'employeeId':
          return config.direction === 'desc' ? 
            (b.employeeId || '').localeCompare(a.employeeId || '') : 
            (a.employeeId || '').localeCompare(b.employeeId || '');

        case 'status':
          const statusOrder = { 
            'Present': 1, 'Pending': 2, 'No Work': 3, 'Absent': 4, 'In_Leave': 5
          };
          const aStatusOrder = statusOrder[aStatus.status] || 6;
          const bStatusOrder = statusOrder[bStatus.status] || 6;
          return config.direction === 'desc' ? 
            bStatusOrder - aStatusOrder : aStatusOrder - bStatusOrder;

        case 'timeIn':
          const aTimeIn = aStatus.timeIn === '-' ? '' : aStatus.timeIn;
          const bTimeIn = bStatus.timeIn === '-' ? '' : bStatus.timeIn;
          return config.direction === 'desc' ? 
            bTimeIn.localeCompare(aTimeIn) : aTimeIn.localeCompare(bTimeIn);

        case 'timeOut':
          const aTimeOut = aStatus.timeOut === '-' ? '' : aStatus.timeOut;
          const bTimeOut = bStatus.timeOut === '-' ? '' : bStatus.timeOut;
          return config.direction === 'desc' ? 
            bTimeOut.localeCompare(aTimeOut) : aTimeOut.localeCompare(bTimeOut);

        default:
          return 0;
      }
    });
  }, [getAttendanceStatus]);

  useEffect(() => {
    if (!employees.length) {
      setFilteredEmployees([]);
      return;
    }

    let filtered = [...employees];

    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter(emp => emp.department === departmentFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(emp => {
        const status = getAttendanceStatus(emp);
        return status.status === statusFilter;
      });
    }

    const sorted = sortEmployees(filtered, attendance, sortConfig);
    setFilteredEmployees(sorted);
    setCurrentPage(1);
  }, [employees, attendance, searchTerm, departmentFilter, statusFilter, sortConfig, getAttendanceStatus, sortEmployees]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleRemoveRfid = async (employee) => {
    if (!apiBaseUrl) {
      showAlert('Backend connection not available.', 'error');
      return;
    }

    const hasRfidInUID = rfidAssignments[employee.employeeId] && rfidAssignments[employee.employeeId].isActive;

    if (!hasRfidInUID) {
      showAlert('This employee does not have an RFID assigned in the system.', 'warning');
      return;
    }

    setShowRemoveConfirm({ isOpen: true, employee });
  };

  const confirmRemoveRfid = async () => {
    const { employee } = showRemoveConfirm;
    setLoadingRemove(prev => ({ ...prev, [employee.employeeId]: true }));

    try {
      console.log('Removing RFID from EMS_UID collection for employee:', employee.employeeId);

      const response = await fetch(`${apiBaseUrl}/api/rfid/remove/${employee.employeeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('RFID removal successful from EMS_UID:', result);
        
        showAlert(`RFID successfully removed from ${employee.firstName} ${employee.lastName} in EMS_UID collection`, 'success');
        
        await fetchRfidAssignments();
        
        if (typeof onRemoveRfid === 'function') {
          onRemoveRfid(employee);
        }
        
        setFilteredEmployees(prev => [...prev]);
      } else {
        throw new Error(result.message || 'Failed to remove RFID from EMS_UID');
      }

    } catch (error) {
      console.error('RFID removal error:', error);
      showAlert(`Error removing RFID from EMS_UID: ${error.message}`, 'error');
    } finally {
      setLoadingRemove(prev => ({ ...prev, [employee.employeeId]: false }));
      setShowRemoveConfirm({ isOpen: false, employee: null });
    }
  };

  const handleAssignRfid = (employee) => {
    setRfidModal({ isOpen: true, employee });
  };

  const handleAssignLeave = (employee) => {
    setLeaveModal({ isOpen: true, employee });
  };

  const handleRfidAssignSuccess = () => {
    showAlert(`RFID successfully assigned in EMS_UID collection`, 'success');
    fetchRfidAssignments();
    if (typeof onAssignRfid === 'function') {
      onAssignRfid();
    }
  };

  const handleLeaveAssignSuccess = () => {
    showAlert(`Leave assigned successfully to EMS_Leaves collection`, 'success');
    fetchEmployeeLeaves();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'text-green-600 bg-green-100 border-green-200';
      case 'Absent': return 'text-red-600 bg-red-100 border-red-200';
      case 'No Work': return 'text-gray-600 bg-gray-100 border-gray-200';
      case 'Pending': return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'In_Leave': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Present':
        return <FaCheckCircle className="text-green-500 text-xs" />;
      case 'Absent':
      case 'In_Leave':
        return <FaTimesCircle className="text-red-500 text-xs" />;
      case 'No Work':
        return <FaClockIcon className="text-gray-500 text-xs" />;
      case 'Pending':
        return <FaClock className="text-purple-500 text-xs" />;
      default:
        return <FaInfoCircle className="text-gray-500 text-xs" />;
    }
  };

  const formatTime = (timeValue) => {
    if (!timeValue) return '-';
    
    try {
      let date;
      
      if (typeof timeValue === 'string') {
        date = new Date(timeValue);
      } else if (timeValue instanceof Date) {
        date = timeValue;
      } else if (timeValue && typeof timeValue === 'object') {
        date = new Date(timeValue);
      } else {
        return '-';
      }
      
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time:', error, timeValue);
      return '-';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return '-';
    }
  };

  const formatRfidUid = (employee) => {
    const rfidAssignment = rfidAssignments[employee.employeeId];
    
    if (rfidAssignment && rfidAssignment.isActive) {
      const uid = rfidAssignment.uid;
      const cleanUid = uid.replace(/\s/g, '').toUpperCase();
      if (cleanUid.length === 8) {
        return cleanUid.match(/.{1,2}/g)?.join(' ').toUpperCase() || cleanUid;
      }
      return uid.toUpperCase();
    }
    
    if (employee.rfidUid) {
      const cleanUid = employee.rfidUid.replace(/\s/g, '').toUpperCase();
      if (cleanUid.length === 8) {
        return cleanUid.match(/.{1,2}/g)?.join(' ').toUpperCase() || cleanUid;
      }
      return employee.rfidUid.toUpperCase();
    }
    
    return 'Not Assigned';
  };

  const hasRfidAssigned = (employee) => {
    const hasInUID = rfidAssignments[employee.employeeId] && rfidAssignments[employee.employeeId].isActive;
    
    return hasInUID;
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="text-gray-400 text-xs" />;
    return sortConfig.direction === 'desc' ? 
      <FaSortDown className="text-[#400504]" /> : 
      <FaSortUp className="text-[#400504]" />;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('all');
    setStatusFilter('all');
  };

  const getDepartments = () => {
    const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))].sort();
    return departments;
  };

  const getStatusCounts = () => {
    const counts = {
      Present: 0,
      Absent: 0,
      Pending: 0,
      'No Work': 0,
      'In_Leave': 0
    };

    employees.forEach(emp => {
      const status = getAttendanceStatus(emp);
      counts[status.status] = (counts[status.status] || 0) + 1;
    });

    return counts;
  };

  const statusCounts = getStatusCounts();
  const departments = getDepartments();

  const canTimeOut = (employee) => {
    const attendanceStatus = getAttendanceStatus(employee);
    const isOnLeaveToday = isOnLeave(employee.employeeId, selectedDate);
    const isWorkDayToday = isWorkDay(employee, selectedDate);
    
    return true;
  };

  if (employees.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border flex-1 overflow-hidden flex flex-col">
        <div className="p-8 text-center flex-1 flex items-center justify-center">
          <div>
            <FaClockIcon className="text-4xl text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">No employees found.</p>
            <p className="text-gray-400 text-sm mt-1">Check if employees exist and have status 'Active'.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border flex-1 overflow-hidden flex flex-col">
      {alert && (
        <CustomAlert 
          message={alert.message} 
          type={alert.type} 
          onClose={() => setAlert(null)} 
        />
      )}

      <CustomConfirmModal
        isOpen={showRemoveConfirm.isOpen}
        onConfirm={confirmRemoveRfid}
        onCancel={() => setShowRemoveConfirm({ isOpen: false, employee: null })}
        title="Confirm RFID Removal"
        message={`Are you sure you want to remove RFID assignment from ${showRemoveConfirm.employee?.firstName} ${showRemoveConfirm.employee?.lastName}?`}
        confirmText="Remove RFID"
        cancelText="Cancel"
      />

      <RfidAssignmentModal
        isOpen={rfidModal.isOpen}
        onClose={() => setRfidModal({ isOpen: false, employee: null })}
        employee={rfidModal.employee}
        onAssignSuccess={handleRfidAssignSuccess}
      />

      <LeaveAssignmentModal
        isOpen={leaveModal.isOpen}
        onClose={() => setLeaveModal({ isOpen: false, employee: null })}
        employee={leaveModal.employee}
        onAssignSuccess={handleLeaveAssignSuccess}
      />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-4 border-b bg-gray-50 gap-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-[#400504]">
            Employee Attendance ({filteredEmployees.length} of {employees.length} employees)
          </h3>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <span>Sorted by:</span>
            <span className="font-semibold text-[#400504]">
              {sortConfig.key === 'recentActivity' ? 'Recent Activity' : 
               sortConfig.key === 'name' ? 'Name' :
               sortConfig.key === 'department' ? 'Department' :
               sortConfig.key === 'position' ? 'Position' :
               sortConfig.key === 'status' ? 'Status' : 
               sortConfig.key === 'employeeId' ? 'Employee ID' :
               sortConfig.key === 'timeIn' ? 'Time In' :
               sortConfig.key === 'timeOut' ? 'Time Out' : 'Employee ID'}
            </span>
            <span>({sortConfig.direction === 'desc' ? 'Newest First' : 'Oldest First'})</span>
          </div>
        </div>
      </div>

      <div className="p-4 border-b bg-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <div className="relative">
            <label htmlFor="search-employees" className="sr-only">
              Search employees
            </label>
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              id="search-employees"
              name="searchEmployees"
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="department-filter" className="sr-only">
              Filter by department
            </label>
            <select
              id="department-filter"
              name="departmentFilter"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status-filter" className="sr-only">
              Filter by status
            </label>
            <select
              id="status-filter"
              name="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm"
            >
              <option value="all">All Status</option>
              <option value="Present">Present</option>
              <option value="Pending">Pending</option>
              <option value="No Work">No Work</option>
              <option value="In_Leave">In Leave</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

          <div>
            <label htmlFor="sort-by" className="sr-only">
              Sort by
            </label>
            <select
              id="sort-by"
              name="sortBy"
              value={sortConfig.key}
              onChange={(e) => handleSort(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm"
            >
              <option value="recentActivity">Sort: Recent Activity</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="department">Sort: Department</option>
              <option value="position">Sort: Position</option>
              <option value="status">Sort: Status</option>
              <option value="employeeId">Sort: Employee ID</option>
              <option value="timeIn">Sort: Time In</option>
              <option value="timeOut">Sort: Time Out</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded border border-blue-200">
                Search: "{searchTerm}"
                <button 
                  type="button"
                  onClick={() => setSearchTerm('')} 
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  <FaTimesCircle className="text-xs" />
                </button>
              </span>
            )}
            {departmentFilter !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded border border-green-200">
                Department: {departmentFilter}
                <button 
                  type="button"
                  onClick={() => setDepartmentFilter('all')} 
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  <FaTimesCircle className="text-xs" />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded border border-purple-200">
                Status: {statusFilter}
                <button 
                  type="button"
                  onClick={() => setStatusFilter('all')} 
                  className="ml-1 text-purple-600 hover:text-purple-800"
                >
                  <FaTimesCircle className="text-xs" />
                </button>
              </span>
            )}
            {(searchTerm || departmentFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded border border-gray-300 hover:bg-gray-200"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-2 bg-gray-50 border-b">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Present: {statusCounts.Present}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span>Absent: {statusCounts.Absent}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span>Pending: {statusCounts.Pending}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
            <span>No Work: {statusCounts['No Work']}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-red-400"></div>
            <span>In Leave: {statusCounts['In_Leave']}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="min-w-full table-auto">
          <thead className="bg-[#400504] text-white">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-[#300303] transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <FaUser className="text-xs" />
                  <span>Employee</span>
                  {getSortIcon('name')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:bg-[#300303] transition-colors"
                onClick={() => handleSort('department')}
              >
                <div className="flex items-center space-x-1">
                  <FaBuilding className="text-xs" />
                  <span>Department</span>
                  {getSortIcon('department')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-[#300303] transition-colors"
                onClick={() => handleSort('position')}
              >
                <div className="flex items-center space-x-1">
                  <FaBriefcase className="text-xs" />
                  <span>Position</span>
                  {getSortIcon('position')}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                <div className="flex items-center space-x-1">
                  <FaIdCard className="text-xs" />
                  <span>RFID UID</span>
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-[#300303] transition-colors"
                onClick={() => handleSort('timeIn')}
              >
                <div className="flex items-center space-x-1">
                  <FaClock className="text-xs" />
                  <span>Time In</span>
                  {getSortIcon('timeIn')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-[#300303] transition-colors"
                onClick={() => handleSort('timeOut')}
              >
                <div className="flex items-center space-x-1">
                  <FaSignOutAlt className="text-xs" />
                  <span>Time Out</span>
                  {getSortIcon('timeOut')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-[#300303] transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  {getSortIcon('status')}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentItems.map((employee) => {
              const attendanceStatus = getAttendanceStatus(employee);
              const hasRecentUpdate = localUpdates[employee.employeeId];
              const isRemoving = loadingRemove[employee.employeeId];
              const hasRFID = hasRfidAssigned(employee);
              const isOnLeaveToday = isOnLeave(employee.employeeId, selectedDate);
              const isWorkDayToday = isWorkDay(employee, selectedDate);
              
              const canTimeIn = isWorkDayToday && !isOnLeaveToday && attendanceStatus.timeIn === '-' && attendanceStatus.status !== 'No Work';
              
              const timeOutEnabled = true;
              
              return (
                <tr 
                  key={employee._id} 
                  className={`hover:bg-gray-50 transition-all duration-300 ${
                    hasRecentUpdate ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-[#400504] rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {employee.firstName} {employee.lastName}
                          {hasRecentUpdate && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-pulse">
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{employee.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 hidden lg:table-cell">
                    <div className="flex items-center space-x-1">
                      <FaBuilding className="text-gray-400 text-xs" />
                      <span>{employee.department}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 hidden md:table-cell">
                    <div className="flex items-center space-x-1">
                      <FaBriefcase className="text-gray-400 text-xs" />
                      <span>{employee.position}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col space-y-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-mono ${
                        hasRFID ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {formatRfidUid(employee)}
                      </span>
                      {hasRFID && (
                        <span className="text-xs text-green-600 flex items-center">
                          <FaCheckCircle className="mr-1 text-xs" />
                          Assigned in EMS_UID
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <FaClock className="mr-1 text-gray-400 text-xs" />
                      <span className="text-xs font-mono">
                        {attendanceStatus.timeIn === '-' ? 'Not Checked In' : attendanceStatus.timeIn}
                      </span>
                    </div>
                    {attendanceStatus.timeIn !== '-' && (
                      <div className="text-xs text-gray-400 mt-1">
                        {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : formatDate(selectedDate)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <FaSignOutAlt className="mr-1 text-gray-400 text-xs" />
                      <span className="text-xs font-mono">
                        {attendanceStatus.timeOut === '-' ? 'Not Checked Out' : attendanceStatus.timeOut}
                      </span>
                    </div>
                    {attendanceStatus.timeOut !== '-' && (
                      <div className="text-xs text-gray-400 mt-1">
                        {attendanceStatus.hoursWorked} worked
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(attendanceStatus.status)}
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${attendanceStatus.color}`}>
                        {attendanceStatus.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => onViewHistory(employee)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded bg-indigo-50 text-xs transition-colors border border-indigo-200 hover:bg-indigo-100"
                        title="History of Attendance"
                      >
                        <FaHistory />
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => onManualTimeIn(employee)}
                        className={`p-1 rounded text-xs transition-colors border ${
                          canTimeIn
                            ? 'text-orange-600 hover:text-orange-900 bg-orange-50 border-orange-200 hover:bg-orange-100'
                            : 'text-gray-400 bg-gray-100 border-gray-300 cursor-not-allowed'
                        }`}
                        title={canTimeIn ? "Manual Time In" : "Time In not available"}
                        disabled={!canTimeIn}
                      >
                        <FaClock />
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => onManualTimeOut(employee)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded bg-blue-50 text-xs transition-colors border border-blue-200 hover:bg-blue-100"
                        title="Manual Time Out"
                      >
                        <FaSignOutAlt />
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleAssignRfid(employee)}
                        className="text-green-600 hover:text-green-900 p-1 rounded bg-green-50 text-xs transition-colors border border-green-200 hover:bg-green-100"
                        title="Assign RFID to EMS_UID"
                      >
                        <FaIdCard />
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleAssignLeave(employee)}
                        className="text-purple-600 hover:text-purple-900 p-1 rounded bg-purple-50 text-xs transition-colors border border-purple-200 hover:bg-purple-100"
                        title="Assign Leave to EMS_Leaves"
                      >
                        <FaCalendarPlus />
                      </button>
                      
                      {hasRFID && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRfid(employee)}
                          disabled={isRemoving}
                          className={`p-1 rounded text-xs transition-colors border ${
                            isRemoving
                              ? 'text-gray-400 bg-gray-100 border-gray-300 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-900 bg-red-50 border-red-200 hover:bg-red-100'
                          }`}
                          title={isRemoving ? "Removing RFID from EMS_UID..." : "Remove RFID from EMS_UID"}
                        >
                          {isRemoving ? (
                            <div className="animate-spin h-3 w-3 border-2 border-red-600 border-t-transparent rounded-full"></div>
                          ) : (
                            <FaUserTimes />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center space-x-4">
          <div>
            Showing {Math.min(currentItems.length, itemsPerPage)} of {filteredEmployees.length} employees (Page {currentPage} of {totalPages})
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Recent activity</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => handleSort('recentActivity')}
            className="text-[#400504] hover:text-[#300303] font-semibold flex items-center space-x-1"
          >
            <span>Sort by Recent Activity</span>
            {getSortIcon('recentActivity')}
          </button>
          
          <div className="text-xs">
            Last update: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {filteredEmployees.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <FaSearch className="text-4xl text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">No employees match your filters</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter criteria</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] text-sm"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTable;
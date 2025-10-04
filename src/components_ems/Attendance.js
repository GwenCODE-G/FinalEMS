import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  FaUserTimes, FaIdCard, FaArchive, FaEye, FaSearch, FaFilter, FaSync, 
  FaClock, FaSignOutAlt, FaServer, FaPlug, FaChartBar, FaDesktop, 
  FaTimes, FaExclamationTriangle, FaHistory, FaInfoCircle,
  FaCheckCircle, FaQrcode, FaKey, FaCheck, FaExclamationCircle
} from 'react-icons/fa';

const PORTS_TO_TRY = [5000, 5001, 3001, 3000, 8080];
let cachedBaseUrl = null;

const testBackendConnection = async (port) => {
  try {
    const response = await axios.get(`http://localhost:${port}/api/test`, {
      timeout: 5000
    });
    return { success: true, port, data: response.data };
  } catch (error) {
    return { success: false, port, error: error.message };
  }
};

const findWorkingBackend = async () => {
  if (cachedBaseUrl) {
    console.log('Using cached backend URL:', cachedBaseUrl);
    return cachedBaseUrl;
  }

  for (let i = 0; i < PORTS_TO_TRY.length; i++) {
    const port = PORTS_TO_TRY[i];
    console.log(`Testing backend on port ${port}...`);
    const result = await testBackendConnection(port);
    if (result.success) {
      const baseUrl = `http://localhost:${port}`;
      cachedBaseUrl = baseUrl;
      console.log(`Backend found on port ${port}`);
      return baseUrl;
    }
  }
  throw new Error('No backend server found. Please start the backend server.');
};

const useRealTimeUpdates = (apiBaseUrl) => {
  const [realTimeData, setRealTimeData] = useState({});

  useEffect(() => {
    if (!apiBaseUrl) return;

    const interval = setInterval(() => {
      setRealTimeData(prev => ({ ...prev }));
    }, 10000);

    return () => clearInterval(interval);
  }, [apiBaseUrl]);

  return realTimeData;
};

// RFID Assignment Modal Component
const RfidAssignmentModal = ({ 
  isOpen, 
  onClose, 
  employee, 
  mode, 
  scannedUid, 
  existingAssignment,
  removalReason,
  otherReason,
  onScanRfid,
  onConfirmReassignment,
  onRemoveRfid,
  onInputChange
}) => {
  const [uidInput, setUidInput] = useState('');

  if (!isOpen) return null;

  const handleUidInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    // Auto-format as user types: XX XX XX XX
    const formatted = value.replace(/[^0-9A-F]/g, '')
      .replace(/(.{2})/g, '$1 ')
      .trim()
      .slice(0, 11); // Limit to 8 characters + 3 spaces
    setUidInput(formatted);
  };

  const handleSubmit = () => {
    const cleanUid = uidInput.replace(/\s/g, '');
    if (cleanUid.length === 8 && /^[0-9A-F]{8}$/i.test(cleanUid)) {
      onScanRfid(cleanUid);
    } else {
      alert('Please enter a valid 8-character RFID UID (e.g., 4DD6D8B5)');
    }
  };

  const renderScanMode = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <FaInfoCircle className="text-blue-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-blue-800 font-semibold">How to Assign RFID</h4>
            <ul className="text-blue-700 text-sm mt-2 space-y-1">
              <li className="flex items-center">
                <FaQrcode className="mr-2 text-blue-500" />
                Scan the RFID card or enter the UID manually
              </li>
              <li className="flex items-center">
                <FaKey className="mr-2 text-blue-500" />
                Format: 8 hexadecimal characters (e.g., 4D D6 D8 B5)
              </li>
              <li className="flex items-center">
                <FaCheck className="mr-2 text-blue-500" />
                The system will verify and assign the card
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Enter RFID UID
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={uidInput}
            onChange={handleUidInputChange}
            placeholder="4D D6 D8 B5"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] focus:border-transparent font-mono text-sm uppercase"
            maxLength={11}
          />
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] flex items-center space-x-2"
          >
            <FaCheck className="text-sm" />
            <span>Assign</span>
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Enter 8 hexadecimal characters (0-9, A-F). Spaces will be added automatically.
        </p>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Employee Information</h5>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Name:</span>
            <div className="font-medium">{employee?.firstName} {employee?.lastName}</div>
          </div>
          <div>
            <span className="text-gray-500">ID:</span>
            <div className="font-medium">{employee?.employeeId}</div>
          </div>
          <div>
            <span className="text-gray-500">Department:</span>
            <div className="font-medium">{employee?.department}</div>
          </div>
          <div>
            <span className="text-gray-500">Position:</span>
            <div className="font-medium">{employee?.position}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConfirmMode = () => (
    <div className="space-y-4">
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <div className="flex items-start">
          <FaExclamationCircle className="text-yellow-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-yellow-800 font-semibold">RFID Already Assigned</h4>
            <p className="text-yellow-700 text-sm mt-1">
              This RFID card is currently assigned to another employee.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
        <div className="text-center">
          <div className="text-red-600 font-semibold">Current Assignment</div>
          <div className="text-red-700 text-sm mt-1">{existingAssignment}</div>
        </div>
      </div>

      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
        <div className="text-center">
          <div className="text-blue-600 font-semibold">New Assignment</div>
          <div className="text-blue-700 text-sm mt-1">
            {employee?.firstName} {employee?.lastName} ({employee?.employeeId})
          </div>
          <div className="text-blue-600 text-xs mt-1 font-mono">{scannedUid}</div>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <p className="text-sm text-gray-600 text-center">
          Do you want to reassign this RFID card? The previous assignment will be removed.
        </p>
      </div>
    </div>
  );

  const renderRemoveMode = () => (
    <div className="space-y-4">
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <div className="flex items-start">
          <FaExclamationTriangle className="text-red-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-red-800 font-semibold">Remove RFID Assignment</h4>
            <p className="text-red-700 text-sm mt-1">
              This will remove the RFID assignment from the employee. Please provide a reason for removal.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Employee Information</h5>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Name:</span>
            <div className="font-medium">{employee?.firstName} {employee?.lastName}</div>
          </div>
          <div>
            <span className="text-gray-500">ID:</span>
            <div className="font-medium">{employee?.employeeId}</div>
          </div>
          <div>
            <span className="text-gray-500">Current RFID:</span>
            <div className="font-medium font-mono">{employee?.rfidUid || 'Not assigned'}</div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Removal Reason <span className="text-red-500">*</span>
        </label>
        <select
          value={removalReason}
          onChange={(e) => onInputChange('removalReason', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm"
        >
          <option value="">Select a reason</option>
          <option value="CARD_LOST">Card Lost</option>
          <option value="CARD_DAMAGED">Card Damaged</option>
          <option value="EMPLOYEE_TERMINATED">Employee Terminated</option>
          <option value="EMPLOYEE_TRANSFER">Employee Transfer</option>
          <option value="SECURITY_ISSUE">Security Issue</option>
          <option value="SYSTEM_UPDATE">System Update</option>
          <option value="OTHER">Other Reason</option>
        </select>
      </div>

      {removalReason === 'OTHER' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Specify Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={otherReason}
            onChange={(e) => onInputChange('otherReason', e.target.value)}
            placeholder="Please specify the reason for removal..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm"
            rows="3"
          />
        </div>
      )}
    </div>
  );

  const getModalTitle = () => {
    switch (mode) {
      case 'scan': return 'Assign RFID Card';
      case 'confirm': return 'Confirm RFID Reassignment';
      case 'remove': return 'Remove RFID Assignment';
      default: return 'RFID Management';
    }
  };

  const getActionButtons = () => {
    switch (mode) {
      case 'scan':
        return (
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] text-sm flex items-center"
            >
              <FaCheck className="mr-2" />
              Assign RFID
            </button>
          </div>
        );
      
      case 'confirm':
        return (
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onConfirmReassignment}
              className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] text-sm"
            >
              Confirm Reassignment
            </button>
          </div>
        );
      
      case 'remove':
        return (
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onRemoveRfid}
              disabled={!removalReason || (removalReason === 'OTHER' && !otherReason)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            >
              Remove RFID
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-[#400504]">
            {getModalTitle()}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="p-6">
          {mode === 'scan' && renderScanMode()}
          {mode === 'confirm' && renderConfirmMode()}
          {mode === 'remove' && renderRemoveMode()}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          {getActionButtons()}
        </div>
      </div>
    </div>
  );
};

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [viewMode, setViewMode] = useState('daily');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [rfidStatus, setRfidStatus] = useState({ connected: false, status: 'Checking...' });
  const [employeeHistory, setEmployeeHistory] = useState({});
  const [todaySummary, setTodaySummary] = useState({
    summary: {
      present: 0,
      absent: 0,
      completed: 0,
      late: 0,
      totalEmployees: 0
    },
    records: []
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const [rfidAssignment, setRfidAssignment] = useState({
    isOpen: false,
    employee: null,
    mode: 'scan',
    scannedUid: '',
    existingAssignment: null,
    removalReason: '',
    otherReason: ''
  });

  const [viewModal, setViewModal] = useState({ isOpen: false, employee: null });

  const realTimeUpdates = useRealTimeUpdates(apiBaseUrl);

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setSuccessMessage('');
    }, 5000);
  };

  const initializeAPI = useCallback(async () => {
    try {
      console.log('Initializing API connection...');
      const baseUrl = await findWorkingBackend();
      setApiBaseUrl(baseUrl);
      
      try {
        const statusResponse = await axios.get(`${baseUrl}/api/rfid/status`, { timeout: 5000 });
        setRfidStatus({
          connected: statusResponse.data.isConnected,
          status: statusResponse.data.status
        });
      } catch (statusError) {
        console.log('RFID status check failed, using simulation mode');
        setRfidStatus({ connected: false, status: 'Simulation Mode' });
      }
      
      return baseUrl;
    } catch (error) {
      console.error('Failed to initialize API:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  const fetchEmployees = useCallback(async (baseUrl) => {
    if (!baseUrl) return;
    
    try {
      console.log('Fetching employees from:', `${baseUrl}/api/employees`);
      const response = await axios.get(`${baseUrl}/api/employees`, {
        timeout: 10000
      });
      console.log('Employees response:', response.data);
      
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const activeEmployees = response.data.data.filter(emp => emp.status === 'Active');
        setEmployees(activeEmployees);
        setFilteredEmployees(activeEmployees);
        setError(null);
      } else {
        console.error('Invalid employees response format:', response.data);
        setEmployees([]);
        setFilteredEmployees([]);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
      setFilteredEmployees([]);
    }
  }, []);

  const fetchAttendance = useCallback(async (baseUrl, date) => {
    if (!baseUrl) return;
    
    try {
      console.log('Fetching attendance for date:', date);
      const response = await axios.get(
        `${baseUrl}/api/rfid/attendance?startDate=${date}&endDate=${date}`,
        { timeout: 10000 }
      );
      console.log('Attendance records loaded:', response.data.data?.attendance?.length || 0);
      setAttendance(response.data.data?.attendance || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendance([]);
    }
  }, []);

  const fetchTodaySummary = useCallback(async (baseUrl) => {
    if (!baseUrl) return;
    
    try {
      const response = await axios.get(`${baseUrl}/api/rfid/summary/today`, { timeout: 10000 });
      console.log('Today summary response:', response.data);
      
      if (response.data && response.data.success) {
        setTodaySummary(response.data.data || {
          summary: {
            present: 0,
            absent: employees.length,
            completed: 0,
            late: 0,
            totalEmployees: employees.length
          },
          records: []
        });
      } else {
        setTodaySummary({
          summary: {
            present: 0,
            absent: employees.length,
            completed: 0,
            late: 0,
            totalEmployees: employees.length
          },
          records: []
        });
      }
    } catch (error) {
      console.error('Error fetching today summary:', error);
      setTodaySummary({
        summary: {
          present: 0,
          absent: employees.length,
          completed: 0,
          late: 0,
          totalEmployees: employees.length
        },
        records: []
      });
    }
  }, [employees.length]);

  const fetchMonthlySummary = useCallback(async (employeeId, year, month) => {
    if (!apiBaseUrl) return;
    
    try {
      const response = await axios.get(
        `${apiBaseUrl}/api/rfid/summary/monthly?employeeId=${employeeId}&year=${year}&month=${month}`,
        { timeout: 10000 }
      );
      
      if (response.data.success) {
        setMonthlySummary(response.data.data);
      } else {
        alert('Error loading monthly summary');
      }
    } catch (error) {
      console.error('Error fetching monthly summary:', error);
      alert('Error loading monthly summary');
    }
  }, [apiBaseUrl]);

  const handleScanRfid = async (uid) => {
    if (!apiBaseUrl) {
      alert('Backend connection not available.');
      return;
    }

    try {
      const formattedUid = uid.match(/.{1,2}/g).join(' ').toUpperCase();
      
      await axios.post(`${apiBaseUrl}/api/rfid/assign`, {
        employeeId: rfidAssignment.employee.employeeId,
        rfidUid: formattedUid
      });

      showSuccessMessage(`RFID successfully assigned to ${rfidAssignment.employee.firstName} ${rfidAssignment.employee.lastName}`);
      setRfidAssignment({ isOpen: false, employee: null, mode: 'scan', scannedUid: '' });
      fetchEmployees(apiBaseUrl);
    } catch (apiError) {
      if (apiError.response?.data?.assignedTo) {
        setRfidAssignment(prev => ({
          ...prev,
          mode: 'confirm',
          scannedUid: uid.match(/.{1,2}/g).join(' ').toUpperCase(),
          existingAssignment: apiError.response.data.assignedTo
        }));
      } else {
        alert(apiError.response?.data?.message || 'Error assigning RFID');
      }
    }
  };

  const handleConfirmReassignment = async () => {
    try {
      await axios.post(`${apiBaseUrl}/api/rfid/assign`, {
        employeeId: rfidAssignment.employee.employeeId,
        rfidUid: rfidAssignment.scannedUid
      });

      showSuccessMessage(`RFID successfully reassigned to ${rfidAssignment.employee.firstName} ${rfidAssignment.employee.lastName}`);
      setRfidAssignment({ isOpen: false, employee: null, mode: 'scan', scannedUid: '' });
      fetchEmployees(apiBaseUrl);
    } catch (error) {
      console.error('RFID reassignment error:', error);
      alert(error.response?.data?.message || 'Error reassigning RFID');
    }
  };

  const handleRemoveRfid = async () => {
    const { employee, removalReason, otherReason } = rfidAssignment;
    
    if (!removalReason) {
      alert('Please select a removal reason');
      return;
    }

    if (removalReason === 'OTHER' && !otherReason) {
      alert('Please specify the removal reason');
      return;
    }

    try {
      await axios.delete(`${apiBaseUrl}/api/rfid/assign/${employee.employeeId}`);

      showSuccessMessage(`RFID assignment removed from ${employee.firstName} ${employee.lastName}`);
      setRfidAssignment({ isOpen: false, employee: null, mode: 'scan', scannedUid: '' });
      fetchEmployees(apiBaseUrl);
    } catch (error) {
      console.error('RFID removal error:', error);
      alert(error.response?.data?.message || 'Error removing RFID assignment');
    }
  };

  const handleInputChange = (field, value) => {
    setRfidAssignment(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const openRfidAssignmentModal = (employee) => {
    setRfidAssignment({
      isOpen: true,
      employee,
      mode: 'scan',
      scannedUid: '',
      existingAssignment: null,
      removalReason: '',
      otherReason: ''
    });
  };

  const openRemoveRfidModal = (employee) => {
    setRfidAssignment({
      isOpen: true,
      employee,
      mode: 'remove',
      scannedUid: '',
      existingAssignment: null,
      removalReason: '',
      otherReason: ''
    });
  };

  const closeRfidAssignmentModal = () => {
    setRfidAssignment({
      isOpen: false,
      employee: null,
      mode: 'scan',
      scannedUid: '',
      existingAssignment: null,
      removalReason: '',
      otherReason: ''
    });
  };

  const manualTimeInOut = async () => {
    const { employee, action, time } = rfidAssignment;
    
    if (!apiBaseUrl) {
      alert('Backend connection not available.');
      return;
    }

    try {
      const timeToUse = time || new Date().toTimeString().substring(0, 5);
      const dateTime = new Date(`${selectedDate}T${timeToUse}`);
      
      const scanData = {
        uid: employee.rfidUid || 'MANUAL_' + employee.employeeId,
        manual: true,
        action: action,
        timestamp: dateTime.toISOString()
      };

      await axios.post(`${apiBaseUrl}/api/rfid/scan`, scanData);

      showSuccessMessage(`${action === 'timein' ? 'Time In' : 'Time Out'} recorded successfully for ${employee.firstName} ${employee.lastName}`);
      setRfidAssignment({ isOpen: false, employee: null, mode: 'scan', scannedUid: '' });
      fetchAttendance(apiBaseUrl, selectedDate);
    } catch (error) {
      console.error('Manual attendance error:', error);
      alert(error.response?.data?.message || 'Error recording attendance');
    }
  };

  const openManualAttendanceModal = (employee, action) => {
    setRfidAssignment({
      isOpen: true,
      employee,
      mode: 'manual',
      action,
      time: ''
    });
  };

  const archiveEmployee = async (employeeId, employeeName) => {
    if (!apiBaseUrl) {
      alert('Backend connection not available.');
      return;
    }

    if (window.confirm(`Are you sure you want to archive ${employeeName}?`)) {
      try {
        await axios.delete(`${apiBaseUrl}/api/employees/${employeeId}`);
        showSuccessMessage(`${employeeName} archived successfully`);
        fetchEmployees(apiBaseUrl);
      } catch (error) {
        alert('Error archiving employee');
      }
    }
  };

  const openHistoryModal = async (employee) => {
    setViewModal({ isOpen: true, employee });
    if (!apiBaseUrl) return;
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      
      const response = await axios.get(
        `${apiBaseUrl}/api/rfid/attendance?startDate=${startDate.toISOString().split('T')[0]}&endDate=${new Date().toISOString().split('T')[0]}&employeeId=${employee.employeeId}`,
        { timeout: 10000 }
      );
      setEmployeeHistory((prev) => ({ ...prev, [employee.employeeId]: response.data.data?.attendance || [] }));
    } catch (err) {
      console.error('Error fetching employee history:', err);
    }
  };

  const closeMonthlySummary = () => {
    setViewMode('daily');
    setMonthlySummary(null);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const baseUrl = await initializeAPI();
        await fetchEmployees(baseUrl);
        await fetchAttendance(baseUrl, selectedDate);
      } catch (error) {
        console.error('Error loading data:', error);
        setError(error.message || 'Failed to connect to backend server');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [initializeAPI, fetchEmployees, fetchAttendance, selectedDate]);

  useEffect(() => {
    if (employees.length > 0 && apiBaseUrl) {
      fetchTodaySummary(apiBaseUrl);
    }
  }, [employees, apiBaseUrl, fetchTodaySummary]);

  useEffect(() => {
    if (!apiBaseUrl || viewMode !== 'daily') return;

    const intervalId = setInterval(() => {
      fetchAttendance(apiBaseUrl, selectedDate);
      fetchTodaySummary(apiBaseUrl);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [apiBaseUrl, viewMode, selectedDate, fetchAttendance, fetchTodaySummary]);

  const retryConnection = async () => {
    cachedBaseUrl = null;
    setLoading(true);
    setError(null);
    try {
      const baseUrl = await initializeAPI();
      await fetchEmployees(baseUrl);
      await fetchAttendance(baseUrl, selectedDate);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term === '') {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(emp =>
        emp.firstName?.toLowerCase().includes(term.toLowerCase()) ||
        emp.lastName?.toLowerCase().includes(term.toLowerCase()) ||
        emp.employeeId?.toLowerCase().includes(term.toLowerCase()) ||
        emp.department?.toLowerCase().includes(term.toLowerCase()) ||
        emp.position?.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'text-green-600 bg-green-100';
      case 'Late': return 'text-yellow-600 bg-yellow-100';
      case 'Completed': return 'text-blue-600 bg-blue-100';
      case 'Absent': return 'text-red-600 bg-red-100';
      case 'No Work': return 'text-gray-600 bg-gray-100';
      case 'Half-day': return 'text-orange-600 bg-orange-100';
      case 'Pending': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAttendanceStatus = (employee) => {
    const employeeId = employee.employeeId;
    
    const realTimeUpdate = realTimeUpdates[employeeId];
    if (realTimeUpdate) {
      return {
        status: realTimeUpdate.status,
        color: getStatusColor(realTimeUpdate.status),
        timeIn: realTimeUpdate.timeIn ? formatTime(realTimeUpdate.timeIn) : '-',
        timeOut: realTimeUpdate.timeOut ? formatTime(realTimeUpdate.timeOut) : '-',
        isWorkDay: true,
        hoursWorked: realTimeUpdate.hoursWorked || 0
      };
    }

    const todayAttendance = attendance.find(a => a.employeeId === employeeId);
    const now = new Date();
    const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });
    
    const isWorkDay = employee.workDays ? employee.workDays[dayOfWeek] : 
                     ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(dayOfWeek);
    
    if (!todayAttendance) {
      if (isWorkDay) {
        const workEndTime = employee.workSchedule?.[dayOfWeek]?.end || '17:00';
        const [endHour, endMinute] = workEndTime.split(':').map(Number);
        const endTime = new Date(selectedDate);
        endTime.setHours(endHour, endMinute, 0, 0);
        
        if (now > endTime) {
          return { 
            status: 'Absent', 
            color: getStatusColor('Absent'), 
            timeIn: '-', 
            timeOut: '-',
            isWorkDay: true
          };
        }
      }
      
      return { 
        status: isWorkDay ? 'Pending' : 'No Work', 
        color: getStatusColor(isWorkDay ? 'Pending' : 'No Work'), 
        timeIn: '-', 
        timeOut: '-',
        isWorkDay 
      };
    }
    
    if (todayAttendance.timeIn && !todayAttendance.timeOut) {
      return { 
        status: todayAttendance.status === 'Late' ? 'Late' : 'Present', 
        color: getStatusColor(todayAttendance.status === 'Late' ? 'Late' : 'Present'), 
        timeIn: formatTime(todayAttendance.timeIn),
        timeOut: '-',
        isWorkDay: true
      };
    }
    
    if (todayAttendance.timeOut) {
      return { 
        status: todayAttendance.status, 
        color: getStatusColor(todayAttendance.status), 
        timeIn: formatTime(todayAttendance.timeIn),
        timeOut: formatTime(todayAttendance.timeOut),
        isWorkDay: true,
        hoursWorked: todayAttendance.hoursWorked || 0
      };
    }
    
    return { 
      status: todayAttendance.status, 
      color: getStatusColor(todayAttendance.status), 
      timeIn: '-', 
      timeOut: '-',
      isWorkDay: true
    };
  };

  const formatRfidUid = (uid) => {
    if (!uid) return 'Not Assigned';
    return uid.toUpperCase();
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const handleViewMonthlySummary = (employee) => {
    setViewMode('monthly');
    fetchMonthlySummary(employee.employeeId, selectedYear, selectedMonth);
  };

  const handleRefresh = () => {
    if (apiBaseUrl) {
      fetchAttendance(apiBaseUrl, selectedDate);
      fetchTodaySummary(apiBaseUrl);
      fetchEmployees(apiBaseUrl);
    }
  };

  const getProfilePictureUrl = (employee) => {
    if (employee.profilePicture) {
      return `${apiBaseUrl}/uploads/${employee.profilePicture}`;
    }
    return '/default-avatar.png';
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#400504]"></div>
        <span className="ml-4 text-lg mt-4">Connecting to backend server...</span>
        <span className="text-sm text-gray-500 mt-2">Checking ports: {PORTS_TO_TRY.join(', ')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-6 rounded relative">
          <div className="flex items-center mb-4">
            <FaServer className="text-2xl mr-3" />
            <div>
              <strong className="font-bold text-lg">Backend Connection Error</strong>
              <p className="block sm:inline">{error}</p>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded mb-4">
            <p className="font-semibold">To fix this issue:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Open a terminal/command prompt</li>
              <li>Navigate to your backend folder: <code>cd backend</code></li>
              <li>Start the server: <code>npm start</code></li>
              <li>Wait for "Server is running on port..." message</li>
              <li>Click Retry below</li>
            </ol>
          </div>

          <div className="flex space-x-3">
            <button 
              onClick={retryConnection}
              className="flex items-center bg-[#400504] hover:bg-[#300303] text-white font-bold py-2 px-4 rounded"
            >
              <FaPlug className="mr-2" /> Retry Connection
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-[#cba235] hover:bg-[#dbb545] text-[#400504] font-bold py-2 px-4 rounded"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col">
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-[#400504] text-white px-6 py-3 rounded-lg shadow-lg border-l-4 border-[#cba235]">
            <div className="flex items-center">
              <FaCheckCircle className="h-5 w-5 text-[#cba235] mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium">{successMessage}</p>
              </div>
              <button
                onClick={() => setShowSuccess(false)}
                className="ml-4 text-[#cba235] hover:text-white"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4">
        <div className="mb-4 lg:mb-0">
          <h2 className="text-2xl lg:text-3xl font-bold text-[#400504]">Attendance Management</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`flex items-center text-sm px-2 py-1 rounded ${
              rfidStatus.connected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <FaServer className="mr-1" /> 
              {rfidStatus.status}
            </span>
            <span className="flex items-center text-sm text-gray-600">
              <FaDesktop className="mr-1" /> 
              Backend: {apiBaseUrl.replace('http://localhost:', 'Port ')}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
          <select 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full sm:w-auto focus:ring-[#400504] focus:border-[#400504]"
          >
            <option value="daily">Daily View</option>
            <option value="monthly">Monthly View</option>
          </select>
          
          {viewMode === 'daily' ? (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full sm:w-auto focus:ring-[#400504] focus:border-[#400504]"
            />
          ) : (
            <div className="flex space-x-2 w-full sm:w-auto">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-2 py-2 border border-gray-300 rounded-md text-sm flex-1 focus:ring-[#400504] focus:border-[#400504]"
              >
                {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleDateString('en', {month: 'short'})}
                  </option>
                ))}
              </select>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-2 py-2 border border-gray-300 rounded-md text-sm flex-1 focus:ring-[#400504] focus:border-[#400504]"
              >
                {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}
          
          <button
            onClick={handleRefresh}
            className="flex items-center px-3 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] text-sm w-full sm:w-auto justify-center transition-colors"
          >
            <FaSync className="mr-1" /> Refresh
          </button>
        </div>
      </div>

      {viewMode === 'daily' && todaySummary && todaySummary.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="text-lg font-bold text-green-600">{todaySummary.summary.present || 0}</div>
            <div className="text-green-800 text-xs">Present Today</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="text-lg font-bold text-red-600">{todaySummary.summary.absent || 0}</div>
            <div className="text-red-800 text-xs">Absent Today</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="text-lg font-bold text-blue-600">{todaySummary.summary.completed || 0}</div>
            <div className="text-blue-800 text-xs">Completed Shift</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="text-lg font-bold text-yellow-600">{todaySummary.summary.late || 0}</div>
            <div className="text-yellow-800 text-xs">Late Today</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="text-lg font-bold text-gray-600">{todaySummary.summary.totalEmployees || 0}</div>
            <div className="text-gray-800 text-xs">Total Employees</div>
          </div>
        </div>
      )}

      <div className="mb-4 bg-white p-3 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees by name, ID, department, or position..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#cba235] text-sm"
            />
          </div>
          <FaFilter className="text-xl text-gray-600 ml-3" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border flex-1 overflow-hidden flex flex-col">
        {filteredEmployees.length === 0 ? (
          <div className="p-8 text-center flex-1 flex items-center justify-center">
            <div>
              <FaExclamationTriangle className="text-4xl text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-lg">No employees found.</p>
              <p className="text-gray-400 text-sm mt-1">Check if employees exist and have status 'Active'.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="min-w-full table-auto">
              <thead className="bg-[#400504] text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider hidden lg:table-cell">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider hidden md:table-cell">Position</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">RFID UID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Time In</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Time Out</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((employee) => {
                  const attendanceStatus = getAttendanceStatus(employee);
                  return (
                    <tr key={employee._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <img
                            src={getProfilePictureUrl(employee)}
                            alt={`${employee.firstName} ${employee.lastName}`}
                            className="w-8 h-8 rounded-full mr-3 object-cover border border-[#cba235]"
                            onError={(e) => {
                              e.target.src = '/default-avatar.png';
                            }}
                          />
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {employee.firstName} {employee.lastName}
                            </div>
                            <div className="text-xs text-gray-500">{employee.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 hidden lg:table-cell">{employee.department}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 hidden md:table-cell">{employee.position}</td>
                      <td className="px-4 py-3 text-xs font-mono">
                        <span className={`px-2 py-1 rounded ${
                          employee.rfidUid ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {formatRfidUid(employee.rfidUid)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center">
                          <FaClock className="mr-1 text-gray-400 text-xs" />
                          <span className="text-xs">{attendanceStatus.timeIn}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center">
                          <FaSignOutAlt className="mr-1 text-gray-400 text-xs" />
                          <span className="text-xs">{attendanceStatus.timeOut}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${attendanceStatus.color}`}>
                          {attendanceStatus.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => openHistoryModal(employee)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded bg-blue-50 text-xs transition-colors"
                            title="View Attendance History"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleViewMonthlySummary(employee)}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded bg-purple-50 text-xs transition-colors"
                            title="View Monthly Summary"
                          >
                            <FaChartBar />
                          </button>
                          <button
                            onClick={() => openManualAttendanceModal(employee, 'timein')}
                            className="text-orange-600 hover:text-orange-900 p-1 rounded bg-orange-50 text-xs transition-colors"
                            title="Manual Time In"
                          >
                            <FaClock />
                          </button>
                          <button
                            onClick={() => openManualAttendanceModal(employee, 'timeout')}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded bg-indigo-50 text-xs transition-colors"
                            title="Manual Time Out"
                          >
                            <FaSignOutAlt />
                          </button>
                          <button
                            onClick={() => openRfidAssignmentModal(employee)}
                            className="text-green-600 hover:text-green-900 p-1 rounded bg-green-50 text-xs transition-colors"
                            title="Assign RFID"
                          >
                            <FaIdCard />
                          </button>
                          {employee.isRfidAssigned && (
                            <button
                              onClick={() => openRemoveRfidModal(employee)}
                              className="text-red-600 hover:text-red-900 p-1 rounded bg-red-50 text-xs transition-colors"
                              title="Remove RFID"
                            >
                              <FaUserTimes />
                            </button>
                          )}
                          <button
                            onClick={() => archiveEmployee(employee._id, `${employee.firstName} ${employee.lastName}`)}
                            className="text-gray-600 hover:text-gray-900 p-1 rounded bg-gray-50 text-xs transition-colors"
                            title="Archive Employee"
                          >
                            <FaArchive />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RFID Assignment Modal */}
      <RfidAssignmentModal
        isOpen={rfidAssignment.isOpen}
        onClose={closeRfidAssignmentModal}
        employee={rfidAssignment.employee}
        mode={rfidAssignment.mode}
        scannedUid={rfidAssignment.scannedUid}
        existingAssignment={rfidAssignment.existingAssignment}
        removalReason={rfidAssignment.removalReason}
        otherReason={rfidAssignment.otherReason}
        onScanRfid={handleScanRfid}
        onConfirmReassignment={handleConfirmReassignment}
        onRemoveRfid={handleRemoveRfid}
        onInputChange={handleInputChange}
      />

      {/* Manual Attendance Modal */}
      {rfidAssignment.isOpen && rfidAssignment.mode === 'manual' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#400504]">
                Manual {rfidAssignment.action === 'timein' ? 'Time In' : 'Time Out'} - {rfidAssignment.employee?.firstName} {rfidAssignment.employee?.lastName}
              </h3>
              <button
                onClick={() => setRfidAssignment({ isOpen: false, employee: null, mode: 'scan', scannedUid: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#cba235] text-sm"
                disabled
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time (HH:MM)
              </label>
              <input
                type="time"
                value={rfidAssignment.time}
                onChange={(e) => setRfidAssignment(prev => ({ ...prev, time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#cba235] text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use current time
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setRfidAssignment({ isOpen: false, employee: null, mode: 'scan', scannedUid: '' })}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={manualTimeInOut}
                className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] text-sm"
              >
                Record {rfidAssignment.action === 'timein' ? 'Time In' : 'Time Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View History Modal */}
      {viewModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#400504]">
                Attendance History - {viewModal.employee?.firstName} {viewModal.employee?.lastName}
              </h3>
              <button
                onClick={() => setViewModal({ isOpen: false, employee: null })}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="text-lg font-bold text-green-600">
                  {attendance.filter(a => a.employeeId === viewModal.employee?.employeeId && a.timeIn).length}
                </div>
                <div className="text-green-800 text-xs">Total Present</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-lg font-bold text-blue-600">
                  {attendance.filter(a => a.employeeId === viewModal.employee?.employeeId && a.timeOut).length}
                </div>
                <div className="text-blue-800 text-xs">Completed Shifts</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <div className="text-lg font-bold text-yellow-600">
                  {attendance.filter(a => a.employeeId === viewModal.employee?.employeeId && a.status === 'Late').length}
                </div>
                <div className="text-yellow-800 text-xs">Late Days</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="text-lg font-bold text-gray-600">
                  {attendance.filter(a => a.employeeId === viewModal.employee?.employeeId).length}
                </div>
                <div className="text-gray-800 text-xs">Total Records</div>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {(employeeHistory[viewModal.employee?.employeeId] || []).length > 0 ? (
                <table className="min-w-full table-auto">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium">Time In</th>
                      <th className="px-4 py-2 text-left text-xs font-medium">Time Out</th>
                      <th className="px-4 py-2 text-left text-xs font-medium">Hours Worked</th>
                      <th className="px-4 py-2 text-left text-xs font-medium">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium">Late Minutes</th>
                      <th className="px-4 py-2 text-left text-xs font-medium">Overtime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeHistory[viewModal.employee?.employeeId]
                      ?.sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map((record) => (
                        <tr key={record._id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2 text-sm">{new Date(record.date).toLocaleDateString()}</td>
                          <td className="px-4 py-2 text-sm">{record.timeIn ? formatTime(record.timeIn) : '-'}</td>
                          <td className="px-4 py-2 text-sm">{record.timeOut ? formatTime(record.timeOut) : '-'}</td>
                          <td className="px-4 py-2 text-sm text-center">{record.hoursWorked ? `${record.hoursWorked}h` : '-'}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              record.status === 'Present' ? 'bg-green-100 text-green-800' :
                              record.status === 'Late' ? 'bg-yellow-100 text-yellow-800' :
                              record.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                              record.status === 'No Work' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-center">{record.lateMinutes || 0}m</td>
                          <td className="px-4 py-2 text-sm text-center">{record.overtimeMinutes || 0}m</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FaHistory className="text-4xl mx-auto mb-2 text-gray-300" />
                  <p>No attendance records found for this employee.</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-4 pt-4 border-t">
              <button
                onClick={() => setViewModal({ isOpen: false, employee: null })}
                className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Summary Modal */}
      {viewMode === 'monthly' && monthlySummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#400504]">
                  Monthly Attendance Summary - {monthlySummary.employee.name}
                </h3>
                <p className="text-gray-600">
                  {monthlySummary.period?.monthName || `${selectedMonth}/${selectedYear}`} • 
                  {monthlySummary.employee.department} • {monthlySummary.employee.position}
                </p>
              </div>
              <button
                onClick={closeMonthlySummary}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-100 p-4 rounded-lg text-center border border-green-200">
                <FaClock className="text-2xl text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{monthlySummary.presentDays}</div>
                <div className="text-green-800 text-sm">Present Days</div>
              </div>
              <div className="bg-red-100 p-4 rounded-lg text-center border border-red-200">
                <FaUserTimes className="text-2xl text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">{monthlySummary.absentDays}</div>
                <div className="text-red-800 text-sm">Absent Days</div>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg text-center border border-blue-200">
                <FaChartBar className="text-2xl text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{monthlySummary.totalHours}h</div>
                <div className="text-blue-800 text-sm">Total Hours</div>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg text-center border border-yellow-200">
                <FaExclamationTriangle className="text-2xl text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600">{monthlySummary.lateDays}</div>
                <div className="text-yellow-800 text-sm">Late Days</div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold mb-2 text-[#400504]">Summary Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <strong>Total Work Days:</strong> {monthlySummary.totalWorkDays}
                </div>
                <div>
                  <strong>Attendance Rate:</strong> {monthlySummary.totalWorkDays > 0 ? 
                    ((monthlySummary.presentDays / monthlySummary.totalWorkDays) * 100).toFixed(1) : 0}%
                </div>
                <div>
                  <strong>Average Hours/Day:</strong> {monthlySummary.averageHours}h
                </div>
                <div>
                  <strong>Work Days Missed:</strong> {monthlySummary.absentDays}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t">
              <button
                onClick={closeMonthlySummary}
                className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303]"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Attendance;
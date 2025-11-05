import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  FaServer, FaTimes,
  FaCheckCircle, FaPlug, FaCalendarDay,
  FaCalendarAlt,
  FaExclamationTriangle
} from 'react-icons/fa';

import AttendanceTable from '../Attendance/AttendanceTable';
import SummaryModal from '../Attendance/SummaryModal';
import ManualAttendanceModal from '../Attendance/ManualAttendanceModal';
import RfidAssignmentModal from '../Attendance/RfidAssignmentModal';

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

    // Simulate real-time updates (replace with actual WebSocket/Socket.io)
    const interval = setInterval(() => {
      setRealTimeData(prev => ({ ...prev }));
    }, 10000);

    return () => clearInterval(interval);
  }, [apiBaseUrl]);

  return realTimeData;
};

// Custom Alert Component
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
            {type === 'error' && <FaTimes className="h-5 w-5 text-[#ff6b6b] mr-3" />}
            {type === 'warning' && <FaExclamationTriangle className="h-5 w-5 text-[#cba235] mr-3" />}
            <p className="text-sm font-medium">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-[#cba235] hover:text-white transition-colors"
          >
            <FaTimes />
          </button>
        </div>
      </div>
    </div>
  );
};

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [rfidStatus, setRfidStatus] = useState({ connected: false, status: 'Checking...' });
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
  const [successMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [alert, setAlert] = useState(null);

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [departmentFilter] = useState('all');
  const [positionFilter] = useState('all');
  const [sortConfig] = useState({ key: 'recentActivity', direction: 'desc' });

  const [rfidAssignment, setRfidAssignment] = useState({
    isOpen: false,
    employee: null,
    mode: 'scan',
    scannedUid: '',
    existingAssignment: null,
    removalReason: '',
    otherReason: ''
  });

  const [manualAttendanceModal, setManualAttendanceModal] = useState({ 
    isOpen: false, 
    employee: null, 
    action: '', 
    time: '' 
  });

  const realTimeUpdates = useRealTimeUpdates(apiBaseUrl);

  // Show alert function
  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const getMinDate = () => {
    const octoberFirst = new Date('2024-10-01');
    return octoberFirst.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isToday = (date) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    return date === todayStr;
  };

  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const initializeAPI = useCallback(async () => {
    try {
      console.log('Initializing API connection...');
      const baseUrl = await findWorkingBackend();
      setApiBaseUrl(baseUrl);
      
      try {
        const statusResponse = await axios.get(`${baseUrl}/api/rfid/health`, { timeout: 5000 });
        setRfidStatus({
          connected: statusResponse.data.status === 'OK',
          status: statusResponse.data.status || 'Connected'
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
        timeout: 10000,
        params: {
          status: 'Active',
          limit: 1000
        }
      });
      console.log('Employees response:', response.data);
      
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const activeEmployees = response.data.data.filter(emp => emp.status === 'Active');
        console.log(`Loaded ${activeEmployees.length} active employees`);
        setEmployees(activeEmployees);
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
        `${baseUrl}/api/attendance?date=${date}`,
        { timeout: 10000 }
      );
      
      console.log('Attendance API Response:', response.data);
      console.log('Attendance records loaded:', response.data.data?.length || 0);
      
      if (response.data.data && Array.isArray(response.data.data)) {
        response.data.data.forEach(record => {
          console.log(`Record: ${record.employeeId} - TimeIn: ${record.timeIn} - TimeOut: ${record.timeOut} - Status: ${record.status}`);
        });
      }
      
      setAttendance(response.data.data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      console.error('Error details:', error.response?.data || error.message);
      setAttendance([]);
    }
  }, []);

  const fetchTodaySummary = useCallback(async (baseUrl) => {
    if (!baseUrl) return;
    
    try {
      const response = await axios.get(`${baseUrl}/api/attendance/summary?date=${getTodayString()}`, { timeout: 10000 });
      console.log('Today summary response:', response.data);
      
      if (response.data && response.data.success) {
        setTodaySummary(response.data.data || {
          summary: {
            present: 0,
            absent: 0,
            completed: 0,
            late: 0,
            totalEmployees: 0
          },
          records: []
        });
      } else {
        setTodaySummary({
          summary: {
            present: 0,
            absent: 0,
            completed: 0,
            late: 0,
            totalEmployees: 0
          },
          records: []
        });
      }
    } catch (error) {
      console.error('Error fetching today summary:', error);
      setTodaySummary({
        summary: {
          present: 0,
          absent: 0,
          completed: 0,
          late: 0,
          totalEmployees: 0
        },
        records: []
      });
    }
  }, []);

  const fetchMonthlySummary = useCallback(async (employee) => {
    if (!apiBaseUrl || !employee) return;
    
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    try {
      const response = await axios.get(
        `${apiBaseUrl}/api/attendance/summary/monthly/${employee.employeeId}?year=${year}&month=${month}`,
        { timeout: 10000 }
      );
      
      if (response.data.success) {
        setMonthlySummary(response.data.data);
        setShowSummaryModal(true);
      } else {
        console.error('Error loading monthly summary:', response.data.message);
        setMonthlySummary({
          employee: employee,
          presentDays: 0,
          absentDays: 0,
          totalHours: 0,
          totalMinutes: 0,
          lateDays: 0,
          totalWorkDays: 0,
          averageHours: 0,
          employmentDate: employee.dateEmployed
        });
        setShowSummaryModal(true);
      }
    } catch (error) {
      console.error('Error fetching monthly summary:', error);
      setMonthlySummary({
        employee: employee,
        presentDays: 0,
        absentDays: 0,
        totalHours: 0,
        totalMinutes: 0,
        lateDays: 0,
        totalWorkDays: 0,
        averageHours: 0,
        employmentDate: employee.dateEmployed
      });
      setShowSummaryModal(true);
    }
  }, [apiBaseUrl]);

  // Enhanced RFID Removal Function
  const handleRemoveRfid = async (employee) => {
    if (!apiBaseUrl) {
      showAlert('Backend connection not available.', 'error');
      return;
    }

    if (!employee.rfidUid || !employee.isRfidAssigned) {
      showAlert('This employee does not have an RFID assigned.', 'warning');
      return;
    }

    // Confirm removal
    const confirmRemove = window.confirm(
      `Are you sure you want to remove RFID assignment from ${employee.firstName} ${employee.lastName}?\n\nRFID UID: ${employee.rfidUid}`
    );

    if (!confirmRemove) return;

    try {
      console.log('Removing RFID for employee:', employee.employeeId);

      // Try the new endpoint first
      let response;
      try {
        response = await fetch(`${apiBaseUrl}/api/rfid/remove/${employee.employeeId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        // Fallback to old endpoint
        console.log('Trying fallback endpoint...');
        response = await fetch(`${apiBaseUrl}/api/rfid/assign/${employee.employeeId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      const result = await response.json();

      if (result.success) {
        console.log('RFID removal successful:', result);
        
        // Show success message
        showAlert(`RFID successfully removed from ${employee.firstName} ${employee.lastName}`, 'success');
        
        // Refresh the employee list to reflect changes
        fetchEmployees(apiBaseUrl);
      } else {
        throw new Error(result.message || 'Failed to remove RFID');
      }

    } catch (error) {
      console.error('RFID removal error:', error);
      showAlert(`Error removing RFID: ${error.message}`, 'error');
    }
  };

  const applyFilters = useCallback((empList, attendanceList, search, dept, position, date) => {
    let filtered = empList;

    const todayStr = getTodayString();
    
    if (date < todayStr) {
      console.log('Historical date detected - filtering to employees with attendance only');
      const employeesWithAttendance = empList.filter(emp =>
        attendanceList.some(att => att.employeeId === emp.employeeId)
      );
      filtered = employeesWithAttendance;
      console.log(`Filtered from ${empList.length} to ${employeesWithAttendance.length} employees with attendance`);
    } else {
      console.log('Current/future date - showing all employees');
    }

    if (search) {
      filtered = filtered.filter(emp =>
        emp.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        emp.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        emp.employeeId?.toLowerCase().includes(search.toLowerCase()) ||
        emp.department?.toLowerCase().includes(search.toLowerCase()) ||
        emp.position?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (dept !== 'all') {
      filtered = filtered.filter(emp => emp.department === dept);
    }

    if (position !== 'all') {
      filtered = filtered.filter(emp => emp.position === position);
    }

    const sorted = sortEmployees(filtered, attendanceList, sortConfig);
    setFilteredEmployees(sorted);
  }, [sortConfig]);

  const sortEmployees = (employees, attendanceList, config) => {
    return [...employees].sort((a, b) => {
      const aAttendance = attendanceList.find(att => att.employeeId === a.employeeId);
      const bAttendance = attendanceList.find(att => att.employeeId === b.employeeId);

      if (config.key === 'recentActivity') {
        if (aAttendance?.timeOut && bAttendance?.timeOut) {
          return new Date(bAttendance.timeOut) - new Date(aAttendance.timeOut);
        }
        if (aAttendance?.timeOut) return -1;
        if (bAttendance?.timeOut) return 1;
        if (aAttendance?.timeIn && bAttendance?.timeIn) {
          return new Date(bAttendance.timeIn) - new Date(aAttendance.timeIn);
        }
        if (aAttendance?.timeIn) return -1;
        if (bAttendance?.timeIn) return 1;
        return 0;
      }

      if (config.key === 'name') {
        const aName = `${a.firstName} ${a.lastName}`.toLowerCase();
        const bName = `${b.firstName} ${b.lastName}`.toLowerCase();
        return aName.localeCompare(bName);
      }

      if (config.key === 'department') {
        return a.department?.localeCompare(b.department || '');
      }

      if (config.key === 'position') {
        return a.position?.localeCompare(b.position || '');
      }

      if (config.key === 'employeeId') {
        return a.employeeId?.localeCompare(b.employeeId || '');
      }

      return 0;
    });
  };

  const handleDateChange = (date) => {
    console.log('Date changed to:', date);
    setSelectedDate(date);
    if (apiBaseUrl) {
      fetchAttendance(apiBaseUrl, date);
    }
  };

  const handleViewHistory = async (employee) => {
    console.log('View history clicked for:', employee);
    await fetchMonthlySummary(employee);
  };

  const handleCloseSummaryModal = () => {
    setShowSummaryModal(false);
    setMonthlySummary(null);
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

  const openManualAttendanceModal = (employee, action) => {
    setManualAttendanceModal({
      isOpen: true,
      employee,
      action,
      time: ''
    });
  };

  const closeManualAttendanceModal = () => {
    setManualAttendanceModal({
      isOpen: false,
      employee: null,
      action: '',
      time: ''
    });
  };

  const handleScanRfid = async (uid) => {
    if (!apiBaseUrl) {
      showAlert('Backend connection not available.', 'error');
      return;
    }

    try {
      const response = await axios.post(`${apiBaseUrl}/api/rfid/assign`, {
        employeeId: rfidAssignment.employee.employeeId,
        rfidUid: uid
      });

      if (response.data.success) {
        showAlert(`RFID successfully assigned to ${rfidAssignment.employee.firstName} ${rfidAssignment.employee.lastName}`, 'success');
        closeRfidAssignmentModal();
        fetchEmployees(apiBaseUrl);
      }
    } catch (apiError) {
      if (apiError.response?.data?.assignedTo) {
        setRfidAssignment(prev => ({
          ...prev,
          mode: 'confirm',
          scannedUid: uid,
          existingAssignment: apiError.response.data.assignedTo
        }));
      } else {
        showAlert(apiError.response?.data?.message || 'Error assigning RFID', 'error');
      }
    }
  };

  const handleConfirmReassignment = async () => {
    try {
      const response = await axios.post(`${apiBaseUrl}/api/rfid/assign`, {
        employeeId: rfidAssignment.employee.employeeId,
        rfidUid: rfidAssignment.scannedUid
      });

      if (response.data.success) {
        showAlert(`RFID successfully reassigned to ${rfidAssignment.employee.firstName} ${rfidAssignment.employee.lastName}`, 'success');
        closeRfidAssignmentModal();
        fetchEmployees(apiBaseUrl);
      }
    } catch (error) {
      console.error('RFID reassignment error:', error);
      showAlert(error.response?.data?.message || 'Error reassigning RFID', 'error');
    }
  };

  const handleManualAttendance = async () => {
    const { employee, action, time } = manualAttendanceModal;
    
    if (!apiBaseUrl) {
      showAlert('Backend connection not available.', 'error');
      return;
    }

    try {
      const timeToUse = time || new Date().toTimeString().substring(0, 5);
      
      const manualData = {
        employeeId: employee.employeeId,
        date: selectedDate,
        time: timeToUse,
        action: action
      };

      const response = await axios.post(`${apiBaseUrl}/api/attendance/manual`, manualData);

      if (response.data.success) {
        showAlert(`${action === 'timein' ? 'Time In' : 'Time Out'} recorded successfully for ${employee.firstName} ${employee.lastName}`, 'success');
        closeManualAttendanceModal();
        fetchAttendance(apiBaseUrl, selectedDate);
        fetchEmployees(apiBaseUrl);
      }
    } catch (error) {
      console.error('Manual attendance error:', error);
      const errorMessage = error.response?.data?.message || 'Error recording attendance';
      
      if (errorMessage.includes('10 minutes')) {
        showAlert(`Time validation failed: ${errorMessage}`, 'warning');
      } else if (errorMessage.includes('working hours')) {
        showAlert(`Time restriction: ${errorMessage}`, 'warning');
      } else {
        showAlert(errorMessage, 'error');
      }
    }
  };

  const handleInputChange = (field, value) => {
    setRfidAssignment(prev => ({
      ...prev,
      [field]: value
    }));
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

  // Real-time updates interval
  useEffect(() => {
    if (!apiBaseUrl) return;

    const intervalId = setInterval(() => {
      fetchAttendance(apiBaseUrl, selectedDate);
      fetchTodaySummary(apiBaseUrl);
    }, 30000); // Auto-refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, [apiBaseUrl, selectedDate, fetchAttendance, fetchTodaySummary]);

  useEffect(() => {
    if (employees.length > 0) {
      console.log('Applying filters...', {
        employees: employees.length,
        attendance: attendance.length,
        searchTerm,
        departmentFilter,
        positionFilter,
        selectedDate
      });
      applyFilters(employees, attendance, searchTerm, departmentFilter, positionFilter, selectedDate);
    }
  }, [employees, attendance, searchTerm, departmentFilter, positionFilter, selectedDate, sortConfig, applyFilters]);

  // Listen for real-time RFID scan events
  useEffect(() => {
    const handleRfidScanEvent = (event) => {
      const scanData = event.detail;
      console.log('RFID scan event received in Attendance:', scanData);
      
      // Update attendance data immediately
      fetchAttendance(apiBaseUrl, selectedDate);
      fetchTodaySummary(apiBaseUrl);
      
      // Show success alert
      if (scanData.type === 'timein' || scanData.type === 'timeout') {
        showAlert(
          `${scanData.employeeName} - ${scanData.type === 'timein' ? 'Time In' : 'Time Out'} recorded successfully`,
          'success'
        );
      }
    };

    window.addEventListener('rfid-scan', handleRfidScanEvent);

    return () => {
      window.removeEventListener('rfid-scan', handleRfidScanEvent);
    };
  }, [apiBaseUrl, selectedDate, fetchAttendance, fetchTodaySummary]);

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
      {/* Custom Alerts */}
      {alert && (
        <CustomAlert 
          message={alert.message} 
          type={alert.type} 
          onClose={() => setAlert(null)} 
        />
      )}

      {/* Success Message (legacy) */}
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
          {/* Status section removed as requested */}
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <FaCalendarAlt className="text-[#400504] text-lg" />
            <label htmlFor="attendance-date" className="text-sm font-medium text-gray-700">
              Select Date:
            </label>
            <input
              type="date"
              id="attendance-date"
              value={selectedDate}
              min={getMinDate()}
              max={getMaxDate()}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm"
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
            October 1, 2024 - Present
          </div>
        </div>
      </div>

      {/* Stats section removed as requested */}

      <AttendanceTable
        employees={filteredEmployees}
        attendance={attendance}
        realTimeUpdates={realTimeUpdates}
        selectedDate={selectedDate}
        onViewHistory={handleViewHistory}
        onManualTimeIn={(employee) => openManualAttendanceModal(employee, 'timein')}
        onManualTimeOut={(employee) => openManualAttendanceModal(employee, 'timeout')}
        onAssignRfid={openRfidAssignmentModal}
        onRemoveRfid={handleRemoveRfid}
        apiBaseUrl={apiBaseUrl}
      />

      <SummaryModal
        isOpen={showSummaryModal}
        onClose={handleCloseSummaryModal}
        monthlySummary={monthlySummary}
      />

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

      <ManualAttendanceModal
        isOpen={manualAttendanceModal.isOpen}
        onClose={closeManualAttendanceModal}
        employee={manualAttendanceModal.employee}
        action={manualAttendanceModal.action}
        time={manualAttendanceModal.time}
        selectedDate={selectedDate}
        onTimeChange={(time) => setManualAttendanceModal(prev => ({ ...prev, time }))}
        onConfirm={handleManualAttendance}
        apiBaseUrl={apiBaseUrl}
      />
    </div>
  );
}

export default Attendance;
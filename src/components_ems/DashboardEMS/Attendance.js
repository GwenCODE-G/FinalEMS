import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  FaSearch, FaServer, FaTimes,
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

    const interval = setInterval(() => {
      setRealTimeData(prev => ({ ...prev }));
    }, 10000);

    return () => clearInterval(interval);
  }, [apiBaseUrl]);

  return realTimeData;
};

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
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
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'recentActivity', direction: 'desc' });

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

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
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
      closeRfidAssignmentModal();
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
      closeRfidAssignmentModal();
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
      closeRfidAssignmentModal();
      fetchEmployees(apiBaseUrl);
    } catch (error) {
      console.error('RFID removal error:', error);
      alert(error.response?.data?.message || 'Error removing RFID assignment');
    }
  };

  const handleManualAttendance = async () => {
    const { employee, action, time } = manualAttendanceModal;
    
    if (!apiBaseUrl) {
      alert('Backend connection not available.');
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

      await axios.post(`${apiBaseUrl}/api/attendance/manual`, manualData);

      showSuccessMessage(`${action === 'timein' ? 'Time In' : 'Time Out'} recorded successfully for ${employee.firstName} ${employee.lastName}`);
      closeManualAttendanceModal();
      fetchAttendance(apiBaseUrl, selectedDate);
      fetchEmployees(apiBaseUrl);
    } catch (error) {
      console.error('Manual attendance error:', error);
      alert(error.response?.data?.message || 'Error recording attendance');
    }
  };

  const handleInputChange = (field, value) => {
    setRfidAssignment(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    applyFilters(employees, attendance, term, departmentFilter, positionFilter, selectedDate);
  };

  const handleDepartmentFilter = (dept) => {
    setDepartmentFilter(dept);
    applyFilters(employees, attendance, searchTerm, dept, positionFilter, selectedDate);
  };

  const handlePositionFilter = (position) => {
    setPositionFilter(position);
    applyFilters(employees, attendance, searchTerm, departmentFilter, position, selectedDate);
  };

  const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))].sort();
  const positions = [...new Set(employees.map(emp => emp.position).filter(Boolean))].sort();

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
    if (!apiBaseUrl) return;

    const intervalId = setInterval(() => {
      fetchAttendance(apiBaseUrl, selectedDate);
      fetchTodaySummary(apiBaseUrl);
    }, 30000);

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

  useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toISOString().split('T')[0];
      if (today !== getMaxDate()) {
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

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
              <FaCalendarDay className="mr-1" /> 
              Selected: {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {isToday(selectedDate) && (
                <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                  Today
                </span>
              )}
            </span>
            {selectedDate < getTodayString() && (
              <span className="flex items-center text-sm text-blue-600">
                <FaExclamationTriangle className="mr-1" />
                Historical view: Showing only employees with attendance records
              </span>
            )}
          </div>
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

      {todaySummary && todaySummary.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="text-lg font-bold text-green-600">
              {isToday(selectedDate) ? todaySummary.summary.present || 0 : filteredEmployees.length}
            </div>
            <div className="text-green-800 text-xs">
              {isToday(selectedDate) ? 'Present Today' : 'Employees with Records'}
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="text-lg font-bold text-red-600">
              {isToday(selectedDate) ? todaySummary.summary.absent || 0 : 0}
            </div>
            <div className="text-red-800 text-xs">
              {isToday(selectedDate) ? 'Absent Today' : 'No Absent Data'}
            </div>
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
            <div className="text-lg font-bold text-gray-600">{employees.length}</div>
            <div className="text-gray-800 text-xs">Total Employees</div>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#cba235] text-sm"
            />
          </div>

          <div>
            <select
              value={departmentFilter}
              onChange={(e) => handleDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={positionFilter}
              onChange={(e) => handlePositionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm"
            >
              <option value="all">All Positions</option>
              {positions.map(position => (
                <option key={position} value={position}>{position}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sortConfig.key}
              onChange={(e) => handleSort(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm"
            >
              <option value="recentActivity">Sort by: Recent Activity</option>
              <option value="name">Sort by: Name (A-Z)</option>
              <option value="department">Sort by: Department</option>
              <option value="position">Sort by: Position</option>
              <option value="employeeId">Sort by: Employee ID</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {searchTerm && (
            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              Search: "{searchTerm}"
              <button onClick={() => handleSearch('')} className="ml-1 text-blue-600 hover:text-blue-800">
                <FaTimes className="text-xs" />
              </button>
            </span>
          )}
          {departmentFilter !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
              Department: {departmentFilter}
              <button onClick={() => handleDepartmentFilter('all')} className="ml-1 text-green-600 hover:text-green-800">
                <FaTimes className="text-xs" />
              </button>
            </span>
          )}
          {positionFilter !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
              Position: {positionFilter}
              <button onClick={() => handlePositionFilter('all')} className="ml-1 text-purple-600 hover:text-purple-800">
                <FaTimes className="text-xs" />
              </button>
            </span>
          )}
          {!isToday(selectedDate) && (
            <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
              Historical View: Only employees with attendance
            </span>
          )}
        </div>
      </div>

      <AttendanceTable
        employees={filteredEmployees}
        attendance={attendance}
        realTimeUpdates={realTimeUpdates}
        selectedDate={selectedDate}
        onViewHistory={handleViewHistory}
        onManualTimeIn={(employee) => openManualAttendanceModal(employee, 'timein')}
        onManualTimeOut={(employee) => openManualAttendanceModal(employee, 'timeout')}
        onAssignRfid={openRfidAssignmentModal}
        onRemoveRfid={openRemoveRfidModal}
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
      />
    </div>
  );
}

export default Attendance;
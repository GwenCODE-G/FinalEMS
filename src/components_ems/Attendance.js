import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  FaUserTimes, 
  FaIdCard, 
  FaArchive, 
  FaEye,
  FaSearch,
  FaFilter,
  FaSync,
  FaClock,
  FaSignOutAlt,
  FaServer,
  FaPlug,
  FaChartBar,
  FaDesktop,
  FaTimes,
  FaCalendar,
  FaUserClock,
  FaBusinessTime,
  FaEdit,
  FaCheckCircle,
  FaExclamationTriangle
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

    const eventSource = new EventSource(`${apiBaseUrl}/api/rfid/realtime`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'attendance_update') {
          setRealTimeData(prev => ({
            ...prev,
            [data.employeeId]: {
              ...data,
              timestamp: new Date().toISOString()
            }
          }));
        }
      } catch (error) {
        console.error('Error parsing real-time data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.log('SSE connection error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [apiBaseUrl]);

  return realTimeData;
};

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [rfidModal, setRfidModal] = useState({ isOpen: false, employee: null, rfidUid: '' });
  const [viewModal, setViewModal] = useState({ isOpen: false, employee: null });
  const [manualModal, setManualModal] = useState({ isOpen: false, employee: null, action: 'timein', time: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [viewMode, setViewMode] = useState('daily');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [rfidStatus, setRfidStatus] = useState({ connected: false, status: 'Checking...' });
  const [employeeHistory, setEmployeeHistory] = useState({});
  const [todaySummary, setTodaySummary] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

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
      const token = localStorage.getItem('ems_token');
      console.log('Fetching employees from:', `${baseUrl}/api/employees`);
      const response = await axios.get(`${baseUrl}/api/employees`, {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Employees loaded:', response.data.length);
      
      if (response.data && Array.isArray(response.data)) {
        const activeEmployees = response.data.filter(emp => emp.status === 'Active');
        setEmployees(activeEmployees);
        setFilteredEmployees(activeEmployees);
        setError(null);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
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
      console.log('Attendance records loaded:', response.data.length);
      setAttendance(response.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendance([]);
    }
  }, []);

  const fetchTodaySummary = useCallback(async (baseUrl) => {
    if (!baseUrl) return;
    
    try {
      const response = await axios.get(`${baseUrl}/api/rfid/attendance/today`, { timeout: 10000 });
      const todayAtt = response.data;
      
      const present = todayAtt.filter(a => a.timeIn).length;
      const absent = employees.length - present;
      const completed = todayAtt.filter(a => a.timeOut).length;
      const late = todayAtt.filter(a => a.status === 'Late').length;
      
      setTodaySummary({
        summary: {
          present,
          absent,
          completed,
          late,
          totalEmployees: employees.length
        },
        records: todayAtt
      });
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
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const response = await axios.get(
        `${apiBaseUrl}/api/rfid/attendance?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&employeeId=${employeeId}`,
        { timeout: 10000 }
      );
      
      const employee = employees.find(emp => emp.employeeId === employeeId);
      if (!employee) return;
      
      const calendar = [];
      const daysInMonth = endDate.getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        const isWorkDay = employee.workDays && employee.workDays[dayName];
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const dayAttendance = response.data.find(a => 
          a.employeeId === employeeId && 
          new Date(a.date).toISOString().split('T')[0] === dateStr
        );
        
        calendar.push({
          date: dateStr,
          dayName,
          isWorkDay: !!isWorkDay,
          attendance: dayAttendance || null
        });
      }
      
      const presentDays = calendar.filter(day => day.attendance && day.attendance.timeIn).length;
      const absentDays = calendar.filter(day => day.isWorkDay && !day.attendance).length;
      const totalHours = calendar.reduce((sum, day) => sum + (day.attendance?.hoursWorked || 0), 0);
      const lateDays = calendar.filter(day => day.attendance?.status === 'Late').length;
      
      setMonthlySummary({
        employee: {
          name: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          position: employee.position
        },
        period: {
          year,
          month: month,
          monthName: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' })
        },
        summary: {
          totalPresent: presentDays,
          totalAbsent: absentDays,
          totalHours: totalHours.toFixed(1),
          totalLate: lateDays
        },
        calendar
      });
    } catch (error) {
      console.error('Error fetching monthly summary:', error);
      alert('Error loading monthly summary');
    }
  }, [apiBaseUrl, employees]);

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
    }, 10000);

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
        emp.department?.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'text-green-600';
      case 'Late': return 'text-yellow-600';
      case 'Completed': return 'text-blue-600';
      case 'Absent': return 'text-red-600';
      case 'No Work': return 'text-gray-600';
      case 'Half-day': return 'text-orange-600';
      default: return 'text-gray-600';
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
        isWorkDay: realTimeUpdate.isWorkDay,
        hoursWorked: realTimeUpdate.hoursWorked || 0,
        lateMinutes: realTimeUpdate.lateMinutes || 0,
        overtimeMinutes: realTimeUpdate.overtimeMinutes || 0
      };
    }

    const todayAttendance = attendance.find(a => a.employeeId === employeeId);
    const now = new Date();
    const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });
    const isWorkDay = employee.workDays && employee.workDays[dayOfWeek];
    
    if (!todayAttendance) {
      if (isWorkDay && employee.workSchedule && employee.workSchedule[dayOfWeek]) {
        const schedule = employee.workSchedule[dayOfWeek];
        const [endHour, endMinute] = schedule.end.split(':').map(Number);
        const endTime = new Date(selectedDate);
        endTime.setHours(endHour, endMinute, 0, 0);
        
        if (now > endTime) {
          return { 
            status: 'Absent', 
            color: 'text-red-600', 
            timeIn: '-', 
            timeOut: '-',
            isWorkDay: true
          };
        }
      }
      
      return { 
        status: isWorkDay ? 'Pending' : 'No Work', 
        color: isWorkDay ? 'text-yellow-600' : 'text-gray-600', 
        timeIn: '-', 
        timeOut: '-',
        isWorkDay 
      };
    }
    
    if (todayAttendance.timeIn && !todayAttendance.timeOut) {
      return { 
        status: todayAttendance.status === 'Late' ? 'Late' : 'Present', 
        color: todayAttendance.status === 'Late' ? 'text-yellow-600' : 'text-green-600', 
        timeIn: new Date(todayAttendance.timeIn).toLocaleTimeString(),
        timeOut: '-',
        isWorkDay: todayAttendance.isWorkDay
      };
    }
    
    if (todayAttendance.timeOut) {
      return { 
        status: 'Completed', 
        color: 'text-blue-600', 
        timeIn: new Date(todayAttendance.timeIn).toLocaleTimeString(),
        timeOut: new Date(todayAttendance.timeOut).toLocaleTimeString(),
        isWorkDay: todayAttendance.isWorkDay
      };
    }
    
    return { 
      status: todayAttendance.status, 
      color: 'text-gray-600', 
      timeIn: '-', 
      timeOut: '-',
      isWorkDay: todayAttendance.isWorkDay
    };
  };

  const assignRfid = async (employee, rfidUid) => {
    if (!apiBaseUrl) {
      alert('Backend connection not available. Please check server connection.');
      return;
    }

    try {
      const token = localStorage.getItem('ems_token');
      const cleanUid = rfidUid.replace(/\s/g, '');
      if (!/^[0-9A-F]{8}$/i.test(cleanUid)) {
        alert('Invalid RFID format. Must be 4 pairs of 2 characters (e.g., 4D D6 D8 B5)');
        return;
      }

      const formattedUid = cleanUid.match(/.{1,2}/g).join(' ').toUpperCase();
      
      await axios.post(`${apiBaseUrl}/api/rfid/assign`, {
        employeeId: employee.employeeId,
        rfidUid: formattedUid
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      showSuccessMessage(`RFID successfully assigned to ${employee.firstName} ${employee.lastName}`);
      setRfidModal({ isOpen: false, employee: null, rfidUid: '' });
      fetchEmployees(apiBaseUrl);
    } catch (error) {
      console.error('RFID assignment error:', error);
      alert(error.response?.data?.message || 'Error assigning RFID');
    }
  };

  const removeRfid = async (employeeId, employeeName) => {
    if (!apiBaseUrl) {
      alert('Backend connection not available.');
      return;
    }

    if (window.confirm(`Are you sure you want to remove RFID assignment from ${employeeName}?`)) {
      try {
        const token = localStorage.getItem('ems_token');
        await axios.delete(`${apiBaseUrl}/api/rfid/assign/${employeeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        showSuccessMessage(`RFID assignment removed from ${employeeName}`);
        fetchEmployees(apiBaseUrl);
      } catch (error) {
        alert('Error removing RFID assignment');
      }
    }
  };

  const archiveEmployee = async (employeeId, employeeName) => {
    if (!apiBaseUrl) {
      alert('Backend connection not available.');
      return;
    }

    if (window.confirm(`Are you sure you want to archive ${employeeName}?`)) {
      try {
        const token = localStorage.getItem('ems_token');
        await axios.delete(`${apiBaseUrl}/api/employees/${employeeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        showSuccessMessage(`${employeeName} archived successfully`);
        fetchEmployees(apiBaseUrl);
      } catch (error) {
        alert('Error archiving employee');
      }
    }
  };

  const manualTimeInOut = async (employee, action, time) => {
    if (!apiBaseUrl) {
      alert('Backend connection not available.');
      return;
    }

    try {
      const token = localStorage.getItem('ems_token');
      const timeToUse = time || new Date().toTimeString().substring(0, 5);
      const dateTime = new Date(`${selectedDate}T${timeToUse}`);
      
      const attendanceData = {
        employeeId: employee.employeeId,
        date: selectedDate,
        rfidUid: employee.rfidUid || 'MANUAL',
        [action === 'timein' ? 'timeIn' : 'timeOut']: dateTime,
        status: action === 'timein' ? 'Present' : 'Completed'
      };

      const existingRecord = attendance.find(a => 
        a.employeeId === employee.employeeId && 
        new Date(a.date).toISOString().split('T')[0] === selectedDate
      );

      if (existingRecord) {
        await axios.put(
          `${apiBaseUrl}/api/rfid/attendance/${existingRecord._id}`,
          attendanceData,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
      } else {
        await axios.post(
          `${apiBaseUrl}/api/rfid/attendance`,
          attendanceData,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
      }

      showSuccessMessage(`${action === 'timein' ? 'Time In' : 'Time Out'} recorded successfully for ${employee.firstName} ${employee.lastName}`);
      setManualModal({ isOpen: false, employee: null, action: 'timein', time: '' });
      fetchAttendance(apiBaseUrl, selectedDate);
    } catch (error) {
      console.error('Manual attendance error:', error);
      alert(error.response?.data?.error || 'Error recording attendance');
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
      setEmployeeHistory((prev) => ({ ...prev, [employee.employeeId]: response.data || [] }));
    } catch (err) {
      console.error('Error fetching employee history:', err);
    }
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
    }
  };

  const closeMonthlySummary = () => {
    setViewMode('daily');
    setMonthlySummary(null);
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

      {viewMode === 'daily' && todaySummary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="text-lg font-bold text-green-600">{todaySummary.summary.present}</div>
            <div className="text-green-800 text-xs">Present Today</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="text-lg font-bold text-red-600">{todaySummary.summary.absent}</div>
            <div className="text-red-800 text-xs">Absent Today</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="text-lg font-bold text-blue-600">{todaySummary.summary.completed}</div>
            <div className="text-blue-800 text-xs">Completed Shift</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="text-lg font-bold text-yellow-600">{todaySummary.summary.late}</div>
            <div className="text-yellow-800 text-xs">Late Today</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="text-lg font-bold text-gray-600">{todaySummary.summary.totalEmployees}</div>
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
              placeholder="Search employees by name, ID, or department..."
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
                            src={employee.profilePicture ? `${apiBaseUrl}/uploads/${employee.profilePicture}` : '/default-avatar.png'}
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
                            onClick={() => setManualModal({ isOpen: true, employee, action: 'timein', time: '' })}
                            className="text-orange-600 hover:text-orange-900 p-1 rounded bg-orange-50 text-xs transition-colors"
                            title="Manual Time In/Out"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => setRfidModal({ isOpen: true, employee, rfidUid: employee.rfidUid || '' })}
                            className="text-green-600 hover:text-green-900 p-1 rounded bg-green-50 text-xs transition-colors"
                            title="Assign RFID"
                          >
                            <FaIdCard />
                          </button>
                          {employee.isRfidAssigned && (
                            <button
                              onClick={() => removeRfid(employee.employeeId, `${employee.firstName} ${employee.lastName}`)}
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

      {/* Modals remain the same as your original code */}
      {/* Manual Time In/Out Modal */}
      {manualModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#400504]">
                Manual {manualModal.action === 'timein' ? 'Time In' : 'Time Out'} - {manualModal.employee?.firstName} {manualModal.employee?.lastName}
              </h3>
              <button
                onClick={() => setManualModal({ isOpen: false, employee: null, action: 'timein', time: '' })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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
                value={manualModal.time}
                onChange={(e) => setManualModal({ ...manualModal, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#cba235] text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use current time
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setManualModal({ isOpen: false, employee: null, action: 'timein', time: '' })}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => manualTimeInOut(manualModal.employee, manualModal.action, manualModal.time)}
                className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] text-sm transition-colors"
              >
                Record {manualModal.action === 'timein' ? 'Time In' : 'Time Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RFID Assignment Modal */}
      {rfidModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#400504]">Assign RFID to {rfidModal.employee?.firstName} {rfidModal.employee?.lastName}</h3>
              <button
                onClick={() => setRfidModal({ isOpen: false, employee: null, rfidUid: '' })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>How to get RFID UID:</strong> Scan the RFID card on your Arduino device, then check the Serial Monitor for the UID.
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RFID UID (Format: XX XX XX XX)
              </label>
              <input
                type="text"
                value={rfidModal.rfidUid}
                onChange={(e) => setRfidModal({ ...rfidModal, rfidUid: e.target.value })}
                placeholder="e.g., 4D D6 D8 B5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#cba235] font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter 4 pairs of 2 characters (letters/numbers). Example: 4D D6 D8 B5
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setRfidModal({ isOpen: false, employee: null, rfidUid: '' })}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => assignRfid(rfidModal.employee, rfidModal.rfidUid)}
                className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] text-sm transition-colors"
              >
                Assign RFID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance History Modal */}
      {viewModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#400504]">
                Attendance History - {viewModal.employee?.firstName} {viewModal.employee?.lastName}
              </h3>
              <button
                onClick={() => setViewModal({ isOpen: false, employee: null })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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
                  <FaCalendar className="text-4xl mx-auto mb-2 text-gray-300" />
                  <p>No attendance records found for this employee.</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-4 pt-4 border-t">
              <button
                onClick={() => setViewModal({ isOpen: false, employee: null })}
                className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] text-sm transition-colors"
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
                  {monthlySummary.period.monthName} {monthlySummary.period.year} • 
                  {monthlySummary.employee.department} • {monthlySummary.employee.position}
                </p>
              </div>
              <button
                onClick={closeMonthlySummary}
                className="text-gray-400 hover:text-gray-600 text-xl transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-100 p-4 rounded-lg text-center border border-green-200">
                <FaUserClock className="text-2xl text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{monthlySummary.summary.totalPresent}</div>
                <div className="text-green-800 text-sm">Present Days</div>
              </div>
              <div className="bg-red-100 p-4 rounded-lg text-center border border-red-200">
                <FaUserTimes className="text-2xl text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">{monthlySummary.summary.totalAbsent}</div>
                <div className="text-red-800 text-sm">Absent Days</div>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg text-center border border-blue-200">
                <FaBusinessTime className="text-2xl text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{monthlySummary.summary.totalHours}h</div>
                <div className="text-blue-800 text-sm">Total Hours</div>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg text-center border border-yellow-200">
                <FaClock className="text-2xl text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600">{monthlySummary.summary.totalLate}</div>
                <div className="text-yellow-800 text-sm">Late Days</div>
              </div>
            </div>

            {/* Calendar View */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3 text-lg text-[#400504]">Monthly Calendar View</h4>
              <div className="grid grid-cols-7 gap-1 mb-2 bg-gray-100 rounded-t-lg">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-semibold py-2 text-sm">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthlySummary.calendar.map(day => (
                  <div key={day.date} className={`p-2 border rounded text-center min-h-[60px] ${
                    !day.isWorkDay ? 'bg-gray-50' : 
                    day.attendance ? 
                      day.attendance.status === 'Present' ? 'bg-green-50 border-green-200' :
                      day.attendance.status === 'Late' ? 'bg-yellow-50 border-yellow-200' :
                      day.attendance.status === 'Completed' ? 'bg-blue-50 border-blue-200' : 
                      'bg-gray-50 border-gray-200'
                    : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="text-sm font-medium mb-1">
                      {new Date(day.date).getDate()}
                    </div>
                    <div className="text-xs space-y-1">
                      {day.attendance ? (
                        <>
                          <div className="truncate">{day.attendance.timeIn ? formatTime(day.attendance.timeIn) : '-'}</div>
                          <div className="font-semibold">{day.attendance.hoursWorked || 0}h</div>
                        </>
                      ) : day.isWorkDay ? (
                        <span className="text-red-600">Absent</span>
                      ) : (
                        <span className="text-gray-500">Off</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto">
              <h4 className="font-semibold mb-3 text-lg text-[#400504]">Detailed Attendance Records</h4>
              <table className="min-w-full table-auto border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium border">Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium border">Day</th>
                    <th className="px-4 py-2 text-left text-sm font-medium border">Work Day</th>
                    <th className="px-4 py-2 text-left text-sm font-medium border">Time In</th>
                    <th className="px-4 py-2 text-left text-sm font-medium border">Time Out</th>
                    <th className="px-4 py-2 text-left text-sm font-medium border">Hours</th>
                    <th className="px-4 py-2 text-left text-sm font-medium border">Status</th>
                    <th className="px-4 py-2 text-left text-sm font-medium border">Late</th>
                    <th className="px-4 py-2 text-left text-sm font-medium border">Overtime</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummary.calendar.map(day => (
                    <tr key={day.date} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 text-sm border">{new Date(day.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-sm border">{day.dayName}</td>
                      <td className="px-4 py-2 text-sm border text-center">
                        {day.isWorkDay ? '✓' : '✗'}
                      </td>
                      <td className="px-4 py-2 text-sm border">{day.attendance?.timeIn ? formatTime(day.attendance.timeIn) : '-'}</td>
                      <td className="px-4 py-2 text-sm border">{day.attendance?.timeOut ? formatTime(day.attendance.timeOut) : '-'}</td>
                      <td className="px-4 py-2 text-sm border text-center">{day.attendance?.hoursWorked || 0}</td>
                      <td className="px-4 py-2 text-sm border">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          day.attendance ? 
                            day.attendance.status === 'Present' ? 'bg-green-100 text-green-800' :
                            day.attendance.status === 'Late' ? 'bg-yellow-100 text-yellow-800' :
                            day.attendance.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          : day.isWorkDay ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {day.attendance?.status || (day.isWorkDay ? 'Absent' : 'No Work')}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm border text-center">{day.attendance?.lateMinutes || 0}m</td>
                      <td className="px-4 py-2 text-sm border text-center">{day.attendance?.overtimeMinutes || 0}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t">
              <button
                onClick={closeMonthlySummary}
                className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] transition-colors"
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
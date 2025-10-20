import React, { useState, useEffect } from 'react';
import { 
  FaClock, FaSignOutAlt, FaIdCard, 
  FaUserTimes, FaClock as FaClockIcon, FaHistory,
  FaSort, FaSortUp, FaSortDown, FaSync
} from 'react-icons/fa';

const AttendanceTable = ({
  employees,
  attendance,
  realTimeUpdates,
  selectedDate,
  onViewHistory,
  onManualTimeIn,
  onManualTimeOut,
  onAssignRfid,
  onRemoveRfid
}) => {
  const [sortConfig, setSortConfig] = useState({ key: 'recentActivity', direction: 'desc' });
  const [localUpdates, setLocalUpdates] = useState({});
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Merge real-time updates with local updates
  useEffect(() => {
    if (realTimeUpdates && Object.keys(realTimeUpdates).length > 0) {
      setLocalUpdates(prev => ({
        ...prev,
        ...realTimeUpdates
      }));
    }
  }, [realTimeUpdates]);

  // Auto-refresh every 10 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLocalUpdates(prev => ({ ...prev }));
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

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

  // FIXED: No timezone conversion - times are already in PH timezone from backend
  const formatTime = (timeValue) => {
    if (!timeValue) return '-';
    
    try {
      let date;
      
      // Handle different time value types
      if (typeof timeValue === 'string') {
        date = new Date(timeValue);
      } else if (timeValue instanceof Date) {
        date = timeValue;
      } else if (timeValue && typeof timeValue === 'object') {
        // Handle MongoDB Date object
        date = new Date(timeValue);
      } else {
        return '-';
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      // FIXED: Date is already in PH timezone, just format it
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

  const formatRfidUid = (uid) => {
    if (!uid) return 'Not Assigned';
    return uid.toUpperCase();
  };

  // FIXED: Enhanced attendance status detection with real-time updates
  const getAttendanceStatus = (employee) => {
    const employeeId = employee.employeeId;
    
    // Check for real-time updates first
    const realTimeUpdate = localUpdates[employeeId];
    if (realTimeUpdate) {
      return {
        status: realTimeUpdate.status,
        color: getStatusColor(realTimeUpdate.status),
        timeIn: realTimeUpdate.timeIn ? formatTime(realTimeUpdate.timeIn) : '-',
        timeOut: realTimeUpdate.timeOut ? formatTime(realTimeUpdate.timeOut) : '-',
        isWorkDay: true,
        timestamp: realTimeUpdate.timestamp,
        hoursWorked: realTimeUpdate.hoursWorked || '0h 0m'
      };
    }

    // Check existing attendance records
    const todayAttendance = Array.isArray(attendance) 
      ? attendance.find(a => a.employeeId === employeeId && a.date === selectedDate)
      : null;
    
    if (todayAttendance) {
      // PRIORITY: Use backend-generated display fields (already formatted in PH time)
      const timeInDisplay = todayAttendance.displayTimeIn || formatTime(todayAttendance.timeIn);
      const timeOutDisplay = todayAttendance.displayTimeOut || formatTime(todayAttendance.timeOut);
      
      return {
        status: todayAttendance.status || 'Present',
        color: getStatusColor(todayAttendance.status || 'Present'),
        timeIn: timeInDisplay,
        timeOut: timeOutDisplay,
        isWorkDay: true,
        timestamp: todayAttendance.timeOut ? new Date(todayAttendance.timeOut).getTime() : 
                  todayAttendance.timeIn ? new Date(todayAttendance.timeIn).getTime() : 0,
        hoursWorked: todayAttendance.hoursWorked || '0h 0m'
      };
    }

    // No attendance record found
    const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });
    const isWorkDay = employee.workSchedule ? 
                     (employee.workSchedule[dayOfWeek]?.active || false) : 
                     ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(dayOfWeek);
    
    return { 
      status: isWorkDay ? 'Pending' : 'No Work', 
      color: getStatusColor(isWorkDay ? 'Pending' : 'No Work'), 
      timeIn: '-', 
      timeOut: '-',
      isWorkDay,
      timestamp: 0,
      hoursWorked: '0h 0m'
    };
  };

  // Sort employees based on current sort configuration
  const getSortedEmployees = () => {
    if (!employees.length) return [];

    return [...employees].sort((a, b) => {
      const aStatus = getAttendanceStatus(a);
      const bStatus = getAttendanceStatus(b);

      switch (sortConfig.key) {
        case 'recentActivity':
          // Sort by most recent activity (time out > time in > no activity)
          const aTime = aStatus.timestamp;
          const bTime = bStatus.timestamp;
          return sortConfig.direction === 'desc' ? bTime - aTime : aTime - bTime;

        case 'name':
          const aName = `${a.firstName} ${a.lastName}`.toLowerCase();
          const bName = `${b.firstName} ${b.lastName}`.toLowerCase();
          return sortConfig.direction === 'desc' ? 
            bName.localeCompare(aName) : aName.localeCompare(bName);

        case 'department':
          return sortConfig.direction === 'desc' ? 
            (b.department || '').localeCompare(a.department || '') : 
            (a.department || '').localeCompare(b.department || '');

        case 'position':
          return sortConfig.direction === 'desc' ? 
            (b.position || '').localeCompare(a.position || '') : 
            (a.position || '').localeCompare(b.position || '');

        case 'employeeId':
          return sortConfig.direction === 'desc' ? 
            (b.employeeId || '').localeCompare(a.employeeId || '') : 
            (a.employeeId || '').localeCompare(b.employeeId || '');

        case 'status':
          const statusOrder = { 'Completed': 1, 'Late': 2, 'Present': 3, 'Pending': 4, 'No Work': 5, 'Absent': 6 };
          const aStatusOrder = statusOrder[aStatus.status] || 7;
          const bStatusOrder = statusOrder[bStatus.status] || 7;
          return sortConfig.direction === 'desc' ? 
            bStatusOrder - aStatusOrder : aStatusOrder - bStatusOrder;

        default:
          return 0;
      }
    });
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="text-gray-400" />;
    return sortConfig.direction === 'desc' ? <FaSortDown className="text-[#400504]" /> : <FaSortUp className="text-[#400504]" />;
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const manualRefresh = () => {
    setLocalUpdates(prev => ({ ...prev }));
  };

  const sortedEmployees = getSortedEmployees();

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
      {/* Table Header with Controls */}
      <div className="flex justify-between items-center p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-[#400504]">
            Employee Attendance ({sortedEmployees.length} employees)
          </h3>
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={manualRefresh}
              className="flex items-center space-x-1 px-3 py-1 bg-[#400504] text-white rounded hover:bg-[#300303] transition-colors"
            >
              <FaSync className="text-xs" />
              <span>Refresh Now</span>
            </button>
            <button
              onClick={toggleAutoRefresh}
              className={`flex items-center space-x-1 px-3 py-1 rounded border transition-colors ${
                autoRefresh 
                  ? 'bg-green-100 text-green-700 border-green-300' 
                  : 'bg-gray-100 text-gray-700 border-gray-300'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span>Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Sorted by: <span className="font-semibold text-[#400504]">
            {sortConfig.key === 'recentActivity' ? 'Recent Activity' : 
             sortConfig.key === 'name' ? 'Name' :
             sortConfig.key === 'department' ? 'Department' :
             sortConfig.key === 'position' ? 'Position' :
             sortConfig.key === 'status' ? 'Status' : 'Employee ID'}
          </span> ({sortConfig.direction === 'desc' ? 'Newest First' : 'Oldest First'})
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="min-w-full table-auto">
          <thead className="bg-[#400504] text-white">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-[#300303] transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Employee</span>
                  {getSortIcon('name')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:bg-[#300303] transition-colors"
                onClick={() => handleSort('department')}
              >
                <div className="flex items-center space-x-1">
                  <span>Department</span>
                  {getSortIcon('department')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-[#300303] transition-colors"
                onClick={() => handleSort('position')}
              >
                <div className="flex items-center space-x-1">
                  <span>Position</span>
                  {getSortIcon('position')}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">RFID UID</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Time In</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Time Out</th>
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
            {sortedEmployees.map((employee) => {
              const attendanceStatus = getAttendanceStatus(employee);
              const hasRecentUpdate = localUpdates[employee.employeeId];
              
              return (
                <tr 
                  key={employee._id} 
                  className={`hover:bg-gray-50 transition-all duration-300 ${
                    hasRecentUpdate ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {employee.firstName} {employee.lastName}
                          {hasRecentUpdate && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-pulse">
                              NEW
                            </span>
                          )}
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
                  <td className="px-4 py-3 text-sm text-gray-900">
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
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${attendanceStatus.color}`}>
                      {attendanceStatus.status}
                      {attendanceStatus.status === 'Late' && attendanceStatus.timeIn !== '-' && (
                        <span className="ml-1 text-xs">({Math.round((new Date() - new Date(attendanceStatus.timestamp)) / (1000 * 60))}m ago)</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-1">
                      {/* History of Attendance Button */}
                      <button
                        onClick={() => onViewHistory(employee)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded bg-indigo-50 text-xs transition-colors"
                        title="History of Attendance"
                      >
                        <FaHistory />
                      </button>
                      <button
                        onClick={() => onManualTimeIn(employee)}
                        className={`p-1 rounded text-xs transition-colors ${
                          attendanceStatus.timeIn !== '-' 
                            ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                            : 'text-orange-600 hover:text-orange-900 bg-orange-50'
                        }`}
                        title="Manual Time In"
                        disabled={attendanceStatus.timeIn !== '-'}
                      >
                        <FaClock />
                      </button>
                      <button
                        onClick={() => onManualTimeOut(employee)}
                        className={`p-1 rounded text-xs transition-colors ${
                          attendanceStatus.timeIn === '-' || attendanceStatus.timeOut !== '-' 
                            ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                            : 'text-blue-600 hover:text-blue-900 bg-blue-50'
                        }`}
                        title="Manual Time Out"
                        disabled={attendanceStatus.timeIn === '-' || attendanceStatus.timeOut !== '-'}
                      >
                        <FaSignOutAlt />
                      </button>
                      <button
                        onClick={() => onAssignRfid(employee)}
                        className="text-green-600 hover:text-green-900 p-1 rounded bg-green-50 text-xs transition-colors"
                        title="Assign RFID"
                      >
                        <FaIdCard />
                      </button>
                      {employee.rfidUid && (
                        <button
                          onClick={() => onRemoveRfid(employee)}
                          className="text-red-600 hover:text-red-900 p-1 rounded bg-red-50 text-xs transition-colors"
                          title="Remove RFID"
                        >
                          <FaUserTimes />
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

      {/* Table Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-500 flex justify-between items-center">
        <div>
          Showing {sortedEmployees.length} employees • 
          Auto-refresh: <span className={autoRefresh ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
            {autoRefresh ? 'ON (10s)' : 'OFF'}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Recent activity</span>
          </div>
          <button
            onClick={() => handleSort('recentActivity')}
            className="text-[#400504] hover:text-[#300303] font-semibold flex items-center space-x-1"
          >
            <span>Sort by Recent Activity</span>
            {getSortIcon('recentActivity')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTable;
import React from 'react';
import { 
  FaEye, FaChartBar, FaClock, FaSignOutAlt, FaIdCard, 
  FaUserTimes, FaClock as FaClockIcon
} from 'react-icons/fa';

const AttendanceTable = ({
  employees,
  attendance,
  realTimeUpdates,
  selectedDate,
  onViewHistory,
  onViewMonthlySummary,
  onManualTimeIn,
  onManualTimeOut,
  onAssignRfid,
  onRemoveRfid
}) => {
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

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatHoursWorked = (hoursWorked, timeIn, timeOut) => {
    if (hoursWorked && hoursWorked !== '0h 0m') {
      return hoursWorked;
    }
    
    if (timeIn && timeOut) {
      const diff = new Date(timeOut) - new Date(timeIn);
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    
    return '-';
  };

  const formatRfidUid = (uid) => {
    if (!uid) return 'Not Assigned';
    return uid.toUpperCase();
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
        hoursWorked: realTimeUpdate.hoursWorked || '0h 0m 0s'
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
            isWorkDay: true,
            hoursWorked: '-'
          };
        }
      }
      
      return { 
        status: isWorkDay ? 'Pending' : 'No Work', 
        color: getStatusColor(isWorkDay ? 'Pending' : 'No Work'), 
        timeIn: '-', 
        timeOut: '-',
        isWorkDay,
        hoursWorked: '-'
      };
    }
    
    if (todayAttendance.timeIn && !todayAttendance.timeOut) {
      return { 
        status: todayAttendance.status === 'Late' ? 'Late' : 'Present', 
        color: getStatusColor(todayAttendance.status === 'Late' ? 'Late' : 'Present'), 
        timeIn: formatTime(todayAttendance.timeIn),
        timeOut: '-',
        isWorkDay: true,
        hoursWorked: '-'
      };
    }
    
    if (todayAttendance.timeOut) {
      return { 
        status: todayAttendance.status, 
        color: getStatusColor(todayAttendance.status), 
        timeIn: formatTime(todayAttendance.timeIn),
        timeOut: formatTime(todayAttendance.timeOut),
        isWorkDay: true,
        hoursWorked: formatHoursWorked(todayAttendance.hoursWorked, todayAttendance.timeIn, todayAttendance.timeOut)
      };
    }
    
    return { 
      status: todayAttendance.status, 
      color: getStatusColor(todayAttendance.status), 
      timeIn: '-', 
      timeOut: '-',
      isWorkDay: true,
      hoursWorked: '-'
    };
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
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Hours Worked</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map((employee) => {
              const attendanceStatus = getAttendanceStatus(employee);
              return (
                <tr key={employee._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{employee.employeeId}</div>
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
                      <span className="text-xs font-mono">{attendanceStatus.timeIn}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center">
                      <FaSignOutAlt className="mr-1 text-gray-400 text-xs" />
                      <span className="text-xs font-mono">{attendanceStatus.timeOut}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="text-xs font-mono text-center">
                      {attendanceStatus.hoursWorked}
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
                        onClick={() => onViewHistory(employee)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded bg-blue-50 text-xs transition-colors"
                        title="View Attendance History"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => onViewMonthlySummary(employee)}
                        className="text-purple-600 hover:text-purple-900 p-1 rounded bg-purple-50 text-xs transition-colors"
                        title="View Monthly Summary"
                      >
                        <FaChartBar />
                      </button>
                      <button
                        onClick={() => onManualTimeIn(employee)}
                        className="text-orange-600 hover:text-orange-900 p-1 rounded bg-orange-50 text-xs transition-colors"
                        title="Manual Time In"
                      >
                        <FaClock />
                      </button>
                      <button
                        onClick={() => onManualTimeOut(employee)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded bg-indigo-50 text-xs transition-colors"
                        title="Manual Time Out"
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
    </div>
  );
};

export default AttendanceTable;
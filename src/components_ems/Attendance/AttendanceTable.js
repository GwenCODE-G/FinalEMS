import React from 'react';
import { 
  FaClock, FaSignOutAlt, FaIdCard, 
  FaUserTimes, FaClock as FaClockIcon, FaHistory
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

  // FIXED: Use backend virtual fields or displayTimeIn/displayTimeOut if available
  const getAttendanceStatus = (employee) => {
    const employeeId = employee.employeeId;
    
    console.log('Checking attendance for:', employeeId, 'Date:', selectedDate);
    
    // Check for real-time updates first
    const realTimeUpdate = realTimeUpdates[employeeId];
    if (realTimeUpdate) {
      console.log('Real-time update found:', realTimeUpdate);
      return {
        status: realTimeUpdate.status,
        color: getStatusColor(realTimeUpdate.status),
        timeIn: realTimeUpdate.timeIn ? formatTime(realTimeUpdate.timeIn) : '-',
        timeOut: realTimeUpdate.timeOut ? formatTime(realTimeUpdate.timeOut) : '-',
        isWorkDay: true
      };
    }

    // Check existing attendance records
    const todayAttendance = Array.isArray(attendance) 
      ? attendance.find(a => {
          const matchesEmployee = a.employeeId === employeeId;
          const matchesDate = a.date === selectedDate;
          console.log(`Attendance check: ${employeeId} - Employee match: ${matchesEmployee}, Date match: ${matchesDate}`, a);
          return matchesEmployee && matchesDate;
        })
      : null;
    
    console.log('Today attendance record:', todayAttendance);
    
    if (todayAttendance) {
      // PRIORITY: Use backend-generated display fields (already formatted in PH time)
      // If not available, format from the date objects (which are already in PH time)
      const timeInDisplay = todayAttendance.displayTimeIn || 
                           formatTime(todayAttendance.timeIn);
      
      const timeOutDisplay = todayAttendance.displayTimeOut || 
                            formatTime(todayAttendance.timeOut);
      
      console.log('Display times - In:', timeInDisplay, 'Out:', timeOutDisplay);
      console.log('Raw times from backend - In:', todayAttendance.timeIn, 'Out:', todayAttendance.timeOut);
      
      return {
        status: todayAttendance.status || 'Present',
        color: getStatusColor(todayAttendance.status || 'Present'),
        timeIn: timeInDisplay,
        timeOut: timeOutDisplay,
        isWorkDay: true
      };
    }

    // No attendance record found
    console.log('No attendance record found for:', employeeId);
    const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });
    
    const isWorkDay = employee.workSchedule ? 
                     (employee.workSchedule[dayOfWeek]?.active || false) : 
                     ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(dayOfWeek);
    
    return { 
      status: isWorkDay ? 'Pending' : 'No Work', 
      color: getStatusColor(isWorkDay ? 'Pending' : 'No Work'), 
      timeIn: '-', 
      timeOut: '-',
      isWorkDay
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
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map((employee) => {
              const attendanceStatus = getAttendanceStatus(employee);
              
              console.log('Rendering employee:', employee.employeeId, 'Attendance:', attendanceStatus);

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
                        Shift completed
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${attendanceStatus.color}`}>
                      {attendanceStatus.status}
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
    </div>
  );
};

export default AttendanceTable;
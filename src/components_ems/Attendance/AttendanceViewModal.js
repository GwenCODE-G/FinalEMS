import React from 'react';
import { FaTimes, FaHistory } from 'react-icons/fa';

const AttendanceViewModal = ({
  isOpen,
  onClose,
  employee,
  employeeHistory,
  attendance
}) => {
  if (!isOpen) return null;

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const employeeRecords = employeeHistory[employee?.employeeId] || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-[#400504]">
            Attendance History - {employee?.firstName} {employee?.lastName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="text-lg font-bold text-green-600">
              {attendance.filter(a => a.employeeId === employee?.employeeId && a.timeIn).length}
            </div>
            <div className="text-green-800 text-xs">Total Present</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="text-lg font-bold text-blue-600">
              {attendance.filter(a => a.employeeId === employee?.employeeId && a.timeOut).length}
            </div>
            <div className="text-blue-800 text-xs">Completed Shifts</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="text-lg font-bold text-yellow-600">
              {attendance.filter(a => a.employeeId === employee?.employeeId && a.status === 'Late').length}
            </div>
            <div className="text-yellow-800 text-xs">Late Days</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="text-lg font-bold text-gray-600">
              {attendance.filter(a => a.employeeId === employee?.employeeId).length}
            </div>
            <div className="text-gray-800 text-xs">Total Records</div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {employeeRecords.length > 0 ? (
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
                {employeeRecords
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
            onClick={onClose}
            className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceViewModal;
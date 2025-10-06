import React from 'react';
import { FaTimes, FaClock, FaUserTimes, FaChartBar, FaExclamationTriangle, FaCalendar, FaUserClock } from 'react-icons/fa';

const SummaryModal = ({
  isOpen,
  onClose,
  monthlySummary,
  selectedMonth,
  selectedYear
}) => {
  if (!isOpen || !monthlySummary) return null;

  const formatTotalHours = (totalHours) => {
    if (typeof totalHours === 'string') return totalHours;
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  return (
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
            {monthlySummary.assignmentDate && (
              <p className="text-sm text-gray-500 mt-1">
                RFID Assigned: {new Date(monthlySummary.assignmentDate).toLocaleDateString()}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
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
            <div className="text-2xl font-bold text-blue-600">{formatTotalHours(monthlySummary.totalHours)}</div>
            <div className="text-blue-800 text-sm">Total Hours</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center border border-yellow-200">
            <FaExclamationTriangle className="text-2xl text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-600">{monthlySummary.lateDays}</div>
            <div className="text-yellow-800 text-sm">Late Days</div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h4 className="font-semibold mb-3 text-[#400504] flex items-center">
            <FaCalendar className="mr-2" />
            Summary Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="bg-white p-3 rounded border">
              <strong>Total Work Days:</strong> {monthlySummary.totalWorkDays}
            </div>
            <div className="bg-white p-3 rounded border">
              <strong>Attendance Rate:</strong> {monthlySummary.totalWorkDays > 0 ? 
                ((monthlySummary.presentDays / monthlySummary.totalWorkDays) * 100).toFixed(1) : 0}%
            </div>
            <div className="bg-white p-3 rounded border">
              <strong>Average Hours/Day:</strong> {formatTotalHours(monthlySummary.averageHours)}
            </div>
            <div className="bg-white p-3 rounded border">
              <strong>Work Days Missed:</strong> {monthlySummary.absentDays}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h4 className="font-semibold mb-3 text-[#400504] flex items-center">
            <FaUserClock className="mr-2" />
            Performance Metrics
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded border text-center">
              <div className="text-lg font-bold text-blue-600">
                {monthlySummary.metrics?.attendanceRate || 0}%
              </div>
              <div className="text-blue-800">Attendance Rate</div>
            </div>
            <div className="bg-white p-3 rounded border text-center">
              <div className="text-lg font-bold text-green-600">
                {monthlySummary.metrics?.efficiency || 0}%
              </div>
              <div className="text-green-800">Work Efficiency</div>
            </div>
            <div className="bg-white p-3 rounded border text-center">
              <div className="text-lg font-bold text-purple-600">
                {monthlySummary.metrics?.hoursUtilization || 0}%
              </div>
              <div className="text-purple-800">Hours Utilization</div>
            </div>
          </div>
        </div>

        {monthlySummary.period && (
          <div className="bg-yellow-50 p-4 rounded-lg mb-6">
            <h4 className="font-semibold mb-2 text-[#400504]">Period Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Start Date:</strong> {monthlySummary.period.startDate ? 
                  new Date(monthlySummary.period.startDate).toLocaleDateString() : 'N/A'}
              </div>
              <div>
                <strong>End Date:</strong> {monthlySummary.period.endDate ? 
                  new Date(monthlySummary.period.endDate).toLocaleDateString() : 'N/A'}
              </div>
              <div>
                <strong>Calendar Days:</strong> {monthlySummary.period.totalCalendarDays}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303]"
          >
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
import React, { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaClock, FaUserTimes, FaChartBar, FaExclamationTriangle, FaCalendar, FaUserClock, FaHistory } from 'react-icons/fa';
import axios from 'axios';

const SummaryModal = ({
  isOpen,
  onClose,
  monthlySummary,
  employeeHistory
}) => {
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [realTimeSummary, setRealTimeSummary] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' or 'details'

  // Fetch real-time summary data
  const fetchRealTimeSummary = useCallback(async () => {
    if (!monthlySummary || !apiBaseUrl) return;

    setLoading(true);
    try {
      const response = await axios.get(
        `${apiBaseUrl}/api/attendance/summary/realtime/${monthlySummary.employee.employeeId}`,
        { timeout: 10000 }
      );
      
      if (response.data.success) {
        setRealTimeSummary(response.data.data);
        console.log('Real-time summary loaded:', response.data.data);
      }
    } catch (error) {
      console.error('Error fetching real-time summary:', error);
      // Fallback to monthly summary if real-time fails
      setRealTimeSummary(monthlySummary);
    } finally {
      setLoading(false);
    }
  }, [monthlySummary, apiBaseUrl]);

  const fetchAttendanceHistory = useCallback(async () => {
    if (!monthlySummary || !apiBaseUrl) return;

    setLoading(true);
    try {
      // Use employment date as start date
      const employmentDate = new Date(monthlySummary.employmentDate || monthlySummary.employee.dateEmployed);
      const startDate = employmentDate;
      const endDate = new Date();
      
      console.log('Fetching attendance history from employment:', startDate);
      
      const response = await axios.get(
        `${apiBaseUrl}/api/attendance/employee/${monthlySummary.employee.employeeId}?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&limit=1000`,
        { timeout: 10000 }
      );
      
      if (response.data.success) {
        setAttendanceHistory(response.data.data || []);
      } else {
        setAttendanceHistory([]);
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      setAttendanceHistory([]);
    } finally {
      setLoading(false);
    }
  }, [monthlySummary, apiBaseUrl]);

  const fetchAssignmentHistory = useCallback(async () => {
    if (!monthlySummary || !apiBaseUrl) return;

    try {
      // Use the assignment history endpoint which considers employment date
      const response = await axios.get(
        `${apiBaseUrl}/api/rfid/assignment-history/${monthlySummary.employee.employeeId}`,
        { timeout: 10000 }
      );
      
      if (response.data.success && response.data.data.recentAttendance) {
        setAttendanceHistory(response.data.data.recentAttendance);
        
        // Calculate real-time stats from assignment history
        const employmentInfo = response.data.data.employmentInfo;
        if (employmentInfo) {
          setRealTimeSummary({
            presentDays: employmentInfo.presentDays,
            absentDays: employmentInfo.absentDays,
            totalWorkDays: employmentInfo.totalWorkDays,
            totalHours: 0, // Will be calculated from attendance records
            totalMinutes: 0,
            lateDays: 0,
            averageHours: 0,
            employmentDate: monthlySummary.employmentDate || monthlySummary.employee.dateEmployed,
            employee: monthlySummary.employee,
            metrics: {
              attendanceRate: employmentInfo.totalWorkDays > 0 ? 
                Math.round((employmentInfo.presentDays / employmentInfo.totalWorkDays) * 100 * 10) / 10 : 0
            }
          });
        }
      }
    } catch (error) {
      console.error('Error fetching assignment history:', error);
      // Fallback to regular endpoints
      fetchRealTimeSummary();
      fetchAttendanceHistory();
    }
  }, [monthlySummary, apiBaseUrl, fetchRealTimeSummary, fetchAttendanceHistory]);

  useEffect(() => {
    const findWorkingBackend = async () => {
      const PORTS_TO_TRY = [5000, 5001, 3001, 3000, 8080];
      
      for (let port of PORTS_TO_TRY) {
        try {
          await axios.get(`http://localhost:${port}/api/test`, { timeout: 5000 });
          setApiBaseUrl(`http://localhost:${port}`);
          break;
        } catch (error) {
          continue;
        }
      }
    };
    
    findWorkingBackend();
  }, []);

  useEffect(() => {
    if (isOpen && monthlySummary && apiBaseUrl) {
      fetchAssignmentHistory();
      // Refresh data every 30 seconds for real-time updates
      const interval = setInterval(() => {
        setRefreshCount(prev => prev + 1);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isOpen, monthlySummary, apiBaseUrl, fetchAssignmentHistory]);

  useEffect(() => {
    if (isOpen && monthlySummary && apiBaseUrl && refreshCount > 0) {
      fetchAssignmentHistory();
    }
  }, [refreshCount, isOpen, monthlySummary, apiBaseUrl, fetchAssignmentHistory]);

  const formatTotalHours = (totalHours) => {
    if (typeof totalHours === 'string') return totalHours;
    if (!totalHours) return '0h 0m';
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  // FIXED: No timezone conversion - times are already in PH timezone
  const formatTime = (timeString) => {
    if (!timeString) return '-';
    try {
      const date = new Date(timeString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      // FIXED: Date is already in PH timezone, just format it
      return date.toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting time:', error);
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

  const getFilteredHistory = () => {
    if (!selectedHistoryDate) return attendanceHistory;
    return attendanceHistory.filter(record => record.date === selectedHistoryDate);
  };

  const getAvailableDates = () => {
    const dates = [...new Set(attendanceHistory.map(record => record.date))].sort().reverse();
    return dates;
  };

  const getEmploymentPeriodText = () => {
    if (!monthlySummary) return '';
    
    const employmentDate = new Date(monthlySummary.employmentDate || monthlySummary.employee.dateEmployed);
    return `${formatDate(employmentDate)} - Present`;
  };

  const getAttendanceStats = () => {
    const filteredHistory = getFilteredHistory();
    const totalRecords = filteredHistory.length;
    const presentDays = filteredHistory.filter(record => record.timeIn).length;
    const completedShifts = filteredHistory.filter(record => record.timeOut).length;
    const lateDays = filteredHistory.filter(record => record.status === 'Late').length;
    
    return {
      totalRecords,
      presentDays,
      completedShifts,
      lateDays,
      completionRate: presentDays > 0 ? Math.round((completedShifts / presentDays) * 100) : 0
    };
  };

  // Calculate total hours from attendance history
  const calculateTotalHours = () => {
    const totalMinutes = attendanceHistory.reduce((sum, record) => sum + (record.totalMinutes || 0), 0);
    return totalMinutes / 60;
  };

  // Use real-time summary if available, otherwise fallback to monthly summary
  const summaryData = realTimeSummary || monthlySummary;

  if (!isOpen || !summaryData) return null;

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const stats = getAttendanceStats();

  // Calculate absent days manually if needed
  const calculatedAbsentDays = summaryData.totalWorkDays - summaryData.presentDays;
  const displayAbsentDays = summaryData.absentDays >= 0 ? summaryData.absentDays : Math.max(0, calculatedAbsentDays);

  // Calculate actual total hours (use calculated if available)
  const actualTotalHours = summaryData.totalHours > 0 ? summaryData.totalHours : calculateTotalHours();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-[#400504]">
              History of Attendance - {summaryData.employee.name}
            </h3>
            <p className="text-gray-600">
              {summaryData.period?.monthName || `${currentMonth}/${currentYear}`} • 
              {summaryData.employee.department} • {summaryData.employee.position}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Date Employed: {formatDate(summaryData.employee.dateEmployed)} • 
              Employee ID: {summaryData.employee.employeeId}
            </p>
            {summaryData.employmentDate && (
              <p className="text-sm text-blue-600 mt-1">
                Calculations based on employment date: {formatDate(summaryData.employmentDate)}
              </p>
            )}
            <p className="text-xs text-green-600 mt-1">
              Last updated: {new Date().toLocaleTimeString()}
              {realTimeSummary && <span> • Real-time Data</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            <FaTimes />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'summary' 
                ? 'border-b-2 border-[#400504] text-[#400504]' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('summary')}
          >
            <FaChartBar className="inline mr-2" />
            Summary Overview
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'details' 
                ? 'border-b-2 border-[#400504] text-[#400504]' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('details')}
          >
            <FaHistory className="inline mr-2" />
            Detailed Records
          </button>
        </div>
        
        {activeTab === 'summary' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-100 p-4 rounded-lg text-center border border-green-200">
                <FaClock className="text-2xl text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{summaryData.presentDays}</div>
                <div className="text-green-800 text-sm">Present Days</div>
                <div className="text-xs text-green-600 mt-1">
                  Since employment
                </div>
              </div>
              <div className="bg-red-100 p-4 rounded-lg text-center border border-red-200">
                <FaUserTimes className="text-2xl text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">{displayAbsentDays}</div>
                <div className="text-red-800 text-sm">Absent Days</div>
                <div className="text-xs text-red-600 mt-1">
                  {summaryData.totalWorkDays} total work days
                </div>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg text-center border border-blue-200">
                <FaChartBar className="text-2xl text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{formatTotalHours(actualTotalHours)}</div>
                <div className="text-blue-800 text-sm">Total Hours</div>
                <div className="text-xs text-blue-600 mt-1">
                  {summaryData.totalMinutes || 0} total minutes
                </div>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg text-center border border-yellow-200">
                <FaExclamationTriangle className="text-2xl text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600">{summaryData.lateDays}</div>
                <div className="text-yellow-800 text-sm">Late Days</div>
                <div className="text-xs text-yellow-600 mt-1">
                  {((summaryData.lateDays / summaryData.presentDays) * 100 || 0).toFixed(1)}% of present days
                </div>
              </div>
            </div>

            {/* Summary Information */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold mb-3 text-[#400504] flex items-center">
                <FaCalendar className="mr-2" />
                Summary Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="bg-white p-3 rounded border">
                  <strong>Total Work Days:</strong> {summaryData.totalWorkDays}
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Attendance Rate:</strong> {summaryData.totalWorkDays > 0 ? 
                    ((summaryData.presentDays / summaryData.totalWorkDays) * 100).toFixed(1) : 0}%
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Average Hours/Day:</strong> {formatTotalHours(summaryData.averageHours)}
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Work Days Missed:</strong> {displayAbsentDays}
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Employment Date:</strong> {formatDate(summaryData.employmentDate || summaryData.employee.dateEmployed)}
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Actual Work Days:</strong> {summaryData.actualWorkDays || summaryData.totalWorkDays}
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold mb-3 text-[#400504] flex items-center">
                <FaUserClock className="mr-2" />
                Performance Metrics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="bg-white p-3 rounded border text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {summaryData.metrics?.attendanceRate || (summaryData.totalWorkDays > 0 ? 
                      Math.round((summaryData.presentDays / summaryData.totalWorkDays) * 100 * 10) / 10 : 0)}%
                  </div>
                  <div className="text-blue-800">Attendance Rate</div>
                </div>
                <div className="bg-white p-3 rounded border text-center">
                  <div className="text-lg font-bold text-green-600">
                    {summaryData.metrics?.efficiency || 0}%
                  </div>
                  <div className="text-green-800">Work Efficiency</div>
                </div>
                <div className="bg-white p-3 rounded border text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {summaryData.metrics?.hoursUtilization || 0}%
                  </div>
                  <div className="text-purple-800">Hours Utilization</div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'details' && (
          <div className="bg-yellow-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-[#400504] flex items-center">
                <FaHistory className="mr-2" />
                Attendance History ({getEmploymentPeriodText()})
              </h4>
              {loading && (
                <div className="text-sm text-blue-600">Loading...</div>
              )}
            </div>
            
            {/* Filter and Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Date
                </label>
                <select
                  value={selectedHistoryDate}
                  onChange={(e) => setSelectedHistoryDate(e.target.value)}
                  className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm"
                >
                  <option value="">All Dates ({attendanceHistory.length} records)</option>
                  {getAvailableDates().map(date => (
                    <option key={date} value={date}>
                      {formatDate(date)}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedHistoryDate && (
                <div className="bg-white p-3 rounded border text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>Records: <strong>{stats.totalRecords}</strong></div>
                    <div>Present: <strong>{stats.presentDays}</strong></div>
                    <div>Completed: <strong>{stats.completedShifts}</strong></div>
                    <div>Late: <strong>{stats.lateDays}</strong></div>
                  </div>
                </div>
              )}
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto bg-white rounded-lg">
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
                  {getFilteredHistory().length > 0 ? (
                    getFilteredHistory()
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map((record) => (
                        <tr key={record._id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2 text-sm">
                            {formatDate(record.date)}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {record.displayTimeIn || formatTime(record.timeIn)}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {record.displayTimeOut || formatTime(record.timeOut)}
                          </td>
                          <td className="px-4 py-2 text-sm text-center">{record.hoursWorked || '-'}</td>
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
                      ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-4 py-4 text-center text-gray-500">
                        {loading ? 'Loading attendance records...' : 'No attendance records found for the selected period.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Table Footer */}
            <div className="mt-3 text-sm text-gray-600 flex justify-between items-center">
              <div>
                Showing {getFilteredHistory().length} of {attendanceHistory.length} total records
                {selectedHistoryDate && ` for ${formatDate(selectedHistoryDate)}`}
              </div>
              {stats.completionRate > 0 && (
                <div className="text-blue-600">
                  Shift Completion: {stats.completionRate}%
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] transition-colors"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
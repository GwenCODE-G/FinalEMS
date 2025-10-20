import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaTimes, FaClock, FaUserTimes, FaChartBar, FaExclamationTriangle, 
  FaCalendar, FaUserClock, FaHistory, FaCheck, FaTimes as FaTimesIcon 
} from 'react-icons/fa';
import axios from 'axios';

const SummaryModal = ({
  isOpen,
  onClose,
  monthlySummary,
  employeeHistory
}) => {
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [allWorkDays, setAllWorkDays] = useState([]);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [realTimeSummary, setRealTimeSummary] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'details', 'calendar'

  // Calculate all work days from employment date to today
  const calculateAllWorkDays = useCallback((employmentDate) => {
    if (!employmentDate) return [];
    
    const startDate = new Date(employmentDate);
    const endDate = new Date();
    const workDays = [];
    
    // Reset times for proper date comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      // Only count weekdays (Monday to Friday)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workDays.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workDays;
  }, []);

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

  // Fetch complete attendance history
  const fetchAttendanceHistory = useCallback(async () => {
    if (!monthlySummary || !apiBaseUrl) return;

    setLoading(true);
    try {
      // Use employment date as start date
      const employmentDate = new Date(monthlySummary.employmentDate || monthlySummary.employee.dateEmployed);
      const startDate = employmentDate;
      const endDate = new Date();
      
      console.log('Fetching complete attendance history from employment:', startDate);
      
      const response = await axios.get(
        `${apiBaseUrl}/api/attendance/employee/${monthlySummary.employee.employeeId}?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&limit=2000`,
        { timeout: 15000 }
      );
      
      if (response.data.success) {
        const history = response.data.data || [];
        setAttendanceHistory(history);
        
        // Calculate all work days
        const workDays = calculateAllWorkDays(employmentDate);
        setAllWorkDays(workDays);
        
        console.log('Complete history loaded:', history.length, 'records');
        console.log('Total work days calculated:', workDays.length);
      } else {
        setAttendanceHistory([]);
        setAllWorkDays([]);
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      setAttendanceHistory([]);
      setAllWorkDays([]);
    } finally {
      setLoading(false);
    }
  }, [monthlySummary, apiBaseUrl, calculateAllWorkDays]);

  // Enhanced data fetching
  const fetchCompleteData = useCallback(async () => {
    if (!monthlySummary || !apiBaseUrl) return;

    try {
      await Promise.all([
        fetchRealTimeSummary(),
        fetchAttendanceHistory()
      ]);
    } catch (error) {
      console.error('Error fetching complete data:', error);
    }
  }, [monthlySummary, apiBaseUrl, fetchRealTimeSummary, fetchAttendanceHistory]);

  // Find working backend
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

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen && monthlySummary && apiBaseUrl) {
      fetchCompleteData();
      
      // Refresh data every 30 seconds for real-time updates
      const interval = setInterval(() => {
        setRefreshCount(prev => prev + 1);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isOpen, monthlySummary, apiBaseUrl, fetchCompleteData]);

  // Refresh data periodically
  useEffect(() => {
    if (isOpen && monthlySummary && apiBaseUrl && refreshCount > 0) {
      fetchCompleteData();
    }
  }, [refreshCount, isOpen, monthlySummary, apiBaseUrl, fetchCompleteData]);

  // Formatting functions
  const formatTotalHours = (totalHours) => {
    if (typeof totalHours === 'string') return totalHours;
    if (!totalHours) return '0h 0m';
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch (error) {
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

  const formatDateShort = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return '-';
    }
  };

  // Get attendance status for a specific date
  const getAttendanceForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return attendanceHistory.find(record => record.date === dateStr);
  };

  // Calculate comprehensive statistics
  const getComprehensiveStats = () => {
    const presentDays = attendanceHistory.filter(record => record.timeIn).length;
    const completedShifts = attendanceHistory.filter(record => record.timeOut).length;
    const lateDays = attendanceHistory.filter(record => record.status === 'Late').length;
    const totalWorkDays = allWorkDays.length;
    const absentDays = Math.max(0, totalWorkDays - presentDays);
    
    // Calculate total hours from actual attendance records
    const totalMinutes = attendanceHistory.reduce((sum, record) => sum + (record.totalMinutes || 0), 0);
    const totalHours = totalMinutes / 60;
    const averageHours = presentDays > 0 ? totalHours / presentDays : 0;
    
    const attendanceRate = totalWorkDays > 0 ? (presentDays / totalWorkDays) * 100 : 0;
    
    return {
      presentDays,
      absentDays,
      totalWorkDays,
      completedShifts,
      lateDays,
      totalHours,
      totalMinutes,
      averageHours,
      attendanceRate,
      completionRate: presentDays > 0 ? (completedShifts / presentDays) * 100 : 0
    };
  };

  // Get filtered history for details tab
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

  // Use real-time summary if available, otherwise fallback to monthly summary
  const summaryData = realTimeSummary || monthlySummary;
  const stats = getComprehensiveStats();

  if (!isOpen || !summaryData) return null;

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-[#400504]">
              Complete Attendance History - {summaryData.employee.name}
            </h3>
            <p className="text-gray-600">
              {summaryData.period?.monthName || `${currentMonth}/${currentYear}`} • 
              {summaryData.employee.department} • {summaryData.employee.position}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Date Employed: {formatDate(summaryData.employee.dateEmployed)} • 
              Employee ID: {summaryData.employee.employeeId}
            </p>
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
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'calendar' 
                ? 'border-b-2 border-[#400504] text-[#400504]' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('calendar')}
          >
            <FaCalendar className="inline mr-2" />
            Attendance Calendar
          </button>
        </div>
        
        {activeTab === 'summary' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-100 p-4 rounded-lg text-center border border-green-200">
                <FaCheck className="text-2xl text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{stats.presentDays}</div>
                <div className="text-green-800 text-sm">Present Days</div>
                <div className="text-xs text-green-600 mt-1">
                  of {stats.totalWorkDays} work days
                </div>
              </div>
              <div className="bg-red-100 p-4 rounded-lg text-center border border-red-200">
                <FaTimesIcon className="text-2xl text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">{stats.absentDays}</div>
                <div className="text-red-800 text-sm">Absent Days</div>
                <div className="text-xs text-red-600 mt-1">
                  {stats.totalWorkDays > 0 ? ((stats.absentDays / stats.totalWorkDays) * 100).toFixed(1) : 0}% of work days
                </div>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg text-center border border-blue-200">
                <FaClock className="text-2xl text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{formatTotalHours(stats.totalHours)}</div>
                <div className="text-blue-800 text-sm">Total Hours</div>
                <div className="text-xs text-blue-600 mt-1">
                  {stats.completedShifts} completed shifts
                </div>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg text-center border border-yellow-200">
                <FaExclamationTriangle className="text-2xl text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600">{stats.lateDays}</div>
                <div className="text-yellow-800 text-sm">Late Days</div>
                <div className="text-xs text-yellow-600 mt-1">
                  {stats.presentDays > 0 ? ((stats.lateDays / stats.presentDays) * 100).toFixed(1) : 0}% of present days
                </div>
              </div>
            </div>

            {/* Comprehensive Summary Information */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold mb-3 text-[#400504] flex items-center">
                <FaCalendar className="mr-2" />
                Comprehensive Summary
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="bg-white p-3 rounded border">
                  <strong>Total Work Days:</strong> {stats.totalWorkDays}
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Present Days:</strong> {stats.presentDays}
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Absent Days:</strong> {stats.absentDays}
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Attendance Rate:</strong> {stats.attendanceRate.toFixed(1)}%
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Completed Shifts:</strong> {stats.completedShifts}
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Shift Completion:</strong> {stats.completionRate.toFixed(1)}%
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Average Hours/Day:</strong> {formatTotalHours(stats.averageHours)}
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Total Hours Worked:</strong> {formatTotalHours(stats.totalHours)}
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3 text-[#400504] flex items-center">
                <FaUserClock className="mr-2" />
                Performance Metrics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="bg-white p-3 rounded border text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {stats.attendanceRate.toFixed(1)}%
                  </div>
                  <div className="text-blue-800">Attendance Rate</div>
                </div>
                <div className="bg-white p-3 rounded border text-center">
                  <div className="text-lg font-bold text-green-600">
                    {stats.completionRate.toFixed(1)}%
                  </div>
                  <div className="text-green-800">Shift Completion</div>
                </div>
                <div className="bg-white p-3 rounded border text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {stats.presentDays > 0 ? ((stats.lateDays / stats.presentDays) * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-purple-800">Late Frequency</div>
                </div>
                <div className="bg-white p-3 rounded border text-center">
                  <div className="text-lg font-bold text-orange-600">
                    {formatTotalHours(stats.averageHours)}
                  </div>
                  <div className="text-orange-800">Avg Hours/Day</div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'details' && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-[#400504] flex items-center">
                <FaHistory className="mr-2" />
                Detailed Attendance Records ({getEmploymentPeriodText()})
              </h4>
              {loading && (
                <div className="text-sm text-blue-600 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Loading...
                </div>
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
              
              <div className="bg-white p-3 rounded border text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>Total: <strong>{attendanceHistory.length}</strong></div>
                  <div>Present: <strong>{stats.presentDays}</strong></div>
                  <div>Absent: <strong>{stats.absentDays}</strong></div>
                  <div>Work Days: <strong>{stats.totalWorkDays}</strong></div>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full table-auto bg-white rounded-lg">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium">Day</th>
                    <th className="px-4 py-2 text-left text-xs font-medium">Time In</th>
                    <th className="px-4 py-2 text-left text-xs font-medium">Time Out</th>
                    <th className="px-4 py-2 text-left text-xs font-medium">Hours</th>
                    <th className="px-4 py-2 text-left text-xs font-medium">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium">Late</th>
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
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
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
                      <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                        {loading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#400504] mr-2"></div>
                            Loading attendance records...
                          </div>
                        ) : (
                          'No attendance records found for the selected period.'
                        )}
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
              <div className="text-blue-600">
                Records from: {getEmploymentPeriodText()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-[#400504] flex items-center">
                <FaCalendar className="mr-2" />
                Attendance Calendar View ({stats.totalWorkDays} Work Days)
              </h4>
              {loading && (
                <div className="text-sm text-blue-600">Loading calendar...</div>
              )}
            </div>
            
            {/* Calendar Legend */}
            <div className="flex flex-wrap gap-4 mb-4 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                <span>Present</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                <span>Absent</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
                <span>Late</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                <span>Completed</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-300 rounded mr-1"></div>
                <span>Weekend/Holiday</span>
              </div>
            </div>

            {/* Calendar View */}
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full table-auto bg-white rounded-lg">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Day</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Time In</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Time Out</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {allWorkDays.length > 0 ? (
                    allWorkDays
                      .sort((a, b) => b - a) // Most recent first
                      .map((workDay) => {
                        const dateStr = workDay.toISOString().split('T')[0];
                        const attendance = getAttendanceForDate(workDay);
                        const isWeekend = workDay.getDay() === 0 || workDay.getDay() === 6;
                        
                        let status = 'Absent';
                        let statusColor = 'bg-red-100 text-red-800';
                        let timeIn = '-';
                        let timeOut = '-';
                        let hours = '-';
                        
                        if (attendance) {
                          if (attendance.status === 'Completed') {
                            status = 'Completed';
                            statusColor = 'bg-blue-100 text-blue-800';
                          } else if (attendance.status === 'Late') {
                            status = 'Late';
                            statusColor = 'bg-yellow-100 text-yellow-800';
                          } else if (attendance.status === 'Present') {
                            status = 'Present';
                            statusColor = 'bg-green-100 text-green-800';
                          }
                          
                          timeIn = attendance.displayTimeIn || formatTime(attendance.timeIn);
                          timeOut = attendance.displayTimeOut || formatTime(attendance.timeOut);
                          hours = attendance.hoursWorked || '-';
                        }
                        
                        if (isWeekend) {
                          status = 'Weekend';
                          statusColor = 'bg-gray-100 text-gray-800';
                        }
                        
                        return (
                          <tr key={dateStr} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2 text-sm">{formatDateShort(dateStr)}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {workDay.toLocaleDateString('en-US', { weekday: 'short' })}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${statusColor}`}>
                                {status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm">{timeIn}</td>
                            <td className="px-3 py-2 text-sm">{timeOut}</td>
                            <td className="px-3 py-2 text-sm text-center">{hours}</td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        {loading ? 'Loading calendar data...' : 'No work days calculated.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Calendar Summary */}
            <div className="mt-3 text-sm text-gray-600 flex justify-between items-center">
              <div>
                Showing {allWorkDays.length} work days • 
                Present: {stats.presentDays} • 
                Absent: {stats.absentDays} • 
                Rate: {stats.attendanceRate.toFixed(1)}%
              </div>
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
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaTimes, FaClock, FaChartBar, FaExclamationTriangle, 
  FaCalendar, FaCheck, FaTimes as FaTimesIcon 
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
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [realTimeSummary, setRealTimeSummary] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [activeTab, setActiveTab] = useState('summary');
  const [employeeLeaves, setEmployeeLeaves] = useState([]);

  const calculateAllWorkDays = useCallback((employmentDate) => {
    if (!employmentDate) return [];
    
    const startDate = new Date(employmentDate);
    const endDate = new Date();
    const workDays = [];
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workDays.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workDays;
  }, []);

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
      }
    } catch (error) {
      setRealTimeSummary(monthlySummary);
    } finally {
      setLoading(false);
    }
  }, [monthlySummary, apiBaseUrl]);

  const fetchAttendanceHistory = useCallback(async () => {
    if (!monthlySummary || !apiBaseUrl) return;

    setLoading(true);
    try {
      const employmentDate = new Date(monthlySummary.employmentDate || monthlySummary.employee.dateEmployed);
      const startDate = employmentDate;
      const endDate = new Date();
      
      const response = await axios.get(
        `${apiBaseUrl}/api/attendance/employee/${monthlySummary.employee.employeeId}?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&limit=2000`,
        { timeout: 15000 }
      );
      
      if (response.data.success) {
        const history = response.data.data || [];
        setAttendanceHistory(history);
        
        const workDays = calculateAllWorkDays(employmentDate);
        setAllWorkDays(workDays);
      } else {
        setAttendanceHistory([]);
        setAllWorkDays([]);
      }
    } catch (error) {
      setAttendanceHistory([]);
      setAllWorkDays([]);
    } finally {
      setLoading(false);
    }
  }, [monthlySummary, apiBaseUrl, calculateAllWorkDays]);

  const fetchEmployeeLeaves = useCallback(async () => {
    if (!monthlySummary || !apiBaseUrl) return;

    try {
      const response = await axios.get(
        `${apiBaseUrl}/api/attendance/leaves/${monthlySummary.employee.employeeId}`,
        { timeout: 10000 }
      );
      
      if (response.data.success) {
        setEmployeeLeaves(response.data.data || []);
      }
    } catch (error) {
      setEmployeeLeaves([]);
    }
  }, [monthlySummary, apiBaseUrl]);

  const fetchCompleteData = useCallback(async () => {
    if (!monthlySummary || !apiBaseUrl) return;

    try {
      await Promise.all([
        fetchRealTimeSummary(),
        fetchAttendanceHistory(),
        fetchEmployeeLeaves()
      ]);
    } catch (error) {
      console.error('Error fetching complete data:', error);
    }
  }, [monthlySummary, apiBaseUrl, fetchRealTimeSummary, fetchAttendanceHistory, fetchEmployeeLeaves]);

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
      fetchCompleteData();
      
      const interval = setInterval(() => {
        setRefreshCount(prev => prev + 1);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isOpen, monthlySummary, apiBaseUrl, fetchCompleteData]);

  useEffect(() => {
    if (isOpen && monthlySummary && apiBaseUrl && refreshCount > 0) {
      fetchCompleteData();
    }
  }, [refreshCount, isOpen, monthlySummary, apiBaseUrl, fetchCompleteData]);

  const formatTotalHours = (totalHours) => {
    if (typeof totalHours === 'string') return totalHours;
    if (!totalHours) return '0h 0m';
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Pending';
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return 'Pending';
      return date.toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch (error) {
      return 'Pending';
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
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return '-';
    }
  };

  const isOnLeave = (date) => {
    const checkDate = new Date(date);
    return employeeLeaves.some(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  const getAttendanceForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return attendanceHistory.find(record => record.date === dateStr);
  };

  const getComprehensiveStats = () => {
    const presentDays = attendanceHistory.filter(record => 
      record.timeIn && record.status !== 'No Work' && !isOnLeave(record.date)
    ).length;
    
    const lateDays = attendanceHistory.filter(record => 
      record.status === 'Late' && !isOnLeave(record.date)
    ).length;
    
    const noWorkDays = attendanceHistory.filter(record => 
      record.status === 'No Work'
    ).length;
    
    const leaveDays = employeeLeaves.reduce((total, leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      let days = 0;
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        if (date <= new Date()) days++;
      }
      return total + days;
    }, 0);
    
    const totalWorkDays = allWorkDays.length;
    const absentDays = Math.max(0, totalWorkDays - presentDays - noWorkDays - leaveDays);
    
    const totalMinutes = attendanceHistory.reduce((sum, record) => {
      if (record.status === 'No Work' || isOnLeave(record.date)) return sum;
      return sum + (record.totalMinutes || 0);
    }, 0);
    
    const totalHours = totalMinutes / 60;
    
    return {
      presentDays,
      absentDays,
      noWorkDays,
      leaveDays,
      totalWorkDays,
      lateDays,
      totalHours,
      totalMinutes
    };
  };

  const getEmploymentPeriodText = () => {
    if (!monthlySummary) return '';
    const employmentDate = new Date(monthlySummary.employmentDate || monthlySummary.employee.dateEmployed);
    return `${formatDate(employmentDate)} - Present`;
  };

  const calculateLateMinutes = (attendanceRecord, employee) => {
    if (!attendanceRecord || !attendanceRecord.timeIn || !employee || !employee.workSchedule) return 0;
    
    try {
      const timeIn = new Date(attendanceRecord.timeIn);
      const dayOfWeek = timeIn.toLocaleDateString('en-US', { weekday: 'long' });
      const schedule = employee.workSchedule[dayOfWeek];
      
      if (!schedule || !schedule.active || !schedule.start) return 0;
      
      const [scheduledHour, scheduledMinute] = schedule.start.split(':').map(Number);
      const scheduledTime = new Date(timeIn);
      scheduledTime.setHours(scheduledHour, scheduledMinute, 0, 0);
      
      if (timeIn > scheduledTime) {
        return Math.floor((timeIn - scheduledTime) / (1000 * 60));
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  };

  const calculateOvertimeMinutes = (attendanceRecord, employee) => {
    if (!attendanceRecord || !attendanceRecord.timeOut || !employee || !employee.workSchedule) return 0;
    
    try {
      const timeOut = new Date(attendanceRecord.timeOut);
      const dayOfWeek = timeOut.toLocaleDateString('en-US', { weekday: 'long' });
      const schedule = employee.workSchedule[dayOfWeek];
      
      if (!schedule || !schedule.active || !schedule.end) return 0;
      
      const [scheduledHour, scheduledMinute] = schedule.end.split(':').map(Number);
      const scheduledEndTime = new Date(timeOut);
      scheduledEndTime.setHours(scheduledHour, scheduledMinute, 0, 0);
      
      if (timeOut > scheduledEndTime) {
        return Math.floor((timeOut - scheduledEndTime) / (1000 * 60));
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  };

  const formatLateTime = (minutes) => {
    if (minutes === 0) return 'No Late';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = 0;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatOvertimeTime = (minutes) => {
    if (minutes === 0) return 'No Overtime';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = 0;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHoursWorked = (attendanceRecord) => {
    if (!attendanceRecord || !attendanceRecord.timeIn || !attendanceRecord.timeOut) {
      return 'Pending';
    }
    
    if (attendanceRecord.hoursWorked && attendanceRecord.hoursWorked !== '0h 0m') {
      const [hours, minutes] = attendanceRecord.hoursWorked.split('h ');
      const mins = minutes.replace('m', '');
      return `${hours.padStart(2, '0')}:${mins.padStart(2, '0')}:00`;
    }
    
    if (attendanceRecord.totalMinutes) {
      const hours = Math.floor(attendanceRecord.totalMinutes / 60);
      const minutes = attendanceRecord.totalMinutes % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    }
    
    return 'Pending';
  };

  const getDayStatus = (workDay, attendance, isLeaveDay, isNoWorkDay) => {
    const today = new Date();
    const isToday = workDay.toDateString() === today.toDateString();
    const isPastDay = workDay < today;
    const isFutureDay = workDay > today;
    
    if (isLeaveDay) {
      return {
        timeIn: 'In_Leave',
        timeOut: 'In_Leave',
        status: 'In_Leave',
        late: 'In_Leave',
        overtime: 'In_Leave',
        hours: 'In_Leave',
        color: 'bg-red-100 text-red-800'
      };
    }
    
    if (isNoWorkDay) {
      return {
        timeIn: 'No Work Today',
        timeOut: 'No Work Today',
        status: 'No Work',
        late: 'No Work Today',
        overtime: 'No Work Today',
        hours: 'No Work Today',
        color: 'bg-gray-100 text-gray-800'
      };
    }
    
    if (attendance) {
      const lateMinutes = calculateLateMinutes(attendance, summaryData.employee);
      const overtimeMinutes = calculateOvertimeMinutes(attendance, summaryData.employee);
      
      let status = attendance.status;
      let color = 'bg-green-100 text-green-800';
      
      if (status === 'Late') {
        color = 'bg-yellow-100 text-yellow-800';
      } else if (status === 'Completed') {
        color = 'bg-blue-100 text-blue-800';
      } else if (status === 'Absent') {
        color = 'bg-red-100 text-red-800';
      }
      
      return {
        timeIn: attendance.timeIn ? formatTime(attendance.timeIn) : 'Pending',
        timeOut: attendance.timeOut ? formatTime(attendance.timeOut) : 'Pending',
        status: status,
        late: formatLateTime(lateMinutes),
        overtime: formatOvertimeTime(overtimeMinutes),
        hours: formatHoursWorked(attendance),
        color: color
      };
    }
    
    // No attendance record exists
    if (isFutureDay) {
      return {
        timeIn: 'Pending',
        timeOut: 'Pending',
        status: 'Pending',
        late: 'Pending',
        overtime: 'Pending',
        hours: 'Pending',
        color: 'bg-gray-100 text-gray-800'
      };
    }
    
    if (isToday) {
      const now = new Date();
      const endOfWorkDay = new Date(workDay);
      endOfWorkDay.setHours(17, 0, 0, 0); // 5:00 PM
      
      if (now > endOfWorkDay) {
        return {
          timeIn: 'Absent',
          timeOut: 'Absent',
          status: 'Absent',
          late: 'Absent',
          overtime: 'Absent',
          hours: 'Absent',
          color: 'bg-red-100 text-red-800'
        };
      } else {
        return {
          timeIn: 'Pending',
          timeOut: 'Pending',
          status: 'Pending',
          late: 'Pending',
          overtime: 'Pending',
          hours: 'Pending',
          color: 'bg-gray-100 text-gray-800'
        };
      }
    }
    
    // Past day with no attendance record
    if (isPastDay) {
      return {
        timeIn: 'Absent',
        timeOut: 'Absent',
        status: 'Absent',
        late: 'Absent',
        overtime: 'Absent',
        hours: 'Absent',
        color: 'bg-red-100 text-red-800'
      };
    }
    
    return {
      timeIn: 'Pending',
      timeOut: 'Pending',
      status: 'Pending',
      late: 'Pending',
      overtime: 'Pending',
      hours: 'Pending',
      color: 'bg-gray-100 text-gray-800'
    };
  };

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
                  {stats.presentDays} present days
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
                  <strong>No Work Days:</strong> {stats.noWorkDays}
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Leave Days:</strong> {stats.leaveDays}
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Late Days:</strong> {stats.lateDays}
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Total Hours:</strong> {formatTotalHours(stats.totalHours)}
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Attendance Rate:</strong> {stats.totalWorkDays > 0 ? ((stats.presentDays / stats.totalWorkDays) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </>
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
                <span>No Work</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-400 rounded mr-1"></div>
                <span>In Leave</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded mr-1"></div>
                <span>Pending</span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full table-auto bg-white rounded-lg">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Day</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Time In</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Time Out</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Late</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Overtime</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {allWorkDays.length > 0 ? (
                    allWorkDays
                      .sort((a, b) => b - a)
                      .map((workDay) => {
                        const dateStr = workDay.toISOString().split('T')[0];
                        const attendance = getAttendanceForDate(workDay);
                        const isLeaveDay = isOnLeave(dateStr);
                        const isNoWorkDay = attendance && attendance.status === 'No Work';
                        
                        const dayStatus = getDayStatus(workDay, attendance, isLeaveDay, isNoWorkDay);
                        
                        return (
                          <tr key={dateStr} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2 text-sm font-medium">
                              {formatDateShort(dateStr)}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {workDay.toLocaleDateString('en-US', { weekday: 'long' })}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              {dayStatus.timeIn}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              {dayStatus.timeOut}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${dayStatus.color}`}>
                                {dayStatus.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-center font-mono">
                              {dayStatus.late}
                            </td>
                            <td className="px-3 py-2 text-sm text-center font-mono">
                              {dayStatus.overtime}
                            </td>
                            <td className="px-3 py-2 text-sm text-center font-mono">
                              {dayStatus.hours}
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                        {loading ? 'Loading calendar data...' : 'No work days calculated.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-3 text-sm text-gray-600 flex justify-between items-center">
              <div>
                Showing {allWorkDays.length} work days • 
                Present: {stats.presentDays} • 
                Absent: {stats.absentDays} • 
                No Work: {stats.noWorkDays} • 
                In Leave: {stats.leaveDays}
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
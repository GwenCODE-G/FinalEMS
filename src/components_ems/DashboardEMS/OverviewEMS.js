import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaUsers, 
  FaUserCheck, 
  FaUserTimes, 
  FaIdCard, 
  FaChartBar,
  FaClock,
  FaBuilding,
  FaCalendarAlt,
  FaSync,
  FaSignInAlt,
  FaSignOutAlt,
  FaUserPlus,
  FaIdCard as FaRfid
} from 'react-icons/fa';

const OverviewEMS = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    departments: 0,
    rfidAssigned: 0,
    lateToday: 0,
    completedShifts: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('');

  // Function to find working backend URL
  const findWorkingBackend = async () => {
    const ports = [5000, 5001, 3001, 3000, 8080];
    
    for (let port of ports) {
      try {
        const response = await fetch(`http://localhost:${port}/api/test`, {
          method: 'GET',
        });
        if (response.ok) {
          console.log(`Backend found on port ${port}`);
          return `http://localhost:${port}`;
        }
      } catch (error) {
        console.log(`Port ${port} not available:`, error.message);
        continue;
      }
    }
    throw new Error('No backend server found. Please start the backend server.');
  };

  const fetchOverviewData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching overview data...');

      // Initialize API base URL if not set
      let baseUrl = apiBaseUrl;
      if (!baseUrl) {
        baseUrl = await findWorkingBackend();
        setApiBaseUrl(baseUrl);
      }

      // Fetch employees
      const employeesResponse = await fetch(`${baseUrl}/api/employees?status=Active&limit=1000`);
      if (!employeesResponse.ok) {
        throw new Error(`Failed to fetch employees: ${employeesResponse.status}`);
      }
      const employeesData = await employeesResponse.json();
      console.log('Employees API response:', employeesData);
      
      const employees = employeesData.success ? employeesData.data : [];
      console.log('Employees fetched:', employees.length);

      // Fetch today's attendance
      let todayAttendance = [];
      
      try {
        // Try RFID endpoint first
        const attendanceResponse = await fetch(`${baseUrl}/api/rfid/attendance/today/`);
        if (attendanceResponse.ok) {
          const attendanceData = await attendanceResponse.json();
          todayAttendance = attendanceData.success ? attendanceData.data : [];
        } else {
          // Fallback to attendance endpoint
          const fallbackResponse = await fetch(`${baseUrl}/api/attendance/today`);
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            todayAttendance = fallbackData.success ? fallbackData.data : [];
          }
        }
      } catch (attendanceError) {
        console.log('Attendance fetch failed, using empty array:', attendanceError);
      }
      
      console.log('Today attendance fetched:', todayAttendance.length);

      // Fetch departments
      let departments = [];
      try {
        const deptResponse = await fetch(`${baseUrl}/api/departments`);
        if (deptResponse.ok) {
          const deptData = await deptResponse.json();
          departments = deptData.success ? deptData.data : [];
        }
      } catch (deptError) {
        console.log('Departments fetch failed:', deptError);
      }
      console.log('Departments fetched:', departments.length);

      // Fetch recent RFID assignments (new employees with RFID)
      let recentAssignments = [];
      try {
        const assignmentsResponse = await fetch(`${baseUrl}/api/rfid/assigned`);
        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json();
          recentAssignments = assignmentsData.success ? assignmentsData.data : [];
          // Sort by assignment date, get recent ones
          recentAssignments = recentAssignments
            .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))
            .slice(0, 10);
        }
      } catch (assignmentError) {
        console.log('RFID assignments fetch failed:', assignmentError);
      }

      // Calculate RFID assigned from employees data
      const rfidAssigned = employees.filter(emp => emp.isRfidAssigned || emp.rfidUid).length;
      console.log('RFID assigned calculated:', rfidAssigned);

      // Calculate statistics
      const totalEmployees = employees.length;
      
      const presentToday = todayAttendance.filter(a => a.timeIn).length;
      const absentToday = Math.max(0, totalEmployees - presentToday);
      const completedShifts = todayAttendance.filter(a => a.timeOut).length;
      const lateToday = todayAttendance.filter(a => a.status === 'Late').length;
      
      console.log('Calculated stats:', {
        totalEmployees,
        presentToday,
        absentToday,
        departments: departments.length,
        rfidAssigned,
        lateToday,
        completedShifts
      });

      setStats({
        totalEmployees,
        presentToday,
        absentToday,
        departments: departments.length,
        rfidAssigned,
        lateToday,
        completedShifts
      });

      // Create comprehensive recent activity including time in/out and new employees
      const activityItems = [];

      // 1. Add attendance events (time in/out)
      todayAttendance.forEach(attendance => {
        if (attendance.timeIn) {
          activityItems.push({
            type: 'time_in',
            employeeName: attendance.employeeName,
            employeeId: attendance.employeeId,
            department: attendance.department,
            time: attendance.timeIn,
            status: attendance.status,
            isLate: attendance.status === 'Late',
            timestamp: new Date(attendance.timeIn)
          });
        }

        if (attendance.timeOut) {
          activityItems.push({
            type: 'time_out',
            employeeName: attendance.employeeName,
            employeeId: attendance.employeeId,
            department: attendance.department,
            time: attendance.timeOut,
            hoursWorked: attendance.hoursWorked,
            timestamp: new Date(attendance.timeOut)
          });
        }
      });

      // 2. Add recent RFID assignments (new employees with RFID)
      recentAssignments.forEach(assignment => {
        activityItems.push({
          type: 'rfid_assigned',
          employeeName: assignment.employeeName,
          employeeId: assignment.employeeId,
          department: assignment.department,
          rfidUid: assignment.uid,
          timestamp: new Date(assignment.assignedAt || assignment.createdAt)
        });
      });

      // 3. Add recently created employees (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const newEmployees = employees.filter(emp => 
        new Date(emp.createdAt) > oneDayAgo
      ).slice(0, 5);

      newEmployees.forEach(employee => {
        activityItems.push({
          type: 'new_employee',
          employeeName: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          department: employee.department,
          position: employee.position,
          timestamp: new Date(employee.createdAt)
        });
      });

      // Sort all activities by timestamp (newest first) and take top 10
      const recentActivity = activityItems
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

      console.log('Recent activity items:', recentActivity);
      setRecentActivity(recentActivity);

    } catch (error) {
      console.error('Error fetching overview data:', error);
      setError(error.message);
      
      // Set default values on error
      setStats({
        totalEmployees: 0,
        presentToday: 0,
        absentToday: 0,
        departments: 0,
        rfidAssigned: 0,
        lateToday: 0,
        completedShifts: 0
      });
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchOverviewData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchOverviewData, 30000);
    return () => clearInterval(interval);
  }, [fetchOverviewData]);

  const StatCard = ({ icon: Icon, title, value, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
          <Icon className={`text-2xl ${color}`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    try {
      const date = new Date(timeString);
      // Convert to PH time (GMT+8)
      const phTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
      const hours = phTime.getHours();
      const minutes = phTime.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid time';
    }
  };

  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const diffMs = now - new Date(timestamp);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatTime(timestamp);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'time_in':
        return <FaSignInAlt className="text-green-500" />;
      case 'time_out':
        return <FaSignOutAlt className="text-blue-500" />;
      case 'rfid_assigned':
        return <FaRfid className="text-purple-500" />;
      case 'new_employee':
        return <FaUserPlus className="text-indigo-500" />;
      default:
        return <FaUserCheck className="text-gray-500" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'time_in':
        return 'bg-green-100 text-green-600';
      case 'time_out':
        return 'bg-blue-100 text-blue-600';
      case 'rfid_assigned':
        return 'bg-purple-100 text-purple-600';
      case 'new_employee':
        return 'bg-indigo-100 text-indigo-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'time_in':
        return `Checked ${activity.isLate ? 'in late' : 'in'}`;
      case 'time_out':
        return 'Checked out';
      case 'rfid_assigned':
        return 'RFID card assigned';
      case 'new_employee':
        return 'New employee added';
      default:
        return 'Activity';
    }
  };

  const getActivityDescription = (activity) => {
    switch (activity.type) {
      case 'time_in':
        return `at ${formatTime(activity.time)} • ${activity.department}`;
      case 'time_out':
        return `at ${formatTime(activity.time)} • Worked ${activity.hoursWorked || '0h 0m'}`;
      case 'rfid_assigned':
        return `RFID: ${activity.rfidUid} • ${activity.department}`;
      case 'new_employee':
        return `${activity.position} • ${activity.department}`;
      default:
        return activity.department || '';
    }
  };

  const handleRefresh = () => {
    fetchOverviewData();
  };

  const retryConnection = async () => {
    setApiBaseUrl(''); // Reset base URL to force rediscovery
    await fetchOverviewData();
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#400504]"></div>
        <span className="ml-4 text-lg">Loading overview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-6 rounded relative">
          <div className="flex items-center justify-between">
            <div>
              <strong className="font-bold">Error Loading Data</strong>
              <p className="block">{error}</p>
              <p className="text-sm mt-2">
                Make sure your backend server is running on localhost:5000
              </p>
            </div>
            <button
              onClick={retryConnection}
              className="flex items-center bg-[#400504] hover:bg-[#300303] text-white font-bold py-2 px-4 rounded"
            >
              <FaSync className="mr-2" />
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#400504]">Dashboard Overview</h1>
       
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] transition-colors mt-4 sm:mt-0"
        >
          <FaSync className="mr-2" />
          Refresh Data
        </button>
      </div>

      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={FaUsers}
          title="Total Employees"
          value={stats.totalEmployees}
          color="text-blue-600"
          subtitle="Active staff members"
        />
        <StatCard
          icon={FaUserCheck}
          title="Present Today"
          value={stats.presentToday}
          color="text-green-600"
          subtitle={`${stats.presentToday}/${stats.totalEmployees} employees`}
        />
        <StatCard
          icon={FaUserTimes}
          title="Absent Today"
          value={stats.absentToday}
          color="text-red-600"
          subtitle="Yet to check in"
        />
        <StatCard
          icon={FaIdCard}
          title="RFID Assigned"
          value={stats.rfidAssigned}
          color="text-purple-600"
          subtitle={`${stats.totalEmployees > 0 ? Math.round((stats.rfidAssigned / stats.totalEmployees) * 100) : 0}% coverage`}
        />
      </div>

      {/* Secondary Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={FaBuilding}
          title="Departments"
          value={stats.departments}
          color="text-indigo-600"
          subtitle="Active departments"
        />
        <StatCard
          icon={FaClock}
          title="Late Today"
          value={stats.lateToday}
          color="text-yellow-600"
          subtitle="Employees arrived late"
        />
        <StatCard
          icon={FaChartBar}
          title="Completed Shifts"
          value={stats.completedShifts}
          color="text-green-600"
          subtitle="Finished work today"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-[#400504] flex items-center">
            <FaCalendarAlt className="mr-2" />
            Today's Activity
          </h2>
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        </div>
        <div className="p-6">
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-gray-900">
                          {activity.employeeName}
                        </p>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                          {activity.employeeId}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-sm text-gray-700 font-medium">
                          {getActivityText(activity)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {getActivityDescription(activity)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FaCalendarAlt className="mx-auto text-4xl text-gray-300 mb-3" />
              <p>No activity recorded today</p>
              <p className="text-sm mt-1">Time in/out events and new employees will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#400504] mb-4">Today's Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="bg-white p-3 rounded-lg border">
            <span className="font-medium text-gray-700">Attendance Rate:</span>
            <span className="ml-2 text-green-600 font-semibold">
              {stats.totalEmployees > 0 ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}%
            </span>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <span className="font-medium text-gray-700">Punctuality Rate:</span>
            <span className="ml-2 text-green-600 font-semibold">
              {stats.presentToday > 0 ? Math.round(((stats.presentToday - stats.lateToday) / stats.presentToday) * 100) : 100}%
            </span>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <span className="font-medium text-gray-700">Shift Completion:</span>
            <span className="ml-2 text-blue-600 font-semibold">
              {stats.presentToday > 0 ? Math.round((stats.completedShifts / stats.presentToday) * 100) : 0}%
            </span>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <span className="font-medium text-gray-700">RFID Coverage:</span>
            <span className="ml-2 text-purple-600 font-semibold">
              {stats.totalEmployees > 0 ? Math.round((stats.rfidAssigned / stats.totalEmployees) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewEMS;
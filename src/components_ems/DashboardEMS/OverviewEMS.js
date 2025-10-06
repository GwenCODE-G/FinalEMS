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
  FaSync
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
  const [apiBaseUrl] = useState('http://localhost:5000');

  const fetchOverviewData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching overview data...');

      // Fetch employees
      const employeesResponse = await fetch(`${apiBaseUrl}/api/employees`);
      if (!employeesResponse.ok) {
        throw new Error(`Failed to fetch employees: ${employeesResponse.status}`);
      }
      const employeesData = await employeesResponse.json();
      const employees = employeesData.success ? employeesData.data : [];
      console.log('Employees fetched:', employees.length);

      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0];
      const attendanceResponse = await fetch(`${apiBaseUrl}/api/rfid/attendance?startDate=${today}&endDate=${today}`);
      if (!attendanceResponse.ok) {
        throw new Error(`Failed to fetch attendance: ${attendanceResponse.status}`);
      }
      const attendanceData = await attendanceResponse.json();
      const todayAttendance = attendanceData.success ? attendanceData.data.attendance : [];
      console.log('Today attendance fetched:', todayAttendance.length);

      // Fetch departments
      const deptResponse = await fetch(`${apiBaseUrl}/api/departments`);
      if (!deptResponse.ok) {
        throw new Error(`Failed to fetch departments: ${deptResponse.status}`);
      }
      const deptData = await deptResponse.json();
      const departments = deptData.success ? deptData.data : [];
      console.log('Departments fetched:', departments.length);

      // Fetch RFID assigned cards
      const rfidResponse = await fetch(`${apiBaseUrl}/api/rfid/assigned`);
      let rfidAssignedCount = 0;
      if (rfidResponse.ok) {
        const rfidData = await rfidResponse.json();
        rfidAssignedCount = rfidData.success ? rfidData.count : 0;
      }
      console.log('RFID assigned:', rfidAssignedCount);

      // Calculate statistics
      const activeEmployees = employees.filter(emp => emp.status === 'Active');
      const totalEmployees = activeEmployees.length;
      
      const presentToday = todayAttendance.filter(a => a.timeIn).length;
      const absentToday = totalEmployees - presentToday;
      const completedShifts = todayAttendance.filter(a => a.timeOut).length;
      const lateToday = todayAttendance.filter(a => a.status === 'Late').length;
      
      // If RFID assigned count is 0, calculate from employees data
      const rfidAssigned = rfidAssignedCount > 0 ? rfidAssignedCount : 
                          activeEmployees.filter(emp => emp.isRfidAssigned || emp.rfidUid).length;

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

      // Recent activity (last 5 attendance records)
      const recent = todayAttendance
        .sort((a, b) => new Date(b.timeIn || b.createdAt) - new Date(a.timeIn || a.createdAt))
        .slice(0, 5);
      setRecentActivity(recent);

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

  const handleRefresh = () => {
    fetchOverviewData();
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
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center bg-[#400504] hover:bg-[#300303] text-white font-bold py-2 px-4 rounded"
            >
              <FaSync className="mr-2" />
              Retry
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
          <p className="text-gray-600">Welcome to Brighton Employee Management System</p>
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
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-full ${
                      activity.status === 'Present' ? 'bg-green-100 text-green-600' :
                      activity.status === 'Late' ? 'bg-yellow-100 text-yellow-600' :
                      activity.status === 'Completed' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <FaUserCheck className="text-sm" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">
                        {activity.employeeName || `Employee ${activity.employeeId}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activity.timeIn ? `Checked in at ${new Date(activity.timeIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Not checked in'}
                        {activity.timeOut && ` • Out at ${new Date(activity.timeOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {activity.hoursWorked > 0 && (
                      <span className="text-sm text-gray-500">
                        {activity.hoursWorked.toFixed(1)}h
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      activity.status === 'Present' ? 'bg-green-100 text-green-800' :
                      activity.status === 'Late' ? 'bg-yellow-100 text-yellow-800' :
                      activity.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FaCalendarAlt className="mx-auto text-4xl text-gray-300 mb-3" />
              <p>No activity recorded today</p>
              <p className="text-sm mt-1">Attendance records will appear here as employees check in</p>
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
import React, { useState, useEffect } from 'react';
import { 
  FaUsers, 
  FaUserCheck, 
  FaUserTimes, 
  FaIdCard, 
  FaChartBar,
  FaClock,
  FaBuilding,
  FaCalendarAlt
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
  const [apiBaseUrl] = useState('http://localhost:5000');

  useEffect(() => {
    fetchOverviewData();
  });

  const fetchOverviewData = async () => {
    try {
      const token = localStorage.getItem('ems_token');
      
      // Fetch employees
      const employeesResponse = await fetch(`${apiBaseUrl}/api/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const employees = await employeesResponse.json();

      // Fetch today's attendance
      const attendanceResponse = await fetch(`${apiBaseUrl}/api/rfid/attendance/today`);
      const todayAttendance = await attendanceResponse.json();

      // Fetch departments
      const deptResponse = await fetch(`${apiBaseUrl}/api/departments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const departments = await deptResponse.json();

      // Calculate statistics
      const present = todayAttendance.filter(a => a.timeIn).length;
      const absent = employees.length - present;
      const completed = todayAttendance.filter(a => a.timeOut).length;
      const late = todayAttendance.filter(a => a.status === 'Late').length;
      const rfidAssigned = employees.filter(e => e.isRfidAssigned).length;

      setStats({
        totalEmployees: employees.length,
        presentToday: present,
        absentToday: absent,
        departments: departments.length,
        rfidAssigned: rfidAssigned,
        lateToday: late,
        completedShifts: completed
      });

      // Recent activity (last 5 attendance records)
      const recent = todayAttendance
        .sort((a, b) => new Date(b.timeIn || b.createdAt) - new Date(a.timeIn || a.createdAt))
        .slice(0, 5);
      setRecentActivity(recent);

    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
          <Icon className={`text-2xl ${color.replace('text-', 'text-')}`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#400504]"></div>
        <span className="ml-4 text-lg">Loading overview...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#400504]">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome to Brighton Employee Management System</p>
      </div>

      {/* Statistics Grid */}
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
          subtitle={`${Math.round((stats.rfidAssigned / stats.totalEmployees) * 100)}% coverage`}
        />
      </div>

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
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-[#400504] flex items-center">
            <FaCalendarAlt className="mr-2" />
            Recent Activity
          </h2>
        </div>
        <div className="p-6">
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                      <p className="font-medium text-gray-900">Employee {activity.employeeId}</p>
                      <p className="text-sm text-gray-500">
                        {activity.timeIn ? `Checked in at ${new Date(activity.timeIn).toLocaleTimeString()}` : 'Not checked in'}
                        {activity.timeOut && ` • Checked out at ${new Date(activity.timeOut).toLocaleTimeString()}`}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    activity.status === 'Present' ? 'bg-green-100 text-green-800' :
                    activity.status === 'Late' ? 'bg-yellow-100 text-yellow-800' :
                    activity.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FaCalendarAlt className="mx-auto text-4xl text-gray-300 mb-3" />
              <p>No activity recorded today</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-[#400504]">Quick Actions</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left">
            <FaUsers className="text-blue-600 text-xl mb-2" />
            <h3 className="font-semibold text-blue-900">Manage Employees</h3>
            <p className="text-sm text-blue-700">Add, edit, or archive employees</p>
          </button>
          <button className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left">
            <FaIdCard className="text-green-600 text-xl mb-2" />
            <h3 className="font-semibold text-green-900">RFID Management</h3>
            <p className="text-sm text-green-700">Assign or remove RFID cards</p>
          </button>
          <button className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left">
            <FaChartBar className="text-purple-600 text-xl mb-2" />
            <h3 className="font-semibold text-purple-900">View Reports</h3>
            <p className="text-sm text-purple-700">Generate attendance reports</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OverviewEMS;
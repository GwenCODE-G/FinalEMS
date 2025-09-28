import React, { useState, useEffect } from 'react';
import EmployeeEMS from '../components_ems/EmployeeEMS';
import DepartmentEMP from '../components_ems/DepartmentEMP';
import AddEmp from '../components_ems/AddEmp/AddEmp';
import OverviewEMS from '../components_ems/OverviewEMS';
import ConcernEMS from '../components_ems/ConcernEMS';
import Attendance from '../components_ems/Attendance';

function EMSDashboard() {
  // Load state from localStorage on component mount
  const [activeTab, setActiveTab] = useState(
    localStorage.getItem('ems_activeTab') || 'Overview'
  );
  const [employeeView, setEmployeeView] = useState(
    localStorage.getItem('ems_employeeView') || 'list'
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ems_activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('ems_employeeView', employeeView);
  }, [employeeView]);

  // Authentication check on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('ems_token');
        if (!token) {
          // Auto-login for demo purposes - remove in production
          const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: 'admin',
              password: 'admin123'
            })
          });

          if (loginResponse.ok) {
            const data = await loginResponse.json();
            localStorage.setItem('ems_token', data.token);
            setIsAuthenticated(true);
          } else {
            console.log('Auto-login failed');
          }
        } else {
          // Verify existing token
          const verifyResponse = await fetch('http://localhost:5000/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (verifyResponse.ok) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('ems_token');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('ems_token');
    localStorage.removeItem('ems_activeTab');
    localStorage.removeItem('ems_employeeView');
    setIsAuthenticated(false);
    window.location.reload();
  };

  const menuItems = [
    'Overview',
    'Employee Management',
    'Attendance',
    'Concern',
    'Logout'
  ];

  const renderEmployeeManagementContent = () => {
    switch (employeeView) {
      case 'add':
        return <AddEmp onCancel={() => setEmployeeView('list')} />;
      case 'department':
        return <DepartmentEMP onBack={() => setEmployeeView('list')} />;
      default:
        return (
          <EmployeeEMS
            onAddEmployee={() => setEmployeeView('add')}
            onViewDepartment={() => setEmployeeView('department')}
          />
        );
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#400504]"></div>
          <span className="ml-4 text-lg">Loading...</span>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-[#400504] mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please check backend connection and try refreshing.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303]"
          >
            Retry Connection
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'Overview':
        return <OverviewEMS />;
      case 'Employee Management':
        return renderEmployeeManagementContent();
      case 'Attendance':
        return <Attendance />;
      case 'Concern':
        return <ConcernEMS />;
      case 'Logout':
        handleLogout();
        return null;
      default:
        return <OverviewEMS />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#400504] mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Initializing System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen font-sans bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-[#400504] text-white flex flex-col shadow-lg flex-shrink-0">
        {/* Logo and Info */}
        <div className="flex flex-col items-center p-4 border-b border-[#cba235] space-y-3">
          <div className="relative rounded-full p-1 bg-white border-2 border-[#cba235] shadow">
            <img
              src="/Bri.png"
              alt="Brighton Logo"
              className="w-[150px] h-[150px] object-contain rounded-full"
            />
          </div>
          <div className="text-3xl font-bold tracking-wide">EMS</div>
          <div className="text-base font-semibold text-[#cba235]/80 text-center">
            Brighton School SJDM
          </div>
          <div className="text-sm font-bold text-[#cba235]/60 text-center">
            Employee Management System
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item}
              onClick={() => {
                if (item === 'Logout') {
                  handleLogout();
                } else {
                  setActiveTab(item);
                  if (item === 'Employee Management') setEmployeeView('list');
                }
              }}
              className={`w-full text-left px-3 py-3 rounded-md transition-all duration-200 font-semibold text-base ${
                activeTab === item
                  ? 'bg-[#cba235] text-[#400504] shadow-md'
                  : 'hover:bg-[#cba235]/20 hover:text-[#cba235]'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 text-sm text-center text-white/60 border-t border-[#cba235]">
          &copy; 2025 Brighton EMS
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-[#400504]">{activeTab}</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, Admin
              </span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="bg-white rounded-lg shadow-sm border min-h-full">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default EMSDashboard;
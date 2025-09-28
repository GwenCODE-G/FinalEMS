import React, { useState, useEffect } from 'react';
import { BuildingOfficeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const DepartmentEMP = ({ onBack }) => {
  const [departments, setDepartments] = useState([]);
  const [apiBaseUrl] = useState('http://localhost:5000');

  useEffect(() => {
    fetchDepartments();
  });

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('ems_token');
      const response = await fetch(`${apiBaseUrl}/api/departments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  // Calculate total employees across all departments
  const totalEmployees = departments.reduce((total, dept) => total + (dept.employeeCount || 0), 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Back to Employees
          </button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#400504]">Department Overview</h1>
            <p className="text-gray-600 mt-1">View all departments and employee distribution</p>
          </div>
        </div>
        
        <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
          Total Departments: <span className="font-semibold text-[#400504]">{departments.length}</span>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Departments</p>
              <p className="text-3xl font-bold text-gray-900">{departments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900">{totalEmployees}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Employees/Dept</p>
              <p className="text-3xl font-bold text-gray-900">
                {departments.length > 0 
                  ? Math.round(totalEmployees / departments.length)
                  : 0
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Departments Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#400504]">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Department
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Total Employees
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Distribution
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {departments.length > 0 ? (
                departments.map((department) => {
                  const percentage = totalEmployees > 0 ? ((department.employeeCount || 0) / totalEmployees * 100).toFixed(1) : 0;
                  
                  return (
                    <tr key={department._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-[#400504] rounded-lg">
                            <BuildingOfficeIcon className="h-5 w-5 text-white" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{department.name}</div>
                            <div className="text-xs text-gray-500">Department</div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md">
                          {department.description}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-center">
                          <span className="text-2xl font-bold text-[#400504]">{department.employeeCount || 0}</span>
                          <div className="text-xs text-gray-500 mt-1">employees</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-[#cba235] h-2 rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${Math.min((department.employeeCount || 0) / Math.max(...departments.map(d => d.employeeCount || 0), 1) * 100, 100)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-sm font-medium text-gray-600 w-12 text-right">
                            {percentage}%
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <BuildingOfficeIcon className="h-16 w-16 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No departments found</h3>
                      <p className="text-gray-500">Departments will appear here once they are created in the system.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {departments.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Showing {departments.length} departments</span>
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Department Distribution Chart (Visual Representation) */}
      {departments.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Distribution by Department</h3>
          <div className="space-y-4">
            {departments.map((department) => {
              const percentage = totalEmployees > 0 ? ((department.employeeCount || 0) / totalEmployees * 100).toFixed(1) : 0;
              
              return (
                <div key={department._id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <span className="text-sm font-medium text-gray-700 w-48 truncate">{department.name}</span>
                    <div className="flex-1 max-w-2xl">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-[#cba235] h-3 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 w-20 text-right">
                    {department.employeeCount || 0} ({percentage}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentEMP;
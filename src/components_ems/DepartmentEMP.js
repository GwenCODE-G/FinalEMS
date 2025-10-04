import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DepartmentEMP = () => {
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDepartments();
        fetchEmployees();
    }, []);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5000/api/departments');
            
            let departmentsData = [];
            
            if (Array.isArray(response.data)) {
                departmentsData = response.data;
            } else if (response.data && Array.isArray(response.data.data)) {
                departmentsData = response.data.data;
            } else if (response.data && response.data.success && Array.isArray(response.data.data)) {
                departmentsData = response.data.data;
            } else {
                departmentsData = [];
            }
            
            setDepartments(departmentsData);
            setError(null);
        } catch (err) {
            console.error('Error fetching departments:', err);
            setError(`Failed to load departments: ${err.response?.data?.message || err.message}`);
            setDepartments([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/employees');
            if (response.data && Array.isArray(response.data)) {
                setEmployees(response.data);
            } else if (response.data && response.data.success && Array.isArray(response.data.data)) {
                setEmployees(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching employees:', err);
        }
    };

    // Calculate total employees per department
    const getEmployeeCountByDepartment = (departmentName) => {
        return employees.filter(employee => 
            employee.department === departmentName && employee.status === 'Active'
        ).length;
    };

    const totalDepartments = Array.isArray(departments) ? departments.length : 0;
    const totalActiveEmployees = employees.filter(emp => emp.status === 'Active').length;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl text-[#400504]">Loading departments...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-6 border-b border-[#cba235]">
                    <div>
                        <h2 className="text-3xl font-bold text-[#400504]">
                            Department Management
                        </h2>
                        <p className="text-gray-600 mt-2">
                            Department overview with employee distribution
                        </p>
                    </div>
                    <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                        <div className="bg-[#400504] text-white px-4 py-2 rounded-lg font-semibold">
                            Departments: {totalDepartments}
                        </div>
                        <div className="bg-[#cba235] text-[#400504] px-4 py-2 rounded-lg font-semibold">
                            Total Employees: {totalActiveEmployees}
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                        <div className="flex justify-between items-center">
                            <span>{error}</span>
                            <button 
                                onClick={() => setError(null)}
                                className="text-red-700 hover:text-red-900"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}

                {/* Departments Table */}
                <div className="bg-white rounded-lg shadow-lg border border-[#cba235] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-[#400504]">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                                        Department
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                                        Total Employees
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {departments.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-8 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="text-4xl text-gray-400 mb-3">🏢</div>
                                                <h3 className="text-base font-medium text-gray-900 mb-1">
                                                    No departments found
                                                </h3>
                                                <p className="text-gray-500 text-sm">
                                                    Departments will appear here once added to the system
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    departments.map((department) => {
                                        const employeeCount = getEmployeeCountByDepartment(department.name);
                                        return (
                                            <tr key={department._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 w-10 h-10 bg-[#cba235] rounded-lg flex items-center justify-center">
                                                            <span className="text-[#400504] font-bold text-sm">
                                                                {department.name.charAt(0)}
                                                            </span>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-lg font-semibold text-[#400504]">
                                                                {department.name}
                                                            </div>
                                                            <div className="text-xs text-gray-500 font-mono">
                                                                ID: {department._id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-700 max-w-md">
                                                        {department.description}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                            employeeCount === 0 
                                                                ? 'bg-gray-100 text-gray-600' 
                                                                : employeeCount <= 5 
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : employeeCount <= 15
                                                                        ? 'bg-blue-100 text-blue-800'
                                                                        : 'bg-[#cba235] text-[#400504]'
                                                        }`}>
                                                            <span className="font-bold text-lg">
                                                                {employeeCount}
                                                            </span>
                                                        </div>
                                                        <div className="ml-3">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {employeeCount} {employeeCount === 1 ? 'employee' : 'employees'}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                Active staff
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer */}
                    {departments.length > 0 && (
                        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                            <div className="flex justify-between items-center text-sm text-gray-600">
                                <span>
                                    Showing {departments.length} department{departments.length !== 1 ? 's' : ''}
                                </span>
                                <span>
                                    Total active employees: {totalActiveEmployees}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Summary Cards */}
                {departments.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                        <div className="bg-white p-6 rounded-lg border border-[#cba235] shadow-sm">
                            <div className="flex items-center">
                                <div className="p-3 bg-[#400504] rounded-lg">
                                    <span className="text-white font-bold text-lg">🏢</span>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Total Departments</p>
                                    <p className="text-2xl font-bold text-[#400504]">{totalDepartments}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white p-6 rounded-lg border border-[#cba235] shadow-sm">
                            <div className="flex items-center">
                                <div className="p-3 bg-[#cba235] rounded-lg">
                                    <span className="text-[#400504] font-bold text-lg">👥</span>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Total Employees</p>
                                    <p className="text-2xl font-bold text-[#400504]">{totalActiveEmployees}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white p-6 rounded-lg border border-[#cba235] shadow-sm">
                            <div className="flex items-center">
                                <div className="p-3 bg-gray-100 rounded-lg">
                                    <span className="text-[#400504] font-bold text-lg">📊</span>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Avg per Department</p>
                                    <p className="text-2xl font-bold text-[#400504]">
                                        {totalDepartments > 0 ? Math.round(totalActiveEmployees / totalDepartments) : 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DepartmentEMP;
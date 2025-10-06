import React, { useState } from 'react';
import { XMarkIcon, ArchiveBoxIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const ArchiveEmployeeModal = ({ 
  isOpen, 
  onClose, 
  employee, 
  onEmployeeArchived, 
  onEmployeeRestored,
  apiBaseUrl 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleArchive = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/employees/${employee._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        onEmployeeArchived();
        onClose();
      } else {
        throw new Error(result.message || 'Failed to archive employee');
      }
    } catch (error) {
      console.error('Archive error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/employees/${employee._id}/restore`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        onEmployeeRestored();
        onClose();
      } else {
        throw new Error(result.message || 'Failed to restore employee');
      }
    } catch (error) {
      console.error('Restore error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !employee) return null;

  const isArchived = employee.status === 'Archived';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="relative inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              {isArchived ? (
                <ArrowPathIcon className="h-6 w-6 text-green-600 mr-2" />
              ) : (
                <ArchiveBoxIcon className="h-6 w-6 text-red-600 mr-2" />
              )}
              <h3 className="text-xl font-semibold text-gray-900">
                {isArchived ? 'Restore Employee' : 'Archive Employee'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
                {isArchived ? (
                  <ArrowPathIcon className="h-8 w-8 text-green-600" />
                ) : (
                  <ArchiveBoxIcon className="h-8 w-8 text-red-600" />
                )}
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isArchived ? 'Restore Employee?' : 'Archive Employee?'}
              </h3>
              
              <p className="text-gray-500 mb-4">
                {isArchived 
                  ? `Are you sure you want to restore ${employee.firstName} ${employee.lastName}? This will make them active again and they will appear in active employee lists.`
                  : `Are you sure you want to archive ${employee.firstName} ${employee.lastName}? This will remove them from active lists but preserve their data.`
                }
              </p>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm font-medium text-gray-900">{employee.firstName} {employee.middleName} {employee.lastName}</p>
                <p className="text-sm text-gray-500">{employee.position} • {employee.department}</p>
                <p className="text-sm text-gray-500">ID: {employee.employeeId}</p>
                <p className="text-sm text-gray-500">Status: <span className={`font-semibold ${isArchived ? 'text-orange-600' : 'text-green-600'}`}>{employee.status}</span></p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={isArchived ? handleRestore : handleArchive}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 ${
                isArchived 
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                  : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              }`}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </span>
              ) : (
                isArchived ? 'Restore Employee' : 'Archive Employee'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchiveEmployeeModal;
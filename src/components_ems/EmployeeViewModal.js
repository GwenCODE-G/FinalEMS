import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const EmployeeViewModal = ({ isOpen, onClose, employee, getProfileImageUrl, handleImageError }) => {
  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="relative inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">
              Employee Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Section */}
              <div className="lg:col-span-1">
                <div className="flex flex-col items-center">
                  <img
                    src={getProfileImageUrl(employee.profilePicture, employee._id)}
                    alt={`${employee.firstName} ${employee.lastName}`}
                    className="h-32 w-32 rounded-full object-cover border-4 border-[#cba235] bg-gray-200 mb-4"
                    onError={(e) => handleImageError(e, employee._id)}
                  />
                  <h2 className="text-2xl font-bold text-gray-900 text-center">
                    {employee.firstName} {employee.middleName} {employee.lastName}
                  </h2>
                  <p className="text-gray-600 text-center">{employee.position}</p>
                  <p className="text-gray-500 text-center">{employee.department}</p>
                  
                  <div className="mt-4 grid grid-cols-2 gap-4 w-full">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Employee ID</p>
                      <p className="font-mono font-semibold">{employee.employeeId}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        employee.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {employee.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Gender</label>
                        <p className="text-gray-900">{employee.gender}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Birthday</label>
                        <p className="text-gray-900">{new Date(employee.birthday).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Age</label>
                        <p className="text-gray-900">{employee.age}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-900">{employee.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Contact Number</label>
                        <p className="text-gray-900">{employee.contactNumber}</p>
                      </div>
                    </div>
                  </div>

                  {/* Work Information */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Work Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Work Type</label>
                        <p className="text-gray-900">{employee.workType}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Department</label>
                        <p className="text-gray-900">{employee.department}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Position</label>
                        <p className="text-gray-900">{employee.position}</p>
                      </div>
                      {employee.teachingLevel && employee.teachingLevel.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Teaching Levels</label>
                          <p className="text-gray-900">{employee.teachingLevel.join(', ')}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-500">RFID Status</label>
                        <p className="text-gray-900">
                          {employee.isRfidAssigned ? 'Assigned' : 'Not Assigned'}
                          {employee.rfidUid && ` (${employee.rfidUid.toUpperCase()})`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Government IDs */}
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Government IDs</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <label className="text-sm font-medium text-gray-500">SSS</label>
                      <p className="text-gray-900">{employee.sss || 'Not provided'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <label className="text-sm font-medium text-gray-500">PhilHealth</label>
                      <p className="text-gray-900">{employee.philhealth || 'Not provided'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <label className="text-sm font-medium text-gray-500">Pag-IBIG</label>
                      <p className="text-gray-900">{employee.pagibig || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeViewModal;
// frontend/src/components_ems/EmployeeViewModal.js
import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const EmployeeViewModal = ({ isOpen, onClose, employee }) => {
  if (!isOpen || !employee) return null;

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const formatAddress = (address) => {
    if (!address) return 'Not provided';
    const parts = [
      address.blkLt,
      address.street,
      address.area,
      address.barangay,
      address.city,
      address.province,
      address.postalCode,
      address.country
    ].filter(Boolean);
    return parts.join(', ') || 'Not provided';
  };

  const formatWorkSchedule = (schedule) => {
    if (!schedule) return 'Not set';
    const activeDays = Object.entries(schedule)
      .filter(([_, daySchedule]) => daySchedule.active && daySchedule.start && daySchedule.end)
      .map(([day, daySchedule]) => `${day}: ${daySchedule.start} - ${daySchedule.end}`);
    return activeDays.length > 0 ? activeDays.join(', ') : 'No active schedule';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="relative inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#400504] to-[#5a0705]">
            <div className="flex items-center">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-white">
                  Employee Details
                </h3>
                <p className="text-white text-opacity-80 text-sm">
                  Viewing information for {employee.firstName} {employee.lastName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-10"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Profile Section */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div className="flex flex-col items-center">
                    <div className="h-32 w-32 rounded-full bg-gradient-to-r from-[#400504] to-[#5a0705] flex items-center justify-center text-white text-4xl font-bold border-4 border-[#cba235] mb-4">
                      {getInitials(employee.firstName, employee.lastName)}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 text-center">
                      {employee.firstName} {employee.middleName} {employee.lastName}
                    </h2>
                    <p className="text-gray-600 text-center">{employee.position}</p>
                    <p className="text-gray-500 text-center">{employee.department}</p>
                    
                    <div className="mt-6 space-y-3 w-full">
                      <div className="p-3 bg-white rounded-lg border border-gray-200">
                        <label className="block text-xs font-medium text-gray-500 uppercase">Employee ID</label>
                        <p className="text-lg font-mono font-bold text-[#400504]">{employee.employeeId}</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-gray-200">
                        <label className="block text-xs font-medium text-gray-500 uppercase">Status</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          employee.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {employee.status}
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-gray-200">
                        <label className="block text-xs font-medium text-gray-500 uppercase">Work Type</label>
                        <p className="text-sm font-medium text-gray-900">{employee.workType}</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-gray-200">
                        <label className="block text-xs font-medium text-gray-500 uppercase">RFID Status</label>
                        <p className="text-sm font-medium text-gray-900">
                          {employee.isRfidAssigned ? 'Assigned' : 'Not Assigned'}
                          {employee.rfidUid && (
                            <span className="block text-xs text-gray-500 mt-1">
                              UID: {employee.rfidUid.toUpperCase()}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="lg:col-span-3">
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-semibold text-[#400504] mb-4">Personal Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">First Name</label>
                        <p className="text-gray-900 font-medium">{employee.firstName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Middle Name</label>
                        <p className="text-gray-900">{employee.middleName || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Last Name</label>
                        <p className="text-gray-900 font-medium">{employee.lastName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Gender</label>
                        <p className="text-gray-900">{employee.gender}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Civil Status</label>
                        <p className="text-gray-900">{employee.civilStatus || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Birthday</label>
                        <p className="text-gray-900">{employee.birthday ? new Date(employee.birthday).toLocaleDateString() : 'Not provided'}</p>
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

                  {/* Employment Information */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-semibold text-[#400504] mb-4">Employment Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Department</label>
                        <p className="text-gray-900 font-medium">{employee.department}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Position</label>
                        <p className="text-gray-900 font-medium">{employee.position}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Work Type</label>
                        <p className="text-gray-900">{employee.workType}</p>
                      </div>
                      {employee.teachingLevel && employee.teachingLevel.length > 0 && (
                        <div className="md:col-span-2 lg:col-span-3">
                          <label className="text-sm font-medium text-gray-500">Teaching Levels</label>
                          <p className="text-gray-900">{employee.teachingLevel.join(', ')}</p>
                        </div>
                      )}
                      <div className="md:col-span-2 lg:col-span-3">
                        <label className="text-sm font-medium text-gray-500">Work Schedule</label>
                        <p className="text-gray-900 text-sm">{formatWorkSchedule(employee.workSchedule)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  {employee.emergencyContact && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-semibold text-[#400504] mb-4">Emergency Contact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Name</label>
                          <p className="text-gray-900">{employee.emergencyContact.name || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Relationship</label>
                          <p className="text-gray-900">{employee.emergencyContact.relationship || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Mobile</label>
                          <p className="text-gray-900">{employee.emergencyContact.mobile || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Landline</label>
                          <p className="text-gray-900">{employee.emergencyContact.landline || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Address Information */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-semibold text-[#400504] mb-4">Address Information</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h5 className="text-md font-semibold text-gray-900 mb-3">Current Address</h5>
                        <p className="text-gray-900 text-sm bg-gray-50 p-3 rounded-lg">
                          {formatAddress(employee.currentAddress)}
                        </p>
                      </div>
                      <div>
                        <h5 className="text-md font-semibold text-gray-900 mb-3">Permanent Address</h5>
                        <p className="text-gray-900 text-sm bg-gray-50 p-3 rounded-lg">
                          {formatAddress(employee.permanentAddress)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Government IDs */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-semibold text-[#400504] mb-4">Government IDs</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-sm font-medium text-gray-500">SSS</label>
                        <p className="text-gray-900 font-mono">{employee.sss || 'Not provided'}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-sm font-medium text-gray-500">PhilHealth</label>
                        <p className="text-gray-900 font-mono">{employee.philhealth || 'Not provided'}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-sm font-medium text-gray-500">Pag-IBIG</label>
                        <p className="text-gray-900 font-mono">{employee.pagibig || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
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
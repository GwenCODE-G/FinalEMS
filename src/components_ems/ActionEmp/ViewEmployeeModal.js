import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const ViewEmployeeModal = ({ isOpen, onClose, employee }) => {
  if (!isOpen || !employee) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatAddress = (address) => {
    if (!address) return 'Not provided';
    const parts = [
      address.blkLt || address.block || address.lot ? `Block ${address.block || ''} Lot ${address.lot || ''}`.trim() : '',
      address.street,
      address.area,
      address.barangay,
      address.city,
      address.province,
      address.postalCode,
      address.country
    ].filter(part => part && part.trim() !== '');
    return parts.join(', ');
  };

  const formatEmergencyContact = (contact) => {
    if (!contact) return 'Not provided';
    const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
    const relationship = contact.relationship || '';
    const number = contact.type === 'Mobile' ? contact.mobile : contact.landline;
    return `${name} (${relationship}) - ${number || 'No number provided'}`;
  };

  const formatWorkSchedule = (schedule) => {
    const activeDays = Object.entries(schedule || {})
      .filter(([_, daySchedule]) => daySchedule.active)
      .map(([day, daySchedule]) => 
        `${day}: ${daySchedule.start || ''} - ${daySchedule.end || ''}`
      );
    return activeDays.length > 0 ? activeDays : ['No active days'];
  };

  const formatTeachingLevels = (levels) => {
    if (!levels || !Array.isArray(levels) || levels.length === 0) {
      return 'None selected';
    }
    return levels.join(', ');
  };

  const getRequirementStatus = (requirements) => {
    if (!requirements) return 'Not submitted';
    if (requirements.notYetSubmitted) return 'Not yet submitted';
    
    const selectedOptions = Object.keys(requirements).filter(key => 
      key !== 'notYetSubmitted' && requirements[key] === true
    );
    
    if (selectedOptions.length === 0) return 'No selection';
    
    return selectedOptions.map(option => {
      return option
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace('Present ', 'Present ')
        .replace('Submit ', 'Submit ')
        .replace('M D R', 'MDR')
        .replace('M D F', 'MDF')
        .replace('Photo Copy', 'Photocopy');
    }).join(', ');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="relative inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-[#400504] text-white">
            <div className="flex items-center">
              <h3 className="text-xl font-semibold">
                Employee Details - {employee.firstName} {employee.lastName}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-[#400504]">Basic Information</h4>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>First Name:</strong> {employee.firstName}</div>
                <div><strong>Middle Name:</strong> {employee.middleName || 'Not provided'}</div>
                <div><strong>Last Name:</strong> {employee.lastName}</div>
                <div><strong>Suffix:</strong> {employee.suffix || 'None'}</div>
                <div><strong>Gender:</strong> {employee.gender}</div>
                <div><strong>Civil Status:</strong> {employee.civilStatus}</div>
                <div><strong>Religion:</strong> {employee.religion}</div>
                <div><strong>Birthday:</strong> {formatDate(employee.birthday)}</div>
                <div><strong>Age:</strong> {employee.age}</div>
                <div className="md:col-span-2"><strong>Birthplace:</strong> {employee.birthplace}</div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-[#400504]">Contact Information</h4>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>Contact Number:</strong> {employee.contactNumber}</div>
                <div><strong>Email:</strong> {employee.email}</div>
                <div className="md:col-span-2"><strong>Emergency Contact:</strong> {formatEmergencyContact(employee.emergencyContact)}</div>
              </div>
            </div>

            {/* Government IDs */}
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-[#400504]">Government IDs</h4>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>TIN:</strong> {employee.tin || 'Not provided'}</div>
                <div><strong>SSS:</strong> {employee.sss || 'Not provided'}</div>
                <div><strong>PhilHealth:</strong> {employee.philhealth || 'Not provided'}</div>
                <div><strong>PAG-IBIG:</strong> {employee.pagibig || 'Not provided'}</div>
              </div>
            </div>

            {/* Government ID Requirements */}
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-[#400504]">Government ID Requirements</h4>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>TIN Requirements:</strong> {getRequirementStatus(employee.requirements?.tinRequirements)}</div>
                <div><strong>SSS Requirements:</strong> {getRequirementStatus(employee.requirements?.sssRequirements)}</div>
                <div><strong>PhilHealth Requirements:</strong> {getRequirementStatus(employee.requirements?.philhealthRequirements)}</div>
                <div><strong>PAG-IBIG Requirements:</strong> {getRequirementStatus(employee.requirements?.pagibigRequirements)}</div>
              </div>
            </div>

            {/* BPLO Requirements */}
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-[#400504]">BPLO Requirements (CSJDM)</h4>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>Health Card:</strong> {getRequirementStatus(employee.requirements?.healthCardRequirements)}</div>
                <div><strong>Professional ID:</strong> {getRequirementStatus(employee.requirements?.professionalIDRequirements)}</div>
                <div><strong>Driver's License:</strong> {getRequirementStatus(employee.requirements?.driversLicenseRequirements)}</div>
                <div><strong>Barangay Working Permit:</strong> {getRequirementStatus(employee.requirements?.barangayWorkingPermitRequirements)}</div>
              </div>
            </div>

            {/* Occupational Permit Requirements */}
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-[#400504]">Occupational Permit Requirements</h4>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>Birth Certificate:</strong> {getRequirementStatus(employee.requirements?.birthCertificateRequirements)}</div>
                <div><strong>Police/NBI Clearance:</strong> {getRequirementStatus(employee.requirements?.policeNbiRequirements)}</div>
                <div><strong>Barangay Clearance:</strong> {getRequirementStatus(employee.requirements?.barangayClearanceRequirements)}</div>
                <div><strong>Cedula:</strong> {getRequirementStatus(employee.requirements?.cedulaRequirements)}</div>
              </div>
            </div>

            {/* Address Information */}
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-[#400504]">Address Information</h4>
              </div>
              <div className="p-4 space-y-4">
                <div><strong>Current Address:</strong> {formatAddress(employee.currentAddress)}</div>
                {!employee.sameAsCurrent && (
                  <div><strong>Permanent Address:</strong> {formatAddress(employee.permanentAddress)}</div>
                )}
                {employee.sameAsCurrent && (
                  <div className="text-blue-600">Permanent address is same as current address</div>
                )}
              </div>
            </div>

            {/* Employment Information */}
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-[#400504]">Employment Information</h4>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>Employee ID:</strong> {employee.employeeId}</div>
                <div><strong>Department:</strong> {employee.department}</div>
                <div><strong>Position:</strong> {employee.position}</div>
                <div><strong>Work Type:</strong> {employee.workType}</div>
                <div><strong>Status:</strong> {employee.status}</div>
                <div><strong>RFID UID:</strong> {employee.rfidUid || 'Not assigned'}</div>
                {employee.teachingLevel && employee.teachingLevel.length > 0 && (
                  <div className="md:col-span-2">
                    <strong>Teaching Levels:</strong> {formatTeachingLevels(employee.teachingLevel)}
                  </div>
                )}
                <div className="md:col-span-2">
                  <strong>Work Schedule:</strong>
                  <div className="mt-1 space-y-1">
                    {formatWorkSchedule(employee.workSchedule).map((schedule, index) => (
                      <div key={index} className="text-sm">{schedule}</div>
                    ))}
                  </div>
                </div>
                <div><strong>Date Start:</strong> {formatDate(employee.dateStart)}</div>
                <div><strong>Date Separated:</strong> {formatDate(employee.dateSeparated)}</div>
                <div><strong>Date Employed:</strong> {formatDate(employee.dateEmployed)}</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200">
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

export default ViewEmployeeModal;
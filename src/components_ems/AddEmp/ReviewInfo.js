// frontend/src/components_ems/AddEmp/ReviewInfo.js
import React from 'react';

const ReviewInfo = ({ formData, isMinor, generateEmployeeId }) => {
  const formatAddress = (address) => {
    if (!address) return 'Not provided';
    
    const parts = [
      address.blk && `Block ${address.blk}`,
      address.lot && `Lot ${address.lot}`,
      address.street,
      address.area,
      address.barangay,
      address.city,
      address.province,
      address.postalCode && `Postal Code: ${address.postalCode}`,
      address.country
    ].filter(Boolean);
    
    return parts.join(', ') || 'Not provided';
  };

  const formatWorkSchedule = (schedule) => {
    if (!schedule) return 'Not set';
    
    const activeDays = Object.entries(schedule)
      .filter(([_, daySchedule]) => daySchedule.active && daySchedule.start && daySchedule.end)
      .map(([day, daySchedule]) => `${day}: ${daySchedule.start} - ${daySchedule.end}`);
    
    return activeDays.length > 0 ? activeDays.join(' | ') : 'No active schedule';
  };

  const formatEmergencyContact = (contact) => {
    if (!contact) return 'Not provided';
    
    const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
    const relationship = contact.relationship ? `(${contact.relationship})` : '';
    const number = contact.type === 'Mobile' ? contact.mobile : contact.landline;
    
    return `${name} ${relationship} - ${number || 'No number provided'}`;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-[#400504] border-b pb-2">Review Information</h3>
      
      {/* Basic Information */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-[#400504] mb-3">Basic Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Full Name:</span>
            <p className="mt-1">
              {formData.firstName || 'Not provided'} {formData.middleName || ''} {formData.lastName || ''}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Gender:</span>
            <p className="mt-1">{formData.gender || 'Not provided'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Civil Status:</span>
            <p className="mt-1">{formData.civilStatus || 'Not provided'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Birthday:</span>
            <p className="mt-1">{formData.birthday || 'Not provided'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Age:</span>
            <p className="mt-1">
              {formData.age || 'Not provided'} {isMinor ? '(Minor)' : ''}
            </p>
          </div>
        </div>
      </div>
      
      {/* Contact Information */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-[#400504] mb-3">Contact Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Contact Number:</span>
            <p className="mt-1">{formData.contactNumber || 'Not provided'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Email:</span>
            <p className="mt-1">{formData.email || 'Not provided'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Emergency Contact:</span>
            <p className="mt-1">{formatEmergencyContact(formData.emergencyContact)}</p>
          </div>
          <div className="md:col-span-2">
            <span className="font-medium text-gray-700">Government IDs:</span>
            <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <span className="text-gray-600">SSS:</span>
                <p>{formData.sss || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-gray-600">PhilHealth:</span>
                <p>{formData.philhealth || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-gray-600">PAG-IBIG:</span>
                <p>{formData.pagibig || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Current Address:</span>
            <p className="mt-1">{formatAddress(formData.currentAddress)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Permanent Address:</span>
            <p className="mt-1">
              {formData.sameAsCurrent ? 'Same as current address' : formatAddress(formData.permanentAddress)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Employment Details */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-[#400504] mb-3">Employment Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Department:</span>
            <p className="mt-1">{formData.department || 'Not provided'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Position:</span>
            <p className="mt-1">{formData.position || 'Not provided'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Work Type:</span>
            <p className="mt-1">{formData.workType || 'Not provided'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Employee ID:</span>
            <p className="mt-1 font-mono">{generateEmployeeId()}</p>
          </div>
        </div>
        
        {formData.department === 'Academic Department' && formData.position === 'Teacher' && formData.teachingLevel?.length > 0 && (
          <div className="mt-4 text-sm">
            <span className="font-medium text-gray-700">Teaching Levels:</span>
            <p className="mt-1">{formData.teachingLevel.join(', ')}</p>
          </div>
        )}
        
        <div className="mt-4 text-sm">
          <span className="font-medium text-gray-700">Work Schedule:</span>
          <p className="mt-1">{formatWorkSchedule(formData.workSchedule)}</p>
        </div>
      </div>
      
      {/* Confirmation Checkbox */}
      <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <input
          type="checkbox"
          id="confirmInfo"
          className="h-5 w-5 text-[#400504] focus:ring-[#400504] border-gray-300 rounded mt-0.5"
          required
        />
        <label htmlFor="confirmInfo" className="text-sm text-gray-700">
          <span className="font-medium">I confirm that all the information provided is accurate and complete.</span>
          <p className="mt-1 text-gray-600">
            By checking this box, I verify that I have reviewed all the details and they are correct to the best of my knowledge.
          </p>
        </label>
      </div>
    </div>
  );
};

export default ReviewInfo;
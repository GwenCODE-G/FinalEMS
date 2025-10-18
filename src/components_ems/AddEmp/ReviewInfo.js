import React from 'react';

const ReviewInfo = ({ formData, isMinor, generateEmployeeId }) => {
  // Format date for display
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

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return 'Not set';
    return timeString;
  };

  // Format work schedule for display
  const formatWorkSchedule = (schedule) => {
    const activeDays = Object.entries(schedule || {})
      .filter(([_, daySchedule]) => daySchedule.active)
      .map(([day, daySchedule]) => 
        `${day}: ${formatTime(daySchedule.start)} - ${formatTime(daySchedule.end)}`
      );
    
    return activeDays.length > 0 ? activeDays : ['No active days'];
  };

  // Format address for display
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

  // Format emergency contact for display
  const formatEmergencyContact = (contact) => {
    if (!contact) return 'Not provided';
    
    const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
    const relationship = contact.relationship || '';
    const number = contact.type === 'Mobile' ? contact.mobile : contact.landline;
    
    return `${name} (${relationship}) - ${number || 'No number provided'}`;
  };

  // Format teaching levels for display
  const formatTeachingLevels = (levels) => {
    if (!levels || !Array.isArray(levels) || levels.length === 0) {
      return 'None selected';
    }
    return levels.join(', ');
  };

  // Format requirements status based on actual user selection
  const formatRequirementStatus = (requirements) => {
    if (!requirements || Object.keys(requirements).length === 0) {
      return 'No requirements selected';
    }
    
    // If "notYetSubmitted" is checked, show that
    if (requirements.notYetSubmitted) {
      return 'Not yet submitted';
    }
    
    // Otherwise show the selected options
    const selectedOptions = Object.keys(requirements).filter(key => requirements[key] === true);
    
    if (selectedOptions.length === 0) {
      return 'No specific requirements selected';
    }
    
    return selectedOptions.map(option => {
      // Format the option names to be more readable
      const formattedOption = option
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace('Present ', 'Present ')
        .replace('Submit ', 'Submit ')
        .replace('M D R', 'MDR')
        .replace('M D F', 'MDF')
        .replace('Photo Copy', 'Photocopy');
      
      return formattedOption;
    }).join(', ');
  };

  const employeeId = generateEmployeeId();

  return (
    <div className="space-y-6">
      <div className="bg-[#400504] text-white p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-2">Review Employee Information</h3>
        <p className="text-[#cba235]">
          Please review all information before submitting. Employee ID: <span className="font-mono font-bold">{employeeId}</span>
        </p>
        {isMinor && (
          <div className="mt-2 p-2 bg-amber-100 text-amber-800 rounded text-sm">
            ⚠️ This employee is a minor. Please ensure proper documentation and parental consent.
          </div>
        )}
      </div>

      {/* Basic Information */}
      <div className="border border-gray-200 rounded-lg">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-[#400504]">Basic Information</h4>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <p className="mt-1 text-sm text-gray-900">{formData.firstName || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Middle Name</label>
            <p className="mt-1 text-sm text-gray-900">{formData.middleName || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <p className="mt-1 text-sm text-gray-900">{formData.lastName || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Suffix</label>
            <p className="mt-1 text-sm text-gray-900">{formData.suffix || 'None'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <p className="mt-1 text-sm text-gray-900">{formData.gender || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Civil Status</label>
            <p className="mt-1 text-sm text-gray-900">{formData.civilStatus || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Religion</label>
            <p className="mt-1 text-sm text-gray-900">{formData.religion || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Birthday</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(formData.birthday)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Age</label>
            <p className="mt-1 text-sm text-gray-900">{formData.age || 'Not calculated'}</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Birthplace</label>
            <p className="mt-1 text-sm text-gray-900">{formData.birthplace || 'Not provided'}</p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="border border-gray-200 rounded-lg">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-[#400504]">Contact Information</h4>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Number</label>
            <p className="mt-1 text-sm text-gray-900">{formData.contactNumber || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <p className="mt-1 text-sm text-gray-900">{formData.email || 'Not provided'}</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
            <p className="mt-1 text-sm text-gray-900">{formatEmergencyContact(formData.emergencyContact)}</p>
          </div>
        </div>
      </div>

      {/* Government IDs */}
      <div className="border border-gray-200 rounded-lg">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-[#400504]">Government IDs</h4>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">TIN Number</label>
            <p className="mt-1 text-sm text-gray-900">{formData.tin || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">SSS Number</label>
            <p className="mt-1 text-sm text-gray-900">{formData.sss || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">PhilHealth Number</label>
            <p className="mt-1 text-sm text-gray-900">{formData.philhealth || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">PAG-IBIG Number</label>
            <p className="mt-1 text-sm text-gray-900">{formData.pagibig || 'Not provided'}</p>
          </div>
        </div>
      </div>

      {/* Government ID Requirements */}
      <div className="border border-gray-200 rounded-lg">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-[#400504]">Government ID Requirements</h4>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">TIN Requirements</label>
                  <p className="text-sm font-medium text-gray-900">
                    {formatRequirementStatus(formData.requirements?.tinRequirements)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">SSS Requirements</label>
                  <p className="text-sm font-medium text-gray-900">
                    {formatRequirementStatus(formData.requirements?.sssRequirements)}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">PhilHealth Requirements</label>
                  <p className="text-sm font-medium text-gray-900">
                    {formatRequirementStatus(formData.requirements?.philhealthRequirements)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">PAG-IBIG Requirements</label>
                  <p className="text-sm font-medium text-gray-900">
                    {formatRequirementStatus(formData.requirements?.pagibigRequirements)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BPLO Requirements */}
      <div className="border border-gray-200 rounded-lg">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-[#400504]">BPLO Requirements (CSJDM)</h4>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Health Card</label>
                  <p className="text-sm font-medium text-gray-900">
                    {formatRequirementStatus(formData.requirements?.healthCardRequirements)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Professional ID</label>
                  <p className="text-sm font-medium text-gray-900">
                    {formatRequirementStatus(formData.requirements?.professionalIDRequirements)}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Driver's License</label>
                  <p className="text-sm font-medium text-gray-900">
                    {formatRequirementStatus(formData.requirements?.driversLicenseRequirements)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Barangay Working Permit</label>
                  <p className="text-sm font-medium text-gray-900">
                    {formatRequirementStatus(formData.requirements?.barangayWorkingPermitRequirements)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Occupational Permit Requirements */}
      <div className="border border-gray-200 rounded-lg">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-[#400504]">Occupational Permit Requirements</h4>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Birth Certificate</label>
                  <p className="text-sm font-medium text-gray-900">
                    {formatRequirementStatus(formData.requirements?.birthCertificateRequirements)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Police/NBI Clearance</label>
                  <p className="text-sm font-medium text-gray-900">
                    {formatRequirementStatus(formData.requirements?.policeNbiRequirements)}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Barangay Clearance</label>
                  <p className="text-sm font-medium text-gray-900">
                    {formatRequirementStatus(formData.requirements?.barangayClearanceRequirements)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Cedula</label>
                  <p className="text-sm font-medium text-gray-900">
                    {formatRequirementStatus(formData.requirements?.cedulaRequirements)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="border border-gray-200 rounded-lg">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-[#400504]">Address Information</h4>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Address</label>
            <p className="mt-1 text-sm text-gray-900">{formatAddress(formData.currentAddress)}</p>
          </div>
          {!formData.sameAsCurrent && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Permanent Address</label>
              <p className="mt-1 text-sm text-gray-900">{formatAddress(formData.permanentAddress)}</p>
            </div>
          )}
          {formData.sameAsCurrent && (
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm text-blue-700">✓ Permanent address is same as current address</p>
            </div>
          )}
        </div>
      </div>

      {/* Employment Information */}
      <div className="border border-gray-200 rounded-lg">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-[#400504]">Employment Information</h4>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <p className="mt-1 text-sm text-gray-900">{formData.department || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Position</label>
            <p className="mt-1 text-sm text-gray-900">{formData.position || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Work Type</label>
            <p className="mt-1 text-sm text-gray-900">{formData.workType || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Employee ID</label>
            <p className="mt-1 text-sm text-gray-900 font-mono">{employeeId}</p>
          </div>
          {formData.department === 'Academic Department' && formData.position === 'Teacher' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Teaching Levels</label>
              <p className="mt-1 text-sm text-gray-900">{formatTeachingLevels(formData.teachingLevel)}</p>
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Work Schedule</label>
            <div className="mt-1 space-y-1">
              {formatWorkSchedule(formData.workSchedule).map((schedule, index) => (
                <p key={index} className="text-sm text-gray-900">{schedule}</p>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date Start</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(formData.dateStart)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date Separated</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(formData.dateSeparated)}</p>
          </div>
        </div>
      </div>

      {/* Confirmation */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-800 font-medium">Ready to submit employee information</p>
        </div>
        <p className="text-green-700 text-sm mt-1">
          Click "Save Employee" to add this employee to the system. You can edit the information later if needed.
        </p>
      </div>
    </div>
  );
};

export default ReviewInfo;
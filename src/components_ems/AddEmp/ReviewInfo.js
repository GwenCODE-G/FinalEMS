import React from 'react';

const ReviewInfo = ({ formData, isMinor, generateEmployeeId }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-[#400504]">Review Information</h3>
      
      <div className="bg-gray-50 p-4 rounded-md">
        <h4 className="font-medium text-[#400504]">Basic Information</h4>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <p><span className="font-medium">Name:</span> {formData.firstName || ''} {formData.middleName || ''} {formData.lastName || ''}</p>
          <p><span className="font-medium">Gender:</span> {formData.gender || ''}</p>
          <p><span className="font-medium">Birthday:</span> {formData.birthday || ''}</p>
          <p><span className="font-medium">Age:</span> {formData.age || ''} {isMinor ? '(Minor)' : ''}</p>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-md">
        <h4 className="font-medium text-[#400504]">Contact Information</h4>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <p><span className="font-medium">Contact:</span> {formData.contactNumber || ''}</p>
          <p><span className="font-medium">Email:</span> {formData.email || ''}</p>
          <p><span className="font-medium">Emergency Contact:</span> {formData.emergencyContact?.number || ''} ({formData.emergencyContact?.type || ''})</p>
          <p><span className="font-medium">PhilHealth:</span> {formData.philhealth || 'Not provided'}</p>
          <p><span className="font-medium">SSS:</span> {formData.sss || 'Not provided'}</p>
          <p><span className="font-medium">PAG-IBIG:</span> {formData.pagibig || 'Not provided'}</p>
        </div>
        
        <div className="mt-4">
          <h5 className="font-medium">Current Address</h5>
          <p>{formData.currentAddress?.blkLt || ''} {formData.currentAddress?.street || ''}, {formData.currentAddress?.area || ''}</p>
          <p>{formData.currentAddress?.barangay || ''}, {formData.currentAddress?.city || ''}</p>
          <p>{formData.currentAddress?.province || ''}, {formData.currentAddress?.postalCode || ''}, {formData.currentAddress?.country || ''}</p>
        </div>
        
        {!formData.sameAsCurrent && (
          <div className="mt-4">
            <h5 className="font-medium">Permanent Address</h5>
            <p>{formData.permanentAddress?.blkLt || ''} {formData.permanentAddress?.street || ''}, {formData.permanentAddress?.area || ''}</p>
            <p>{formData.permanentAddress?.barangay || ''}, {formData.permanentAddress?.city || ''}</p>
            <p>{formData.permanentAddress?.province || ''}, {formData.permanentAddress?.postalCode || ''}, {formData.permanentAddress?.country || ''}</p>
          </div>
        )}
      </div>
      
      <div className="bg-gray-50 p-4 rounded-md">
        <h4 className="font-medium text-[#400504]">Employment Details</h4>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <p><span className="font-medium">Department:</span> {formData.department || ''}</p>
          <p><span className="font-medium">Position:</span> {formData.position || ''}</p>
          <p><span className="font-medium">Work Type:</span> {formData.workType || ''}</p>
          <p><span className="font-medium">Employee ID:</span> {generateEmployeeId()}</p>
        </div>
        
        {formData.department === 'Academic' && formData.position === 'Teacher' && formData.teachingLevel?.length > 0 && (
          <div className="mt-4">
            <h5 className="font-medium">Teaching Levels</h5>
            <p>{formData.teachingLevel.join(', ')}</p>
          </div>
        )}
        
        <div className="mt-4">
          <h5 className="font-medium">Work Schedule</h5>
          {Object.entries(formData.workSchedule || {})
            .filter(([_, schedule]) => schedule.active && schedule.end)
            .map(([day, schedule]) => (
              <p key={day}><span className="font-medium">{day}:</span> {schedule.start} - {schedule.end}</p>
            ))
          }
        </div>
      </div>
      
      <div className="flex items-center">
        <input
          type="checkbox"
          id="confirmInfo"
          className="h-4 w-4 text-[#400504] focus:ring-[#400504] border-gray-300 rounded"
          required
        />
        <label htmlFor="confirmInfo" className="ml-2 block text-sm text-gray-900">
          I confirm that all information is correct
        </label>
      </div>
    </div>
  );
};

export default ReviewInfo;
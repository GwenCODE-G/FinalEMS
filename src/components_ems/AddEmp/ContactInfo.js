import React from 'react';

const ContactInfo = ({ formData, errors, handleInputChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-[#400504]">Contact Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Contact Number *</label>
          <input
            type="text"
            name="contactNumber"
            value={formData.contactNumber || ''}
            onChange={handleInputChange}
            pattern="[0-9]{11}"
            maxLength="11"
            placeholder="09123456789"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
          <p className="text-xs text-gray-500 mt-1">11 digits only</p>
          {errors.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.contactNumber}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Email Address *</label>
          <input
            type="email"
            name="email"
            value={formData.email || ''}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Emergency Contact Type *</label>
          <select
            name="emergencyContact.type"
            value={formData.emergencyContact?.type || 'Mobile'}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          >
            <option value="Mobile">Mobile</option>
            <option value="Landline">Landline</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Emergency Contact Number *
          </label>
          <input
            type="text"
            name="emergencyContact.number"
            value={formData.emergencyContact?.number || ''}
            onChange={handleInputChange}
            pattern={formData.emergencyContact?.type === 'Mobile' ? '[0-9]{11}' : '[0-9]{8}'}
            maxLength={formData.emergencyContact?.type === 'Mobile' ? 11 : 8}
            placeholder={formData.emergencyContact?.type === 'Mobile' ? '09123456789' : '71234567'}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.emergencyContact?.type === 'Mobile' ? '11 digits only' : '8 digits only'}
          </p>
          {errors.emergencyContact && <p className="text-red-500 text-xs mt-1">{errors.emergencyContact}</p>}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">PhilHealth Number</label>
          <input
            type="text"
            name="philhealth"
            value={formData.philhealth || ''}
            onChange={handleInputChange}
            pattern="[0-9]{12}"
            maxLength="12"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
          <p className="text-xs text-gray-500 mt-1">12 digits only</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">SSS Number</label>
          <input
            type="text"
            name="sss"
            value={formData.sss || ''}
            onChange={handleInputChange}
            pattern="[0-9]{10}"
            maxLength="10"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
          <p className="text-xs text-gray-500 mt-1">10 digits only</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">PAG-IBIG Number</label>
          <input
            type="text"
            name="pagibig"
            value={formData.pagibig || ''}
            onChange={handleInputChange}
            pattern="[0-9]{12}"
            maxLength="12"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
          <p className="text-xs text-gray-500 mt-1">12 digits only</p>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
        <input
          type="file"
          name="profilePicture"
          onChange={handleInputChange}
          accept="image/*"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>
      
      <div className="space-y-4">
        <h4 className="text-md font-medium text-[#400504]">Current Address</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Blk/Lt</label>
            <input
              type="text"
              name="currentAddress.blkLt"
              value={formData.currentAddress?.blkLt || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Street</label>
            <input
              type="text"
              name="currentAddress.street"
              value={formData.currentAddress?.street || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Area</label>
            <input
              type="text"
              name="currentAddress.area"
              value={formData.currentAddress?.area || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Barangay</label>
            <input
              type="text"
              name="currentAddress.barangay"
              value={formData.currentAddress?.barangay || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input
              type="text"
              name="currentAddress.city"
              value={formData.currentAddress?.city || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Province</label>
            <input
              type="text"
              name="currentAddress.province"
              value={formData.currentAddress?.province || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Postal Code</label>
            <input
              type="text"
              name="currentAddress.postalCode"
              value={formData.currentAddress?.postalCode || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Country</label>
            <input
              type="text"
              name="currentAddress.country"
              value={formData.currentAddress?.country || 'Philippines'}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
        </div>
      </div>
      
      <div className="flex items-center">
        <input
          type="checkbox"
          name="sameAsCurrent"
          checked={formData.sameAsCurrent || false}
          onChange={handleInputChange}
          className="h-4 w-4 text-[#400504] focus:ring-[#400504] border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">Same as current address</label>
      </div>
      
      {!formData.sameAsCurrent && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-[#400504]">Permanent Address</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Blk/Lt</label>
              <input
                type="text"
                name="permanentAddress.blkLt"
                value={formData.permanentAddress?.blkLt || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Street</label>
              <input
                type="text"
                name="permanentAddress.street"
                value={formData.permanentAddress?.street || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Area</label>
              <input
                type="text"
                name="permanentAddress.area"
                value={formData.permanentAddress?.area || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Barangay</label>
              <input
                type="text"
                name="permanentAddress.barangay"
                value={formData.permanentAddress?.barangay || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">City</label>
              <input
                type="text"
                name="permanentAddress.city"
                value={formData.permanentAddress?.city || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Province</label>
              <input
                type="text"
                name="permanentAddress.province"
                value={formData.permanentAddress?.province || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Postal Code</label>
              <input
                type="text"
                name="permanentAddress.postalCode"
                value={formData.permanentAddress?.postalCode || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Country</label>
              <input
                type="text"
                name="permanentAddress.country"
                value={formData.permanentAddress?.country || 'Philippines'}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactInfo;
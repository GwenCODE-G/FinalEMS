import React, { useState, useEffect } from 'react';
import PhoneNumberValidation from './PhoneNumberValidation';

const ContactInfo = ({ formData, errors, handleInputChange }) => {
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState({
    provinces: false,
    cities: false,
    barangays: false
  });

  // Fetch provinces from PSGC API
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoading(prev => ({ ...prev, provinces: true }));
      try {
        const response = await fetch('https://psgc.gitlab.io/api/provinces/');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setProvinces(data);
      } catch (error) {
        console.error('Error fetching provinces:', error);
        // Fallback to empty array
        setProvinces([]);
      } finally {
        setLoading(prev => ({ ...prev, provinces: false }));
      }
    };
    fetchProvinces();
  }, []);

  // Fetch cities when province changes
  useEffect(() => {
    if (formData.currentAddress?.provinceCode) {
      const fetchCities = async () => {
        setLoading(prev => ({ ...prev, cities: true }));
        try {
          const response = await fetch(`https://psgc.gitlab.io/api/provinces/${formData.currentAddress.provinceCode}/cities-municipalities/`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setCities(data);
        } catch (error) {
          console.error('Error fetching cities:', error);
          setCities([]);
        } finally {
          setLoading(prev => ({ ...prev, cities: false }));
        }
      };
      fetchCities();
    } else {
      setCities([]);
      setBarangays([]);
    }
  }, [formData.currentAddress?.provinceCode]);

  // Fetch barangays when city changes
  useEffect(() => {
    if (formData.currentAddress?.cityCode) {
      const fetchBarangays = async () => {
        setLoading(prev => ({ ...prev, barangays: true }));
        try {
          const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${formData.currentAddress.cityCode}/barangays/`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setBarangays(data);
        } catch (error) {
          console.error('Error fetching barangays:', error);
          setBarangays([]);
        } finally {
          setLoading(prev => ({ ...prev, barangays: false }));
        }
      };
      fetchBarangays();
    } else {
      setBarangays([]);
    }
  }, [formData.currentAddress?.cityCode]);

  const handleProvinceChange = (e) => {
    const selectedProvince = provinces.find(p => p.code === e.target.value);
    
    // Update province name and code
    handleInputChange({
      target: {
        name: 'currentAddress.province',
        value: selectedProvince?.name || ''
      }
    });
    handleInputChange({
      target: {
        name: 'currentAddress.provinceCode',
        value: e.target.value
      }
    });
    
    // Reset dependent fields
    handleInputChange({
      target: {
        name: 'currentAddress.city',
        value: ''
      }
    });
    handleInputChange({
      target: {
        name: 'currentAddress.cityCode',
        value: ''
      }
    });
    handleInputChange({
      target: {
        name: 'currentAddress.barangay',
        value: ''
      }
    });
    handleInputChange({
      target: {
        name: 'currentAddress.barangayCode',
        value: ''
      }
    });
  };

  const handleCityChange = (e) => {
    const selectedCity = cities.find(c => c.code === e.target.value);
    
    handleInputChange({
      target: {
        name: 'currentAddress.city',
        value: selectedCity?.name || ''
      }
    });
    handleInputChange({
      target: {
        name: 'currentAddress.cityCode',
        value: e.target.value
      }
    });
    
    // Reset barangay when city changes
    handleInputChange({
      target: {
        name: 'currentAddress.barangay',
        value: ''
      }
    });
    handleInputChange({
      target: {
        name: 'currentAddress.barangayCode',
        value: ''
      }
    });
  };

  const handleBarangayChange = (e) => {
    const selectedBarangay = barangays.find(b => b.code === e.target.value);
    handleInputChange({
      target: {
        name: 'currentAddress.barangay',
        value: selectedBarangay?.name || ''
      }
    });
    handleInputChange({
      target: {
        name: 'currentAddress.barangayCode',
        value: e.target.value
      }
    });
  };

  // Handle phone number changes for all phone fields
  const handlePhoneChange = (fieldName, phoneNumber, isValid) => {
    handleInputChange({
      target: {
        name: fieldName,
        value: phoneNumber
      }
    });
  };

  // Format phone number input to only allow digits (for landline and government IDs)
  const formatPhoneInput = (e) => {
    const { name, value } = e.target;
    // Remove any non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    handleInputChange({
      target: {
        name: name,
        value: digitsOnly
      }
    });
  };

  // Handle emergency contact type change
  const handleEmergencyContactTypeChange = (e) => {
    handleInputChange(e);
    // Clear the phone number when type changes
    if (e.target.value === 'Mobile') {
      handleInputChange({
        target: {
          name: 'emergencyContact.landline',
          value: ''
        }
      });
    } else {
      handleInputChange({
        target: {
          name: 'emergencyContact.mobile',
          value: ''
        }
      });
    }
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleInputChange({
        target: {
          name: 'profilePicture',
          value: file
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-[#400504] border-b pb-2">Contact Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact Number */}
        <div>
          <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Contact Number *
          </label>
          <PhoneNumberValidation
            value={formData.contactNumber || ''}
            onChange={(phoneNumber, isValid) => handlePhoneChange('contactNumber', phoneNumber, isValid)}
            required={true}
            digitsOnly={true}
          />
          <p className="text-xs text-gray-500 mt-1">Enter your mobile number with country code (e.g., +639171234567)</p>
          {errors.contactNumber && (
            <p className="text-red-500 text-xs mt-1">{errors.contactNumber}</p>
          )}
        </div>
        
        {/* Email Address */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email || ''}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
              errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="employee@email.com"
            required
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-red-500 text-xs mt-1">{errors.email}</p>
          )}
        </div>
      </div>
      
      {/* Emergency Contact */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-[#400504]">Emergency Contact</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Contact Name *
            </label>
            <input
              id="emergencyContactName"
              name="emergencyContact.name"
              type="text"
              value={formData.emergencyContact?.name || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                errors.emergencyContactName ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter contact name"
              required
            />
            {errors.emergencyContactName && (
              <p className="text-red-500 text-xs mt-1">{errors.emergencyContactName}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="emergencyContactRelationship" className="block text-sm font-medium text-gray-700 mb-1">
              Relationship *
            </label>
            <input
              id="emergencyContactRelationship"
              name="emergencyContact.relationship"
              type="text"
              value={formData.emergencyContact?.relationship || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                errors.emergencyContactRelationship ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="e.g., Spouse, Parent"
              required
            />
            {errors.emergencyContactRelationship && (
              <p className="text-red-500 text-xs mt-1">{errors.emergencyContactRelationship}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="emergencyContactType" className="block text-sm font-medium text-gray-700 mb-1">
              Contact Type *
            </label>
            <select
              id="emergencyContactType"
              name="emergencyContact.type"
              value={formData.emergencyContact?.type || 'Mobile'}
              onChange={handleEmergencyContactTypeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
            >
              <option value="Mobile">Mobile</option>
              <option value="Landline">Landline</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="emergencyContactNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number *
            </label>
            {formData.emergencyContact?.type === 'Mobile' ? (
              <PhoneNumberValidation
                value={formData.emergencyContact?.mobile || ''}
                onChange={(phoneNumber, isValid) => handlePhoneChange('emergencyContact.mobile', phoneNumber, isValid)}
                required={true}
                digitsOnly={true}
              />
            ) : (
              <div className="flex">
                <input
                  id="emergencyContactNumber"
                  name="emergencyContact.landline"
                  type="text"
                  value={formData.emergencyContact?.landline || ''}
                  onChange={formatPhoneInput}
                  maxLength="11"
                  placeholder="71234567"
                  className={`flex-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                    errors.emergencyContactNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  required
                />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {formData.emergencyContact?.type === 'Mobile' 
                ? 'Enter mobile number with country code (e.g., +639171234567)' 
                : 'Enter landline number (7-11 digits, e.g., 71234567)'}
            </p>
            {errors.emergencyContactNumber && (
              <p className="text-red-500 text-xs mt-1">{errors.emergencyContactNumber}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Government IDs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="philhealth" className="block text-sm font-medium text-gray-700 mb-1">
            PhilHealth Number
          </label>
          <input
            id="philhealth"
            name="philhealth"
            type="text"
            value={formData.philhealth || ''}
            onChange={formatPhoneInput}
            maxLength="12"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
              errors.philhealth ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="000000000000"
          />
          <p className="text-xs text-gray-500 mt-1">12 digits only</p>
          {errors.philhealth && (
            <p className="text-red-500 text-xs mt-1">{errors.philhealth}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="sss" className="block text-sm font-medium text-gray-700 mb-1">
            SSS Number
          </label>
          <input
            id="sss"
            name="sss"
            type="text"
            value={formData.sss || ''}
            onChange={formatPhoneInput}
            maxLength="10"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
              errors.sss ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="0000000000"
          />
          <p className="text-xs text-gray-500 mt-1">10 digits only</p>
          {errors.sss && (
            <p className="text-red-500 text-xs mt-1">{errors.sss}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="pagibig" className="block text-sm font-medium text-gray-700 mb-1">
            PAG-IBIG Number
          </label>
          <input
            id="pagibig"
            name="pagibig"
            type="text"
            value={formData.pagibig || ''}
            onChange={formatPhoneInput}
            maxLength="12"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
              errors.pagibig ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="000000000000"
          />
          <p className="text-xs text-gray-500 mt-1">12 digits only</p>
          {errors.pagibig && (
            <p className="text-red-500 text-xs mt-1">{errors.pagibig}</p>
          )}
        </div>
      </div>
      
      {/* Profile Picture */}
      <div>
        <label htmlFor="profilePicture" className="block text-sm font-medium text-gray-700 mb-1">
          Profile Picture
        </label>
        <input
          id="profilePicture"
          name="profilePicture"
          type="file"
          onChange={handleFileChange}
          accept="image/*"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#400504] file:text-white hover:file:bg-[#300404]"
        />
        {errors.profilePicture && (
          <p className="text-red-500 text-xs mt-1">{errors.profilePicture}</p>
        )}
      </div>
      
      {/* Current Address */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-[#400504] border-b pb-1">Current Address</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="currentBlkLt" className="block text-sm font-medium text-gray-700 mb-1">
              Blk/Lt
            </label>
            <input
              id="currentBlkLt"
              name="currentAddress.blkLt"
              type="text"
              value={formData.currentAddress?.blkLt || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
              placeholder="Block 1 Lot 2"
            />
          </div>
          
          <div>
            <label htmlFor="currentStreet" className="block text-sm font-medium text-gray-700 mb-1">
              Street
            </label>
            <input
              id="currentStreet"
              name="currentAddress.street"
              type="text"
              value={formData.currentAddress?.street || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
              placeholder="Main Street"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="currentProvince" className="block text-sm font-medium text-gray-700 mb-1">
              Province *
            </label>
            <select
              id="currentProvince"
              name="currentAddress.provinceCode"
              value={formData.currentAddress?.provinceCode || ''}
              onChange={handleProvinceChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                errors.currentAddress?.province ? 'border-red-500 bg-red-50' : 'border-gray-300'
              } ${loading.provinces ? 'opacity-50 cursor-not-allowed' : ''}`}
              required
              disabled={loading.provinces}
              aria-describedby="currentProvince-help"
            >
              <option value="">{loading.provinces ? 'Loading provinces...' : 'Select Province'}</option>
              {provinces.map(province => (
                <option key={province.code} value={province.code}>
                  {province.name}
                </option>
              ))}
            </select>
            <p id="currentProvince-help" className="text-xs text-gray-500 mt-1">Select your province</p>
            {errors.currentAddress?.province && (
              <p className="text-red-500 text-xs mt-1">{errors.currentAddress.province}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="currentCity" className="block text-sm font-medium text-gray-700 mb-1">
              City/Municipality *
            </label>
            <select
              id="currentCity"
              name="currentAddress.cityCode"
              value={formData.currentAddress?.cityCode || ''}
              onChange={handleCityChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.currentAddress?.city ? 'border-red-500 bg-red-50' : 'border-gray-300'
              } ${loading.cities ? 'opacity-50' : ''}`}
              required
              disabled={!formData.currentAddress?.provinceCode || loading.cities}
              aria-describedby="currentCity-help"
            >
              <option value="">
                {loading.cities ? 'Loading cities...' : !formData.currentAddress?.provinceCode ? 'Select province first' : 'Select City/Municipality'}
              </option>
              {cities.map(city => (
                <option key={city.code} value={city.code}>
                  {city.name}
                </option>
              ))}
            </select>
            <p id="currentCity-help" className="text-xs text-gray-500 mt-1">
              {!formData.currentAddress?.provinceCode ? 'Select province first' : 'Select your city/municipality'}
            </p>
            {errors.currentAddress?.city && (
              <p className="text-red-500 text-xs mt-1">{errors.currentAddress.city}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="currentBarangay" className="block text-sm font-medium text-gray-700 mb-1">
              Barangay *
            </label>
            <select
              id="currentBarangay"
              name="currentAddress.barangayCode"
              value={formData.currentAddress?.barangayCode || ''}
              onChange={handleBarangayChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.currentAddress?.barangay ? 'border-red-500 bg-red-50' : 'border-gray-300'
              } ${loading.barangays ? 'opacity-50' : ''}`}
              required
              disabled={!formData.currentAddress?.cityCode || loading.barangays}
              aria-describedby="currentBarangay-help"
            >
              <option value="">
                {loading.barangays ? 'Loading barangays...' : !formData.currentAddress?.cityCode ? 'Select city first' : 'Select Barangay'}
              </option>
              {barangays.map(barangay => (
                <option key={barangay.code} value={barangay.code}>
                  {barangay.name}
                </option>
              ))}
            </select>
            <p id="currentBarangay-help" className="text-xs text-gray-500 mt-1">
              {!formData.currentAddress?.cityCode ? 'Select city first' : 'Select your barangay'}
            </p>
            {errors.currentAddress?.barangay && (
              <p className="text-red-500 text-xs mt-1">{errors.currentAddress.barangay}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="currentPostalCode" className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code
            </label>
            <input
              id="currentPostalCode"
              name="currentAddress.postalCode"
              type="text"
              value={formData.currentAddress?.postalCode || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
              placeholder="1000"
            />
          </div>
          
          <div>
            <label htmlFor="currentCountry" className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              id="currentCountry"
              name="currentAddress.country"
              type="text"
              value={formData.currentAddress?.country || 'Philippines'}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              readOnly
            />
          </div>
        </div>
      </div>
      
      {/* Same as Current Address Checkbox */}
      <div className="flex items-center">
        <input
          id="sameAsCurrent"
          name="sameAsCurrent"
          type="checkbox"
          checked={formData.sameAsCurrent || false}
          onChange={handleInputChange}
          className="h-4 w-4 text-[#400504] focus:ring-[#400504] border-gray-300 rounded"
        />
        <label htmlFor="sameAsCurrent" className="ml-2 block text-sm text-gray-900">
          Use same address for permanent address
        </label>
      </div>
      
      {/* Permanent Address */}
      {!formData.sameAsCurrent && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-[#400504] border-b pb-1">Permanent Address</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="permanentBlkLt" className="block text-sm font-medium text-gray-700 mb-1">
                Blk/Lt
              </label>
              <input
                id="permanentBlkLt"
                name="permanentAddress.blkLt"
                type="text"
                value={formData.permanentAddress?.blkLt || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                placeholder="Block 1 Lot 2"
              />
            </div>
            
            <div>
              <label htmlFor="permanentStreet" className="block text-sm font-medium text-gray-700 mb-1">
                Street
              </label>
              <input
                id="permanentStreet"
                name="permanentAddress.street"
                type="text"
                value={formData.permanentAddress?.street || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                placeholder="Main Street"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="permanentProvince" className="block text-sm font-medium text-gray-700 mb-1">
                Province
              </label>
              <input
                id="permanentProvince"
                name="permanentAddress.province"
                type="text"
                value={formData.permanentAddress?.province || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                placeholder="Metro Manila"
              />
            </div>
            
            <div>
              <label htmlFor="permanentCity" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                id="permanentCity"
                name="permanentAddress.city"
                type="text"
                value={formData.permanentAddress?.city || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                placeholder="Quezon City"
              />
            </div>
            
            <div>
              <label htmlFor="permanentBarangay" className="block text-sm font-medium text-gray-700 mb-1">
                Barangay
              </label>
              <input
                id="permanentBarangay"
                name="permanentAddress.barangay"
                type="text"
                value={formData.permanentAddress?.barangay || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                placeholder="Barangay 1"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="permanentPostalCode" className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <input
                id="permanentPostalCode"
                name="permanentAddress.postalCode"
                type="text"
                value={formData.permanentAddress?.postalCode || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                placeholder="1000"
              />
            </div>
            
            <div>
              <label htmlFor="permanentCountry" className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                id="permanentCountry"
                name="permanentAddress.country"
                type="text"
                value={formData.permanentAddress?.country || 'Philippines'}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactInfo;
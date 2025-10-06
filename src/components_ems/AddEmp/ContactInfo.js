import React, { useState, useEffect, useCallback } from 'react';
import PhoneNumberValidation from './PhoneNumberValidation';

const ContactInfo = ({ formData, errors, handleInputChange }) => {
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [permanentProvinces, setPermanentProvinces] = useState([]);
  const [permanentCities, setPermanentCities] = useState([]);
  const [permanentBarangays, setPermanentBarangays] = useState([]);
  const [postalCode, setPostalCode] = useState('');
  const [permanentPostalCode, setPermanentPostalCode] = useState('');
  const [loading, setLoading] = useState({
    provinces: false,
    cities: false,
    barangays: false,
    permanentProvinces: false,
    permanentCities: false,
    permanentBarangays: false
  });

  // Relationship options (excluding daughter and non-blood related)
  const relationshipOptions = [
    'Spouse',
    'Parent',
    'Aunt',
    'Uncle',
    'Cousin',
    'Father-in-law',
    'Mother-in-law',
    'Brother-in-law',
    'Sister-in-law',
    'Guardian'
  ];

  // Set default emergency contact type to Landline
  useEffect(() => {
    if (!formData.emergencyContact?.type) {
      handleInputChange({
        target: {
          name: 'emergencyContact.type',
          value: 'Landline'
        }
      });
    }
  }, [formData.emergencyContact?.type, handleInputChange]);

  // Fetch provinces from PSGC API for current address
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoading(prev => ({ ...prev, provinces: true }));
      try {
        const response = await fetch('https://psgc.gitlab.io/api/provinces/');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Sort provinces alphabetically
        const sortedProvinces = data.sort((a, b) => a.name.localeCompare(b.name));
        setProvinces(sortedProvinces);
      } catch (error) {
        console.error('Error fetching provinces:', error);
        setProvinces([]);
      } finally {
        setLoading(prev => ({ ...prev, provinces: false }));
      }
    };
    fetchProvinces();
  }, []);

  // Fetch provinces from PSGC API for permanent address
  useEffect(() => {
    const fetchPermanentProvinces = async () => {
      setLoading(prev => ({ ...prev, permanentProvinces: true }));
      try {
        const response = await fetch('https://psgc.gitlab.io/api/provinces/');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Sort provinces alphabetically
        const sortedProvinces = data.sort((a, b) => a.name.localeCompare(b.name));
        setPermanentProvinces(sortedProvinces);
      } catch (error) {
        console.error('Error fetching permanent provinces:', error);
        setPermanentProvinces([]);
      } finally {
        setLoading(prev => ({ ...prev, permanentProvinces: false }));
      }
    };
    
    if (!formData.sameAsCurrent) {
      fetchPermanentProvinces();
    }
  }, [formData.sameAsCurrent]);

  // Fetch cities when province changes for current address
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
          // Sort cities alphabetically
          const sortedCities = data.sort((a, b) => a.name.localeCompare(b.name));
          setCities(sortedCities);
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

  // Fetch cities when province changes for permanent address
  useEffect(() => {
    if (formData.permanentAddress?.provinceCode && !formData.sameAsCurrent) {
      const fetchPermanentCities = async () => {
        setLoading(prev => ({ ...prev, permanentCities: true }));
        try {
          const response = await fetch(`https://psgc.gitlab.io/api/provinces/${formData.permanentAddress.provinceCode}/cities-municipalities/`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          // Sort cities alphabetically
          const sortedCities = data.sort((a, b) => a.name.localeCompare(b.name));
          setPermanentCities(sortedCities);
        } catch (error) {
          console.error('Error fetching permanent cities:', error);
          setPermanentCities([]);
        } finally {
          setLoading(prev => ({ ...prev, permanentCities: false }));
        }
      };
      fetchPermanentCities();
    } else {
      setPermanentCities([]);
      setPermanentBarangays([]);
    }
  }, [formData.permanentAddress?.provinceCode, formData.sameAsCurrent]);

  // Fetch barangays when city changes for current address
  const fetchBarangays = useCallback(async (cityCode) => {
    setLoading(prev => ({ ...prev, barangays: true }));
    try {
      const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Sort barangays alphabetically
      const sortedBarangays = data.sort((a, b) => a.name.localeCompare(b.name));
      setBarangays(sortedBarangays);
      
      // Try to get postal code from city data - ONLY SUGGEST, DON'T AUTO-FILL
      const selectedCity = cities.find(city => city.code === cityCode);
      if (selectedCity && selectedCity.postalCode) {
        setPostalCode(selectedCity.postalCode);
        // Don't automatically update the form data - let user decide
      }
    } catch (error) {
      console.error('Error fetching barangays:', error);
      setBarangays([]);
    } finally {
      setLoading(prev => ({ ...prev, barangays: false }));
    }
  }, [cities]);

  // Fetch barangays when city changes for permanent address
  const fetchPermanentBarangays = useCallback(async (cityCode) => {
    setLoading(prev => ({ ...prev, permanentBarangays: true }));
    try {
      const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Sort barangays alphabetically
      const sortedBarangays = data.sort((a, b) => a.name.localeCompare(b.name));
      setPermanentBarangays(sortedBarangays);
      
      // Try to get postal code from city data - ONLY SUGGEST, DON'T AUTO-FILL
      const selectedCity = permanentCities.find(city => city.code === cityCode);
      if (selectedCity && selectedCity.postalCode) {
        setPermanentPostalCode(selectedCity.postalCode);
        // Don't automatically update the form data - let user decide
      }
    } catch (error) {
      console.error('Error fetching permanent barangays:', error);
      setPermanentBarangays([]);
    } finally {
      setLoading(prev => ({ ...prev, permanentBarangays: false }));
    }
  }, [permanentCities]);

  useEffect(() => {
    if (formData.currentAddress?.cityCode) {
      fetchBarangays(formData.currentAddress.cityCode);
    } else {
      setBarangays([]);
      setPostalCode('');
    }
  }, [formData.currentAddress?.cityCode, fetchBarangays]);

  useEffect(() => {
    if (formData.permanentAddress?.cityCode && !formData.sameAsCurrent) {
      fetchPermanentBarangays(formData.permanentAddress.cityCode);
    } else {
      setPermanentBarangays([]);
      setPermanentPostalCode('');
    }
  }, [formData.permanentAddress?.cityCode, formData.sameAsCurrent, fetchPermanentBarangays]);

  // Auto-capitalize first letter of name fields and street
  const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // Handle street input with auto-capitalization
  const handleStreetChange = (addressType, value) => {
    const capitalizedValue = capitalizeFirstLetter(value);
    handleInputChange({
      target: {
        name: `${addressType}.street`,
        value: capitalizedValue
      }
    });
  };

  // Handle province change for current address
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
    handleInputChange({
      target: {
        name: 'currentAddress.postalCode',
        value: ''
      }
    });
    setPostalCode('');
  };

  // Handle province change for permanent address
  const handlePermanentProvinceChange = (e) => {
    const selectedProvince = permanentProvinces.find(p => p.code === e.target.value);
    
    // Update province name and code
    handleInputChange({
      target: {
        name: 'permanentAddress.province',
        value: selectedProvince?.name || ''
      }
    });
    handleInputChange({
      target: {
        name: 'permanentAddress.provinceCode',
        value: e.target.value
      }
    });
    
    // Reset dependent fields
    handleInputChange({
      target: {
        name: 'permanentAddress.city',
        value: ''
      }
    });
    handleInputChange({
      target: {
        name: 'permanentAddress.cityCode',
        value: ''
      }
    });
    handleInputChange({
      target: {
        name: 'permanentAddress.barangay',
        value: ''
      }
    });
    handleInputChange({
      target: {
        name: 'permanentAddress.barangayCode',
        value: ''
      }
    });
    handleInputChange({
      target: {
        name: 'permanentAddress.postalCode',
        value: ''
      }
    });
    setPermanentPostalCode('');
  };

  // Handle city change for current address
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
    
    // Set postal code as suggestion only, don't auto-fill
    if (selectedCity?.postalCode) {
      setPostalCode(selectedCity.postalCode);
      // Don't automatically update the form data
    }
  };

  // Handle city change for permanent address
  const handlePermanentCityChange = (e) => {
    const selectedCity = permanentCities.find(c => c.code === e.target.value);
    
    handleInputChange({
      target: {
        name: 'permanentAddress.city',
        value: selectedCity?.name || ''
      }
    });
    handleInputChange({
      target: {
        name: 'permanentAddress.cityCode',
        value: e.target.value
      }
    });
    
    // Reset barangay when city changes
    handleInputChange({
      target: {
        name: 'permanentAddress.barangay',
        value: ''
      }
    });
    handleInputChange({
      target: {
        name: 'permanentAddress.barangayCode',
        value: ''
      }
    });
    
    // Set postal code as suggestion only, don't auto-fill
    if (selectedCity?.postalCode) {
      setPermanentPostalCode(selectedCity.postalCode);
      // Don't automatically update the form data
    }
  };

  // Handle barangay change for current address
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

  // Handle barangay change for permanent address
  const handlePermanentBarangayChange = (e) => {
    const selectedBarangay = permanentBarangays.find(b => b.code === e.target.value);
    handleInputChange({
      target: {
        name: 'permanentAddress.barangay',
        value: selectedBarangay?.name || ''
      }
    });
    handleInputChange({
      target: {
        name: 'permanentAddress.barangayCode',
        value: e.target.value
      }
    });
  };

  // Handle phone number changes using PhoneNumberValidation component
  const handlePhoneChange = (fieldName, phoneNumber, isValid) => {
    handleInputChange({
      target: {
        name: fieldName,
        value: phoneNumber
      }
    });
  };

  // SIMPLE: Government ID handler - no formatting
  const handleGovernmentIdChange = (e) => {
    const { name, value } = e.target;
    
    handleInputChange({
      target: {
        name: name,
        value: value
      }
    });
  };

  // Combined emergency contact handler with auto-capitalization
  const handleEmergencyContactChange = (field, value) => {
    if (field === 'type') {
      handleInputChange({
        target: {
          name: 'emergencyContact.type',
          value: value
        }
      });
      // Clear the contact number when type changes
      handleInputChange({
        target: {
          name: 'emergencyContact.mobile',
          value: ''
        }
      });
      handleInputChange({
        target: {
          name: 'emergencyContact.landline',
          value: ''
        }
      });
    } else if (field === 'firstName' || field === 'lastName') {
      // Auto-capitalize first letter for name fields
      const capitalizedValue = capitalizeFirstLetter(value);
      handleInputChange({
        target: {
          name: `emergencyContact.${field}`,
          value: capitalizedValue
        }
      });
    } else {
      handleInputChange({
        target: {
          name: `emergencyContact.${field}`,
          value: value
        }
      });
    }
  };

  // Format landline input
  const formatLandlineInput = (e) => {
    const { value } = e.target;
    // Remove any non-digit characters and limit to 11 digits
    const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
    handleEmergencyContactChange('landline', digitsOnly);
  };

  // Handle postal code change - allow manual input for current address
  const handlePostalCodeChange = (e) => {
    const { value } = e.target;
    setPostalCode(value);
    handleInputChange({
      target: {
        name: 'currentAddress.postalCode',
        value: value
      }
    });
  };

  // Handle postal code change - allow manual input for permanent address
  const handlePermanentPostalCodeChange = (e) => {
    const { value } = e.target;
    setPermanentPostalCode(value);
    handleInputChange({
      target: {
        name: 'permanentAddress.postalCode',
        value: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-[#400504] border-b pb-2">Contact Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact Number - Updated with PhoneNumberValidation */}
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
          <p className="text-xs text-gray-500 mt-1">Philippines format only (+63)</p>
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
      
      {/* Emergency Contact - Updated with First Name, Last Name, and Relationship Dropdown */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-[#400504]">Emergency Contact</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="emergencyContactFirstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              id="emergencyContactFirstName"
              name="emergencyContact.firstName"
              type="text"
              value={formData.emergencyContact?.firstName || ''}
              onChange={(e) => handleEmergencyContactChange('firstName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                errors.emergencyContactFirstName ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter first name"
              required
            />
            {errors.emergencyContactFirstName && (
              <p className="text-red-500 text-xs mt-1">{errors.emergencyContactFirstName}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="emergencyContactLastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              id="emergencyContactLastName"
              name="emergencyContact.lastName"
              type="text"
              value={formData.emergencyContact?.lastName || ''}
              onChange={(e) => handleEmergencyContactChange('lastName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                errors.emergencyContactLastName ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter last name"
              required
            />
            {errors.emergencyContactLastName && (
              <p className="text-red-500 text-xs mt-1">{errors.emergencyContactLastName}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="emergencyContactRelationship" className="block text-sm font-medium text-gray-700 mb-1">
              Relationship *
            </label>
            <select
              id="emergencyContactRelationship"
              name="emergencyContact.relationship"
              value={formData.emergencyContact?.relationship || ''}
              onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                errors.emergencyContactRelationship ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Select Relationship</option>
              {relationshipOptions.map((relationship) => (
                <option key={relationship} value={relationship}>
                  {relationship}
                </option>
              ))}
            </select>
            {errors.emergencyContactRelationship && (
              <p className="text-red-500 text-xs mt-1">{errors.emergencyContactRelationship}</p>
            )}
          </div>
        </div>
        
        {/* Combined Contact Type and Number Field */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label htmlFor="emergencyContactType" className="block text-sm font-medium text-gray-700 mb-1">
              Contact Type *
            </label>
            <select
              id="emergencyContactType"
              name="emergencyContact.type"
              value={formData.emergencyContact?.type || 'Landline'}
              onChange={(e) => handleEmergencyContactChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
            >
              <option value="Landline">Landline</option>
              <option value="Mobile">Mobile</option>
            </select>
          </div>
          
          <div className="md:col-span-2">
            <label htmlFor="emergencyContactNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number *
            </label>
            {formData.emergencyContact?.type === 'Mobile' ? (
              <PhoneNumberValidation
                value={formData.emergencyContact?.mobile || ''}
                onChange={(phoneNumber, isValid) => handleEmergencyContactChange('mobile', phoneNumber)}
                required={true}
                digitsOnly={true}
              />
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-gray-500 text-sm">+</span>
                </div>
                <input
                  id="emergencyContactNumber"
                  name="emergencyContact.landline"
                  type="text"
                  value={formData.emergencyContact?.landline || ''}
                  onChange={formatLandlineInput}
                  maxLength="11"
                  placeholder="63271234567"
                  className={`w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                    errors.emergencyContactNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  required
                />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {formData.emergencyContact?.type === 'Mobile' 
                ? 'Philippines mobile format (+63)' 
                : 'Enter landline number with area code (e.g., 63271234567)'}
            </p>
            {errors.emergencyContactNumber && (
              <p className="text-red-500 text-xs mt-1">{errors.emergencyContactNumber}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Government IDs - SIMPLE: No formatting */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="sss" className="block text-sm font-medium text-gray-700 mb-1">
            SSS Number
          </label>
          <input
            id="sss"
            name="sss"
            type="text"
            value={formData.sss || ''}
            onChange={handleGovernmentIdChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
              errors.sss ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="Enter SSS number"
          />
          {errors.sss && (
            <p className="text-red-500 text-xs mt-1">{errors.sss}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="philhealth" className="block text-sm font-medium text-gray-700 mb-1">
            PhilHealth Number
          </label>
          <input
            id="philhealth"
            name="philhealth"
            type="text"
            value={formData.philhealth || ''}
            onChange={handleGovernmentIdChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
              errors.philhealth ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="Enter PhilHealth number"
          />
          {errors.philhealth && (
            <p className="text-red-500 text-xs mt-1">{errors.philhealth}</p>
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
            onChange={handleGovernmentIdChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
              errors.pagibig ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="Enter PAG-IBIG number"
          />
          {errors.pagibig && (
            <p className="text-red-500 text-xs mt-1">{errors.pagibig}</p>
          )}
        </div>
      </div>
    
      {/* Current Address with smaller fields */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-[#400504] border-b pb-1">Current Address</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="currentBlk" className="block text-sm font-medium text-gray-700 mb-1">
              Block
            </label>
            <input
              id="currentBlk"
              name="currentAddress.blk"
              type="text"
              value={formData.currentAddress?.blk || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors text-sm"
              placeholder="Block 1"
              maxLength="10"
            />
          </div>
          
          <div>
            <label htmlFor="currentLot" className="block text-sm font-medium text-gray-700 mb-1">
              Lot
            </label>
            <input
              id="currentLot"
              name="currentAddress.lot"
              type="text"
              value={formData.currentAddress?.lot || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors text-sm"
              placeholder="Lot 2"
              maxLength="10"
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
              onChange={(e) => handleStreetChange('currentAddress', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors text-sm"
              placeholder="Main Street"
              maxLength="20"
            />
          </div>
        </div>
        
        {/* Rest of the address fields remain the same */}
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
            <div className="relative">
              <input
                id="currentPostalCode"
                name="currentAddress.postalCode"
                type="text"
                value={formData.currentAddress?.postalCode || postalCode || ''}
                onChange={handlePostalCodeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                placeholder={postalCode ? `Suggested: ${postalCode}` : "Enter postal code"}
              />
              {postalCode && !formData.currentAddress?.postalCode && (
                <p className="text-xs text-blue-600 mt-1">
                  Suggested: {postalCode} (based on selected city)
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {postalCode ? "You can use the suggested code or enter your own" : "Enter your postal code"}
            </p>
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
      
      {/* Permanent Address with smaller fields */}
      {!formData.sameAsCurrent && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-[#400504] border-b pb-1">Permanent Address</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="permanentBlk" className="block text-sm font-medium text-gray-700 mb-1">
                Block
              </label>
              <input
                id="permanentBlk"
                name="permanentAddress.blk"
                type="text"
                value={formData.permanentAddress?.blk || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors text-sm"
                placeholder="Block 1"
                maxLength="10"
              />
            </div>
            
            <div>
              <label htmlFor="permanentLot" className="block text-sm font-medium text-gray-700 mb-1">
                Lot
              </label>
              <input
                id="permanentLot"
                name="permanentAddress.lot"
                type="text"
                value={formData.permanentAddress?.lot || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors text-sm"
                placeholder="Lot 2"
                maxLength="10"
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
                onChange={(e) => handleStreetChange('permanentAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors text-sm"
                placeholder="Main Street"
                maxLength="20"
              />
            </div>
          </div>
          
          {/* Rest of the permanent address fields with PSGC API */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="permanentProvince" className="block text-sm font-medium text-gray-700 mb-1">
                Province *
              </label>
              <select
                id="permanentProvince"
                name="permanentAddress.provinceCode"
                value={formData.permanentAddress?.provinceCode || ''}
                onChange={handlePermanentProvinceChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                  errors.permanentAddress?.province ? 'border-red-500 bg-red-50' : 'border-gray-300'
                } ${loading.permanentProvinces ? 'opacity-50 cursor-not-allowed' : ''}`}
                required
                disabled={loading.permanentProvinces}
                aria-describedby="permanentProvince-help"
              >
                <option value="">{loading.permanentProvinces ? 'Loading provinces...' : 'Select Province'}</option>
                {permanentProvinces.map(province => (
                  <option key={province.code} value={province.code}>
                    {province.name}
                  </option>
                ))}
              </select>
              <p id="permanentProvince-help" className="text-xs text-gray-500 mt-1">Select your province</p>
              {errors.permanentAddress?.province && (
                <p className="text-red-500 text-xs mt-1">{errors.permanentAddress.province}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="permanentCity" className="block text-sm font-medium text-gray-700 mb-1">
                City/Municipality *
              </label>
              <select
                id="permanentCity"
                name="permanentAddress.cityCode"
                value={formData.permanentAddress?.cityCode || ''}
                onChange={handlePermanentCityChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  errors.permanentAddress?.city ? 'border-red-500 bg-red-50' : 'border-gray-300'
                } ${loading.permanentCities ? 'opacity-50' : ''}`}
                required
                disabled={!formData.permanentAddress?.provinceCode || loading.permanentCities}
                aria-describedby="permanentCity-help"
              >
                <option value="">
                  {loading.permanentCities ? 'Loading cities...' : !formData.permanentAddress?.provinceCode ? 'Select province first' : 'Select City/Municipality'}
                </option>
                {permanentCities.map(city => (
                  <option key={city.code} value={city.code}>
                    {city.name}
                  </option>
                ))}
              </select>
              <p id="permanentCity-help" className="text-xs text-gray-500 mt-1">
                {!formData.permanentAddress?.provinceCode ? 'Select province first' : 'Select your city/municipality'}
              </p>
              {errors.permanentAddress?.city && (
                <p className="text-red-500 text-xs mt-1">{errors.permanentAddress.city}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="permanentBarangay" className="block text-sm font-medium text-gray-700 mb-1">
                Barangay *
              </label>
              <select
                id="permanentBarangay"
                name="permanentAddress.barangayCode"
                value={formData.permanentAddress?.barangayCode || ''}
                onChange={handlePermanentBarangayChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  errors.permanentAddress?.barangay ? 'border-red-500 bg-red-50' : 'border-gray-300'
                } ${loading.permanentBarangays ? 'opacity-50' : ''}`}
                required
                disabled={!formData.permanentAddress?.cityCode || loading.permanentBarangays}
                aria-describedby="permanentBarangay-help"
              >
                <option value="">
                  {loading.permanentBarangays ? 'Loading barangays...' : !formData.permanentAddress?.cityCode ? 'Select city first' : 'Select Barangay'}
                </option>
                {permanentBarangays.map(barangay => (
                  <option key={barangay.code} value={barangay.code}>
                    {barangay.name}
                  </option>
                ))}
              </select>
              <p id="permanentBarangay-help" className="text-xs text-gray-500 mt-1">
                {!formData.permanentAddress?.cityCode ? 'Select city first' : 'Select your barangay'}
              </p>
              {errors.permanentAddress?.barangay && (
                <p className="text-red-500 text-xs mt-1">{errors.permanentAddress.barangay}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="permanentPostalCode" className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <div className="relative">
                <input
                  id="permanentPostalCode"
                  name="permanentAddress.postalCode"
                  type="text"
                  value={formData.permanentAddress?.postalCode || permanentPostalCode || ''}
                  onChange={handlePermanentPostalCodeChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                  placeholder={permanentPostalCode ? `Suggested: ${permanentPostalCode}` : "Enter postal code"}
                />
                {permanentPostalCode && !formData.permanentAddress?.postalCode && (
                  <p className="text-xs text-blue-600 mt-1">
                    Suggested: {permanentPostalCode} (based on selected city)
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {permanentPostalCode ? "You can use the suggested code or enter your own" : "Enter your postal code"}
              </p>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                readOnly
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactInfo;
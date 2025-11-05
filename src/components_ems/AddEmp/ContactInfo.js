import React, { useState, useEffect, useRef } from 'react';
import PhoneNumberValidation from './PhoneNumberValidation';
import { PHILIPPINE_ZIP_CODES, findZipCode } from './ZipCode';

const ContactInfo = ({ formData, errors, handleInputChange }) => {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [permanentRegions, setPermanentRegions] = useState([]);
  const [permanentProvinces, setPermanentProvinces] = useState([]);
  const [permanentCities, setPermanentCities] = useState([]);
  const [permanentBarangays, setPermanentBarangays] = useState([]);
  const [availableZipCodes, setAvailableZipCodes] = useState([]);
  const [permanentAvailableZipCodes, setPermanentAvailableZipCodes] = useState([]);
  
  // Search states for postal codes
  const [currentZipSearch, setCurrentZipSearch] = useState('');
  const [permanentZipSearch, setPermanentZipSearch] = useState('');
  const [showCurrentZipDropdown, setShowCurrentZipDropdown] = useState(false);
  const [showPermanentZipDropdown, setShowPermanentZipDropdown] = useState(false);
  
  const [phoneValidation, setPhoneValidation] = useState({
    contactNumber: { isValid: null, loading: false },
    emergencyMobile: { isValid: null, loading: false }
  });

  const [emailValidation, setEmailValidation] = useState({
    isValid: null,
    loading: false,
    details: null
  });

  // Get ALL zip codes from the entire database
  const getAllZipCodes = () => {
    const allZipCodes = [];
    
    Object.values(PHILIPPINE_ZIP_CODES).forEach(region => {
      Object.entries(region).forEach(([province, cities]) => {
        Object.entries(cities).forEach(([city, zipCode]) => {
          allZipCodes.push({
            value: zipCode,
            label: `${city}, ${province} - ${zipCode}`,
            city: city,
            province: province,
            zipCode: zipCode
          });
        });
      });
    });
    
    return allZipCodes.sort((a, b) => a.label.localeCompare(b.label));
  };

  // Filter zip codes based on search
  const filterZipCodes = (zipCodes, searchTerm) => {
    if (!searchTerm) return zipCodes;
    
    const searchLower = searchTerm.toLowerCase();
    return zipCodes.filter(zip => 
      zip.city.toLowerCase().includes(searchLower) ||
      zip.province.toLowerCase().includes(searchLower) ||
      zip.zipCode.includes(searchTerm)
    );
  };

  // Simple function to find zip code by city name
  const findZipCodeByCity = (cityName) => {
    if (!cityName) return '';
    
    for (const region of Object.values(PHILIPPINE_ZIP_CODES)) {
      for (const province of Object.values(region)) {
        for (const [city, zipCode] of Object.entries(province)) {
          if (city.toLowerCase().includes(cityName.toLowerCase()) || 
              cityName.toLowerCase().includes(city.toLowerCase())) {
            return zipCode;
          }
        }
      }
    }
    return '';
  };

  // Simplified email validation - Remove complex validation that's causing issues
  const validateEmail = async (email) => {
    if (!email || email.trim().length < 3) {
      setEmailValidation({ isValid: null, loading: false, details: null });
      return;
    }

    setEmailValidation({ isValid: null, loading: true, details: null });

    // Simple email format validation without external checks
    const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    
    if (!isValidFormat) {
      setEmailValidation({
        isValid: false,
        loading: false,
        details: {
          reason: 'Invalid email format'
        }
      });
      return;
    }

    // If format is valid, consider it acceptable
    setEmailValidation({
      isValid: true,
      loading: false,
      details: {
        is_valid_format: true,
        reason: 'Valid email format'
      }
    });
  };

  // Update available zip codes when current address changes
  useEffect(() => {
    // Always show all zip codes initially
    setAvailableZipCodes(getAllZipCodes());
    
    // Auto-select zip code if city is selected
    if (formData.currentAddress?.city) {
      const zipCode = findZipCodeByCity(formData.currentAddress.city);
      if (zipCode && !formData.currentAddress?.postalCode) {
        handleInputChange({
          target: {
            name: 'currentAddress.postalCode',
            value: zipCode
          }
        });
      }
    }
  }, [formData.currentAddress?.city]);

  // Update available zip codes when permanent address changes
  useEffect(() => {
    if (!formData.sameAsCurrent) {
      // Always show all zip codes initially
      setPermanentAvailableZipCodes(getAllZipCodes());
      
      // Auto-select zip code if city is selected
      if (formData.permanentAddress?.city) {
        const zipCode = findZipCodeByCity(formData.permanentAddress.city);
        if (zipCode && !formData.permanentAddress?.postalCode) {
          handleInputChange({
            target: {
              name: 'permanentAddress.postalCode',
              value: zipCode
            }
          });
        }
      }
    }
  }, [formData.permanentAddress?.city, formData.sameAsCurrent]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCurrentZipDropdown && !event.target.closest('.current-postal-dropdown')) {
        setShowCurrentZipDropdown(false);
      }
      if (showPermanentZipDropdown && !event.target.closest('.permanent-postal-dropdown')) {
        setShowPermanentZipDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCurrentZipDropdown, showPermanentZipDropdown]);

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

  const getPhoneValidationStatus = (fieldName) => {
    const validation = phoneValidation[fieldName];
    if (validation.isValid === true) {
      return { text: 'Valid Philippine number', color: 'text-green-600', bg: 'bg-green-50' };
    }
    if (validation.isValid === false) {
      return { text: 'Invalid number format', color: 'text-red-600', bg: 'bg-red-50' };
    }
    return null;
  };

  const getEmailValidationStatus = () => {
    if (emailValidation.loading) {
      return { 
        text: 'Validating email...', 
        color: 'text-blue-600', 
        bg: 'bg-blue-50'
      };
    }
    if (emailValidation.isValid === true) {
      return { 
        text: 'Valid email address', 
        color: 'text-green-600', 
        bg: 'bg-green-50'
      };
    }
    if (emailValidation.isValid === false) {
      const reason = emailValidation.details?.reason || 'Invalid email';
      return { 
        text: reason, 
        color: 'text-red-600', 
        bg: 'bg-red-50'
      };
    }
    return null;
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    handleInputChange(e);

    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailValidation({
        isValid: false,
        loading: false,
        details: {
          reason: 'Invalid email format'
        }
      });
    } else if (!value) {
      setEmailValidation({ isValid: null, loading: false, details: null });
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.email) {
        validateEmail(formData.email);
      } else {
        setEmailValidation({ isValid: null, loading: false, details: null });
      }
    }, 800);
    
    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  const handleContactNumberChange = (phoneNumber, isValid) => {
    handleInputChange({
      target: {
        name: 'contactNumber',
        value: phoneNumber
      }
    });
    
    setPhoneValidation(prev => ({
      ...prev,
      contactNumber: { ...prev.contactNumber, isValid, loading: false }
    }));
  };

  const handleEmergencyMobileChange = (phoneNumber, isValid) => {
    handleInputChange({
      target: {
        name: 'emergencyContact.mobile',
        value: phoneNumber
      }
    });
    
    setPhoneValidation(prev => ({
      ...prev,
      emergencyMobile: { ...prev.emergencyMobile, isValid, loading: false }
    }));
  };

  const handleStreetInput = (e) => {
    const value = e.target.value;
    const filteredValue = value.replace(/[^a-zA-Z0-9\s]/g, '');
    const limitedValue = filteredValue.slice(0, 30);
    
    handleInputChange({
      target: {
        name: e.target.name,
        value: limitedValue
      }
    });
  };

  const handleAreaInput = (e) => {
    const value = e.target.value;
    const filteredValue = value.replace(/[^a-zA-Z0-9\s]/g, '');
    const limitedValue = filteredValue.slice(0, 30);
    
    handleInputChange({
      target: {
        name: e.target.name,
        value: limitedValue
      }
    });
  };

  const handleBlockInput = (e) => {
    const value = e.target.value;
    const filteredValue = value.replace(/[^a-zA-Z0-9]/g, '');
    const limitedValue = filteredValue.slice(0, 4);
    
    handleInputChange({
      target: {
        name: e.target.name,
        value: limitedValue
      }
    });
  };

  const handleLotInput = (e) => {
    const value = e.target.value;
    const filteredValue = value.replace(/[^a-zA-Z0-9]/g, '');
    const limitedValue = filteredValue.slice(0, 4);
    
    handleInputChange({
      target: {
        name: e.target.name,
        value: limitedValue
      }
    });
  };

  const handleTextInput = (e) => {
    const value = e.target.value;
    const filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
    const limitedValue = filteredValue.slice(0, 30);
    
    handleInputChange({
      target: {
        name: e.target.name,
        value: limitedValue
      }
    });
  };

  const handleNumberInput = (e) => {
    const value = e.target.value;
    const filteredValue = value.replace(/\D/g, '');
    
    handleInputChange({
      target: {
        name: e.target.name,
        value: filteredValue
      }
    });
  };

  const handleTINInput = (e) => {
    const value = e.target.value;
    const filteredValue = value.replace(/\D/g, '').slice(0, 9);
    
    handleInputChange({
      target: {
        name: e.target.name,
        value: filteredValue
      }
    });
  };

  const handleSSSInput = (e) => {
    const value = e.target.value;
    const filteredValue = value.replace(/\D/g, '').slice(0, 12);
    
    handleInputChange({
      target: {
        name: e.target.name,
        value: filteredValue
      }
    });
  };

  const handlePhilhealthInput = (e) => {
    const value = e.target.value;
    const filteredValue = value.replace(/\D/g, '').slice(0, 12);
    
    handleInputChange({
      target: {
        name: e.target.name,
        value: filteredValue
      }
    });
  };

  const handlePagibigInput = (e) => {
    const value = e.target.value;
    const filteredValue = value.replace(/\D/g, '').slice(0, 12);
    
    handleInputChange({
      target: {
        name: e.target.name,
        value: filteredValue
      }
    });
  };

  const handlePostalCodeChange = (e) => {
    handleInputChange({
      target: {
        name: 'currentAddress.postalCode',
        value: e.target.value
      }
    });
  };

  const handlePermanentPostalCodeChange = (e) => {
    handleInputChange({
      target: {
        name: 'permanentAddress.postalCode',
        value: e.target.value
      }
    });
  };

  // Handle current postal code selection
  const handleCurrentPostalSelect = (zipCode) => {
    handleInputChange({
      target: {
        name: 'currentAddress.postalCode',
        value: zipCode
      }
    });
    setCurrentZipSearch(zipCode); // Set the selected value directly in search field
    setShowCurrentZipDropdown(false);
  };

  // Handle permanent postal code selection
  const handlePermanentPostalSelect = (zipCode) => {
    handleInputChange({
      target: {
        name: 'permanentAddress.postalCode',
        value: zipCode
      }
    });
    setPermanentZipSearch(zipCode); // Set the selected value directly in search field
    setShowPermanentZipDropdown(false);
  };

  // FIXED: Properly handle checkbox group changes for requirements
  const handleCheckboxGroup = (groupName, option, isChecked) => {
    const currentRequirements = formData.requirements || {};
    const currentGroup = currentRequirements[groupName] || {};
    
    const updatedGroup = { ...currentGroup };
    
    if (option === 'notYetSubmitted') {
      if (isChecked) {
        // If "Not Yet Submitted" is checked, set only this to true and clear others
        Object.keys(updatedGroup).forEach(key => {
          updatedGroup[key] = false;
        });
        updatedGroup.notYetSubmitted = true;
      } else {
        updatedGroup.notYetSubmitted = false;
      }
    } else {
      // If any other option is checked, ensure "notYetSubmitted" is false
      updatedGroup.notYetSubmitted = false;
      updatedGroup[option] = isChecked;
    }
    
    // Update the requirements object
    const updatedRequirements = {
      ...currentRequirements,
      [groupName]: updatedGroup
    };
    
    handleInputChange({
      target: {
        name: 'requirements',
        value: updatedRequirements
      }
    });
  };

  // Fetch regions for current address
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const response = await fetch('https://psgc.gitlab.io/api/regions/');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const sortedRegions = data.sort((a, b) => a.name.localeCompare(b.name));
        setRegions(sortedRegions);
      } catch (error) {
        console.error('Error fetching regions:', error);
        setRegions([]);
      }
    };
    fetchRegions();
  }, []);

  // Fetch regions for permanent address
  useEffect(() => {
    const fetchPermanentRegions = async () => {
      try {
        const response = await fetch('https://psgc.gitlab.io/api/regions/');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const sortedRegions = data.sort((a, b) => a.name.localeCompare(b.name));
        setPermanentRegions(sortedRegions);
      } catch (error) {
        console.error('Error fetching permanent regions:', error);
        setPermanentRegions([]);
      }
    };
    
    if (!formData.sameAsCurrent) {
      fetchPermanentRegions();
    }
  }, [formData.sameAsCurrent]);

  // Fetch provinces for current address based on selected region
  useEffect(() => {
    if (formData.currentAddress?.regionCode) {
      const fetchProvinces = async () => {
        try {
          const response = await fetch(`https://psgc.gitlab.io/api/regions/${formData.currentAddress.regionCode}/provinces/`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          const sortedProvinces = data.sort((a, b) => a.name.localeCompare(b.name));
          setProvinces(sortedProvinces);
        } catch (error) {
          console.error('Error fetching provinces:', error);
          setProvinces([]);
        }
      };
      fetchProvinces();
    } else {
      setProvinces([]);
      setCities([]);
      setBarangays([]);
    }
  }, [formData.currentAddress?.regionCode]);

  // Fetch provinces for permanent address based on selected region
  useEffect(() => {
    if (formData.permanentAddress?.regionCode && !formData.sameAsCurrent) {
      const fetchPermanentProvinces = async () => {
        try {
          const response = await fetch(`https://psgc.gitlab.io/api/regions/${formData.permanentAddress.regionCode}/provinces/`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          const sortedProvinces = data.sort((a, b) => a.name.localeCompare(b.name));
          setPermanentProvinces(sortedProvinces);
        } catch (error) {
          console.error('Error fetching permanent provinces:', error);
          setPermanentProvinces([]);
        }
      };
      fetchPermanentProvinces();
    } else {
      setPermanentProvinces([]);
      setPermanentCities([]);
      setPermanentBarangays([]);
    }
  }, [formData.permanentAddress?.regionCode, formData.sameAsCurrent]);

  // Fetch cities for current address based on selected province
  useEffect(() => {
    if (formData.currentAddress?.provinceCode) {
      const fetchCities = async () => {
        try {
          const response = await fetch(`https://psgc.gitlab.io/api/provinces/${formData.currentAddress.provinceCode}/cities-municipalities/`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          const sortedCities = data.sort((a, b) => a.name.localeCompare(b.name));
          setCities(sortedCities);
        } catch (error) {
          console.error('Error fetching cities:', error);
          setCities([]);
        }
      };
      fetchCities();
    } else {
      setCities([]);
      setBarangays([]);
    }
  }, [formData.currentAddress?.provinceCode]);

  // Fetch cities for permanent address based on selected province
  useEffect(() => {
    if (formData.permanentAddress?.provinceCode && !formData.sameAsCurrent) {
      const fetchPermanentCities = async () => {
        try {
          const response = await fetch(`https://psgc.gitlab.io/api/provinces/${formData.permanentAddress.provinceCode}/cities-municipalities/`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          const sortedCities = data.sort((a, b) => a.name.localeCompare(b.name));
          setPermanentCities(sortedCities);
        } catch (error) {
          console.error('Error fetching permanent cities:', error);
          setPermanentCities([]);
        }
      };
      fetchPermanentCities();
    } else {
      setPermanentCities([]);
      setPermanentBarangays([]);
    }
  }, [formData.permanentAddress?.provinceCode, formData.sameAsCurrent]);

  // Fetch barangays for current address based on selected city
  useEffect(() => {
    if (formData.currentAddress?.cityCode) {
      const fetchBarangays = async () => {
        try {
          const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${formData.currentAddress.cityCode}/barangays/`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          const sortedBarangays = data.sort((a, b) => a.name.localeCompare(b.name));
          setBarangays(sortedBarangays);
        } catch (error) {
          console.error('Error fetching barangays:', error);
          setBarangays([]);
        }
      };
      fetchBarangays();
    } else {
      setBarangays([]);
    }
  }, [formData.currentAddress?.cityCode]);

  // Fetch barangays for permanent address based on selected city
  useEffect(() => {
    if (formData.permanentAddress?.cityCode && !formData.sameAsCurrent) {
      const fetchPermanentBarangays = async () => {
        try {
          const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${formData.permanentAddress.cityCode}/barangays/`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          const sortedBarangays = data.sort((a, b) => a.name.localeCompare(b.name));
          setPermanentBarangays(sortedBarangays);
        } catch (error) {
          console.error('Error fetching permanent barangays:', error);
          setPermanentBarangays([]);
        }
      };
      fetchPermanentBarangays();
    } else {
      setPermanentBarangays([]);
    }
  }, [formData.permanentAddress?.cityCode, formData.sameAsCurrent]);

  // Handle region change for current address
  const handleRegionChange = (e) => {
    const selectedRegion = regions.find(r => r.code === e.target.value);
    
    handleInputChange({
      target: {
        name: 'currentAddress.region',
        value: selectedRegion?.name || ''
      }
    });
    handleInputChange({
      target: {
        name: 'currentAddress.regionCode',
        value: e.target.value
      }
    });
    
    // Clear dependent fields
    handleInputChange({
      target: {
        name: 'currentAddress.province',
        value: ''
      }
    });
    handleInputChange({
      target: {
        name: 'currentAddress.provinceCode',
        value: ''
      }
    });
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
  };

  // Handle region change for permanent address
  const handlePermanentRegionChange = (e) => {
    const selectedRegion = permanentRegions.find(r => r.code === e.target.value);
    
    handleInputChange({
      target: {
        name: 'permanentAddress.region',
        value: selectedRegion?.name || ''
      }
    });
    handleInputChange({
      target: {
        name: 'permanentAddress.regionCode',
        value: e.target.value
      }
    });
    
    // Clear dependent fields
    handleInputChange({
      target: {
        name: 'permanentAddress.province',
        value: ''
      }
    });
    handleInputChange({
      target: {
        name: 'permanentAddress.provinceCode',
        value: ''
      }
    });
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
  };

  // Handle province change for current address
  const handleProvinceChange = (e) => {
    const selectedProvince = provinces.find(p => p.code === e.target.value);
    
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
    
    // Clear dependent fields
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
  };

  // Handle province change for permanent address
  const handlePermanentProvinceChange = (e) => {
    const selectedProvince = permanentProvinces.find(p => p.code === e.target.value);
    
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
    
    // Clear dependent fields
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

  const handleEmergencyContactChange = (field, value) => {
    if (field === 'type') {
      handleInputChange({
        target: {
          name: 'emergencyContact.type',
          value: value
        }
      });
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
    } else {
      handleInputChange({
        target: {
          name: `emergencyContact.${field}`,
          value: value
        }
      });
    }
  };

  const CheckboxGroup = ({ groupName, options }) => {
    const currentRequirements = formData.requirements || {};
    const currentGroup = currentRequirements[groupName] || {};
    
    return (
      <div className="flex flex-col gap-1 mt-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center">
            <input
              id={`${groupName}-${option.value}`}
              type="checkbox"
              checked={!!currentGroup[option.value]}
              onChange={(e) => handleCheckboxGroup(groupName, option.value, e.target.checked)}
              className="h-3 w-3 text-[#400504] focus:ring-[#400504] border-gray-300 rounded"
              disabled={
                option.value === 'notYetSubmitted' 
                  ? Object.keys(currentGroup).some(key => key !== 'notYetSubmitted' && currentGroup[key])
                  : currentGroup.notYetSubmitted
              }
            />
            <label htmlFor={`${groupName}-${option.value}`} className="ml-2 text-xs text-gray-700">
              {option.label}
            </label>
          </div>
        ))}
      </div>
    );
  };

  // Custom Postal Code Dropdown Component
  const PostalCodeDropdown = ({ 
    value, 
    onChange, 
    zipCodes, 
    searchTerm, 
    onSearchChange, 
    showDropdown, 
    onToggleDropdown,
    onSelect,
    className = '',
    placeholder = "Search postal code..."
  }) => {
    const filteredZipCodes = filterZipCodes(zipCodes, searchTerm);
    
    return (
      <div className={`relative ${className}`}>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              onSearchChange(e.target.value);
              onToggleDropdown(true);
            }}
            onFocus={() => onToggleDropdown(true)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
          />
          <button
            type="button"
            onClick={() => onToggleDropdown(!showDropdown)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ▼
          </button>
        </div>
        
        {showDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            {/* Search input inside dropdown */}
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search city, province, or zip code..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#cba235] focus:border-transparent"
                autoFocus
              />
            </div>
            
            {/* Results count */}
            <div className="px-3 py-1 text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
              {filteredZipCodes.length} results found
            </div>
            
            {/* Dropdown options */}
            <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>
              {filteredZipCodes.length > 0 ? (
                filteredZipCodes.map((zipOption) => (
                  <div
                    key={zipOption.value}
                    onClick={() => {
                      onSelect(zipOption.value);
                    }}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                      value === zipOption.value ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                  >
                    <div className="font-medium text-sm">{zipOption.city}</div>
                    <div className="text-xs text-gray-600">{zipOption.province}</div>
                    <div className="text-xs font-semibold text-gray-800">Zip: {zipOption.zipCode}</div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-gray-500 text-sm">
                  No matching zip codes found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

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

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-[#400504] border-b pb-2">Contact Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Contact Number *
          </label>
          <PhoneNumberValidation
            value={formData.contactNumber || ''}
            onChange={handleContactNumberChange}
            required={true}
            placeholder="+63 912 345 6789"
          />
          <div className="mt-1">
            {errors.contactNumber && (
              <p className="text-red-500 text-xs">{errors.contactNumber}</p>
            )}
            {getPhoneValidationStatus('contactNumber') && (
              <div className={`text-xs px-2 py-1 rounded ${getPhoneValidationStatus('contactNumber').color} ${getPhoneValidationStatus('contactNumber').bg}`}>
                {getPhoneValidationStatus('contactNumber').text}
              </div>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email || ''}
            onChange={handleEmailChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
              errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
            } ${
              emailValidation.isValid === false ? 'border-red-500 bg-red-50' : ''
            } ${
              emailValidation.isValid === true ? 'border-green-500 bg-green-50' : ''
            }`}
            placeholder="employee@email.com"
            required
          />
          <div className="mt-1">
            {errors.email && (
              <p className="text-red-500 text-xs">{errors.email}</p>
            )}
            {getEmailValidationStatus() && (
              <div className={`text-xs px-2 py-1 rounded flex items-center space-x-1 ${getEmailValidationStatus().color} ${getEmailValidationStatus().bg}`}>
                <span>{getEmailValidationStatus().text}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="text-md font-semibold text-[#400504] mb-3">Government IDs</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="tin" className="block text-sm font-medium text-gray-700 mb-1">
              TIN Number
            </label>
            <input
              id="tin"
              name="tin"
              type="text"
              value={formData.tin || ''}
              onChange={handleTINInput}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
              placeholder="Enter 9-digit TIN"
              maxLength={9}
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be exactly 9 digits
            </p>
            <CheckboxGroup 
              groupName="tinRequirements"
              options={[
                { value: 'presentForm', label: 'Present 1904/1905 Form W/RDO Code 25B' },
                { value: 'submitCopy', label: 'Submit PhotoCopy' },
                { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
              ]}
            />
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
              onChange={handleSSSInput}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
              placeholder="Enter SSS number"
              maxLength={12}
            />
            <CheckboxGroup 
              groupName="sssRequirements"
              options={[
                { value: 'presentForm', label: 'Present E-1 Form' },
                { value: 'presentID', label: 'Present ID' },
                { value: 'submitCopy', label: 'Submit PhotoCopy' },
                { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
              ]}
            />
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
              onChange={handlePhilhealthInput}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
              placeholder="Enter PhilHealth number"
              maxLength={12}
            />
            <CheckboxGroup 
              groupName="philhealthRequirements"
              options={[
                { value: 'presentMDR', label: 'Present Original MDR' },
                { value: 'presentID', label: 'Present ID' },
                { value: 'submitCopy', label: 'Submit PhotoCopy' },
                { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
              ]}
            />
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
              onChange={handlePagibigInput}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
              placeholder="Enter PAG-IBIG number"
              maxLength={12}
            />
            <CheckboxGroup 
              groupName="pagibigRequirements"
              options={[
                { value: 'presentMDF', label: 'Present Original MDF' },
                { value: 'presentID', label: 'Present ID' },
                { value: 'submitCopy', label: 'Submit PhotoCopy' },
                { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
              ]}
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="text-md font-semibold text-[#400504] mb-3">BPLO Requirements (CSJDM)</h4>
        
        <div className="bg-gray-50 p-4 rounded-lg border space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HEALTH CARD
            </label>
            <CheckboxGroup 
              groupName="healthCardRequirements"
              options={[
                { value: 'presentOriginal', label: 'Present Original' },
                { value: 'submitCopy', label: 'Submit PhotoCopy' },
                { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Professional ID Card/License
            </label>
            <CheckboxGroup 
              groupName="professionalIDRequirements"
              options={[
                { value: 'presentOriginal', label: 'Present Original' },
                { value: 'submitCopy', label: 'Submit PhotoCopy' },
                { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DRIVER'S ID Card/License
            </label>
            <CheckboxGroup 
              groupName="driversLicenseRequirements"
              options={[
                { value: 'presentOriginal', label: 'Present Original' },
                { value: 'submitCopy', label: 'Submit PhotoCopy' },
                { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barangay Working Permit
            </label>
            <CheckboxGroup 
              groupName="barangayWorkingPermitRequirements"
              options={[
                { value: 'submitCopy', label: 'Submit PhotoCopy' },
                { value: 'submitOriginal', label: 'Submit ORIGINAL' },
                { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
              ]}
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="text-md font-semibold text-[#400504] mb-3">OCCUPATIONAL PERMIT</h4>
        
        <div className="bg-gray-50 p-4 rounded-lg border space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              BIRTH CERTIFICATE
            </label>
            <CheckboxGroup 
              groupName="birthCertificateRequirements"
              options={[
                { value: 'presentOriginal', label: 'Present Original' },
                { value: 'submitCopy', label: 'Submit PhotoCopy' },
                { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Police Clearance or NBI Clearance
            </label>
            <CheckboxGroup 
              groupName="policeNbiRequirements"
              options={[
                { value: 'submitCopy', label: 'Submit PhotoCopy' },
                { value: 'submitOriginal', label: 'Submit ORIGINAL' },
                { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barangay Clearance
            </label>
            <CheckboxGroup 
              groupName="barangayClearanceRequirements"
              options={[
                { value: 'submitCopy', label: 'Submit PhotoCopy' },
                { value: 'submitOriginal', label: 'Submit ORIGINAL' },
                { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CEDULA
            </label>
            <CheckboxGroup 
              groupName="cedulaRequirements"
              options={[
                { value: 'presentOriginal', label: 'Present Original' },
                { value: 'submitCopy', label: 'Submit PhotoCopy' },
                { value: 'notYetSubmitted', label: 'Not Yet Submitted' }
              ]}
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="text-md font-semibold text-[#400504] mb-3">Employment Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dateStart" className="block text-sm font-medium text-gray-700 mb-1">
              DATE START
            </label>
            <input
              id="dateStart"
              name="dateStart"
              type="date"
              value={formData.dateStart || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
            />
          </div>
          
          <div>
            <label htmlFor="dateSeparated" className="block text-sm font-medium text-gray-700 mb-1">
              DATE SEPARATED
            </label>
            <input
              id="dateSeparated"
              name="dateSeparated"
              type="date"
              value={formData.dateSeparated || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-4 border-t pt-4">
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
              onChange={handleTextInput}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                errors.emergencyContactFirstName ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter first name"
              required
              maxLength={30}
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
              onChange={handleTextInput}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                errors.emergencyContactLastName ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter last name"
              required
              maxLength={30}
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
              <div>
                <PhoneNumberValidation
                  value={formData.emergencyContact?.mobile || ''}
                  onChange={handleEmergencyMobileChange}
                  required={true}
                  placeholder="+63 912 345 6789"
                />
                {getPhoneValidationStatus('emergencyMobile') && (
                  <div className={`text-xs px-2 py-1 rounded mt-1 ${getPhoneValidationStatus('emergencyMobile').color} ${getPhoneValidationStatus('emergencyMobile').bg}`}>
                    {getPhoneValidationStatus('emergencyMobile').text}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  id="emergencyContactNumber"
                  name="emergencyContact.landline"
                  type="text"
                  value={formData.emergencyContact?.landline || ''}
                  onChange={handleNumberInput}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                    errors.emergencyContactNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="e.g., 02-123-4567"
                  required
                  maxLength={12}
                />
              </div>
            )}
            {errors.emergencyContactNumber && (
              <p className="text-red-500 text-xs mt-1">{errors.emergencyContactNumber}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="space-y-4 border-t pt-4">
        <h4 className="text-md font-semibold text-[#400504] border-b pb-1">Current Address</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="currentStreet" className="block text-sm font-medium text-gray-700 mb-1">
              Street *
            </label>
            <input
              id="currentStreet"
              name="currentAddress.street"
              type="text"
              value={formData.currentAddress?.street || ''}
              onChange={handleStreetInput}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
              placeholder="Street name and number"
              maxLength={30}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.currentAddress?.street?.length || 0}/30
            </p>
          </div>
          
          <div>
            <label htmlFor="currentArea" className="block text-sm font-medium text-gray-700 mb-1">
              Area *
            </label>
            <input
              id="currentArea"
              name="currentAddress.area"
              type="text"
              value={formData.currentAddress?.area || ''}
              onChange={handleAreaInput}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
              placeholder="Area/Subdivision"
              maxLength={30}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.currentAddress?.area?.length || 0}/30
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Block/Lot *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  id="currentBlock"
                  name="currentAddress.block"
                  type="text"
                  value={formData.currentAddress?.block || ''}
                  onChange={handleBlockInput}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                  placeholder="Block"
                  maxLength={4}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Block</p>
              </div>
              <div>
                <input
                  id="currentLot"
                  name="currentAddress.lot"
                  type="text"
                  value={formData.currentAddress?.lot || ''}
                  onChange={handleLotInput}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                  placeholder="Lot"
                  maxLength={4}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Lot</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="currentRegion" className="block text-sm font-medium text-gray-700 mb-1">
              Region *
            </label>
            <select
              id="currentRegion"
              name="currentAddress.regionCode"
              value={formData.currentAddress?.regionCode || ''}
              onChange={handleRegionChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                errors.currentAddress?.region ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Select Region</option>
              {regions.map(region => (
                <option key={region.code} value={region.code}>
                  {region.name}
                </option>
              ))}
            </select>
            {errors.currentAddress?.region && (
              <p className="text-red-500 text-xs mt-1">{errors.currentAddress.region}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="currentProvince" className="block text-sm font-medium text-gray-700 mb-1">
              Province *
            </label>
            <select
              id="currentProvince"
              name="currentAddress.provinceCode"
              value={formData.currentAddress?.provinceCode || ''}
              onChange={handleProvinceChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.currentAddress?.province ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              required
              disabled={!formData.currentAddress?.regionCode}
            >
              <option value="">
                {!formData.currentAddress?.regionCode ? 'Select region first' : 'Select Province'}
              </option>
              {provinces.map(province => (
                <option key={province.code} value={province.code}>
                  {province.name}
                </option>
              ))}
            </select>
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
              }`}
              required
              disabled={!formData.currentAddress?.provinceCode}
            >
              <option value="">
                {!formData.currentAddress?.provinceCode ? 'Select province first' : 'Select City/Municipality'}
              </option>
              {cities.map(city => (
                <option key={city.code} value={city.code}>
                  {city.name}
                </option>
              ))}
            </select>
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
              }`}
              required
              disabled={!formData.currentAddress?.cityCode}
            >
              <option value="">
                {!formData.currentAddress?.cityCode ? 'Select city first' : 'Select Barangay'}
              </option>
              {barangays.map(barangay => (
                <option key={barangay.code} value={barangay.code}>
                  {barangay.name}
                </option>
              ))}
            </select>
            {errors.currentAddress?.barangay && (
              <p className="text-red-500 text-xs mt-1">{errors.currentAddress.barangay}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="current-postal-dropdown">
            <label htmlFor="currentPostalCode" className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code *
            </label>
            <PostalCodeDropdown
              value={formData.currentAddress?.postalCode || ''}
              onChange={handlePostalCodeChange}
              zipCodes={availableZipCodes}
              searchTerm={currentZipSearch}
              onSearchChange={setCurrentZipSearch}
              showDropdown={showCurrentZipDropdown}
              onToggleDropdown={setShowCurrentZipDropdown}
              onSelect={handleCurrentPostalSelect}
              placeholder="Search postal code..."
            />
            {errors.currentAddress?.postalCode && (
              <p className="text-red-500 text-xs mt-1">{errors.currentAddress.postalCode}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {availableZipCodes.length} total zip codes available
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
      
      {!formData.sameAsCurrent && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-[#400504] border-b pb-1">Permanent Address</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="permanentStreet" className="block text-sm font-medium text-gray-700 mb-1">
                Street *
              </label>
              <input
                id="permanentStreet"
                name="permanentAddress.street"
                type="text"
                value={formData.permanentAddress?.street || ''}
                onChange={handleStreetInput}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                placeholder="Street name and number"
                maxLength={30}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.permanentAddress?.street?.length || 0}/30
              </p>
            </div>
            
            <div>
              <label htmlFor="permanentArea" className="block text-sm font-medium text-gray-700 mb-1">
                Area *
              </label>
              <input
                id="permanentArea"
                name="permanentAddress.area"
                type="text"
                value={formData.permanentAddress?.area || ''}
                onChange={handleAreaInput}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                placeholder="Area/Subdivision"
                maxLength={30}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.permanentAddress?.area?.length || 0}/30
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Block/Lot *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    id="permanentBlock"
                    name="permanentAddress.block"
                    type="text"
                    value={formData.permanentAddress?.block || ''}
                    onChange={handleBlockInput}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                    placeholder="Block"
                    maxLength={4}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Block</p>
                </div>
                <div>
                  <input
                    id="permanentLot"
                    name="permanentAddress.lot"
                    type="text"
                    value={formData.permanentAddress?.lot || ''}
                    onChange={handleLotInput}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
                    placeholder="Lot"
                    maxLength={4}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Lot</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="permanentRegion" className="block text-sm font-medium text-gray-700 mb-1">
                Region *
              </label>
              <select
                id="permanentRegion"
                name="permanentAddress.regionCode"
                value={formData.permanentAddress?.regionCode || ''}
                onChange={handlePermanentRegionChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                  errors.permanentAddress?.region ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select Region</option>
                {permanentRegions.map(region => (
                  <option key={region.code} value={region.code}>
                    {region.name}
                  </option>
                ))}
              </select>
              {errors.permanentAddress?.region && (
                <p className="text-red-500 text-xs mt-1">{errors.permanentAddress.region}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="permanentProvince" className="block text-sm font-medium text-gray-700 mb-1">
                Province *
              </label>
              <select
                id="permanentProvince"
                name="permanentAddress.provinceCode"
                value={formData.permanentAddress?.provinceCode || ''}
                onChange={handlePermanentProvinceChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  errors.permanentAddress?.province ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                required
                disabled={!formData.permanentAddress?.regionCode}
              >
                <option value="">
                  {!formData.permanentAddress?.regionCode ? 'Select region first' : 'Select Province'}
                </option>
                {permanentProvinces.map(province => (
                  <option key={province.code} value={province.code}>
                    {province.name}
                  </option>
                ))}
              </select>
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
                }`}
                required
                disabled={!formData.permanentAddress?.provinceCode}
              >
                <option value="">
                  {!formData.permanentAddress?.provinceCode ? 'Select province first' : 'Select City/Municipality'}
                </option>
                {permanentCities.map(city => (
                  <option key={city.code} value={city.code}>
                    {city.name}
                  </option>
                ))}
              </select>
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
                }`}
                required
                disabled={!formData.permanentAddress?.cityCode}
              >
                <option value="">
                  {!formData.permanentAddress?.cityCode ? 'Select city first' : 'Select Barangay'}
                </option>
                {permanentBarangays.map(barangay => (
                  <option key={barangay.code} value={barangay.code}>
                    {barangay.name}
                  </option>
                ))}
              </select>
              {errors.permanentAddress?.barangay && (
                <p className="text-red-500 text-xs mt-1">{errors.permanentAddress.barangay}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="permanent-postal-dropdown">
              <label htmlFor="permanentPostalCode" className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code *
              </label>
              <PostalCodeDropdown
                value={formData.permanentAddress?.postalCode || ''}
                onChange={handlePermanentPostalCodeChange}
                zipCodes={permanentAvailableZipCodes}
                searchTerm={permanentZipSearch}
                onSearchChange={setPermanentZipSearch}
                showDropdown={showPermanentZipDropdown}
                onToggleDropdown={setShowPermanentZipDropdown}
                onSelect={handlePermanentPostalSelect}
                placeholder="Search postal code..."
              />
              {errors.permanentAddress?.postalCode && (
                <p className="text-red-500 text-xs mt-1">{errors.permanentAddress.postalCode}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {permanentAvailableZipCodes.length} total zip codes available
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
import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const PhoneNumberValidation = ({ 
  value = '', 
  onChange, 
  required = false,
  digitsOnly = false // New prop to control formatting
}) => {
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [phoneValue, setPhoneValue] = useState(value);

  // Update internal state when value prop changes
  useEffect(() => {
    setPhoneValue(value);
  }, [value]);

  const validatePhoneNumber = (phone) => {
    // Reset error state
    setIsValid(true);
    setErrorMessage('');
    
    // If not required and empty, it's valid
    if (!required && !phone) {
      return true;
    }
    
    let isValid = true;
    let errorMsg = '';

    // Check if phone number is empty
    if (!phone) {
      isValid = false;
      errorMsg = 'Phone number is required';
    } 
    // Additional validation if value exists
    else {
      // Remove any formatting to check digit count
      const digitsOnly = phone.replace(/\D/g, '');
      
      // Check if it's a valid international number (at least 8 digits total)
      if (digitsOnly.length < 8) {
        isValid = false;
        errorMsg = 'Phone number is too short';
      }
      
      // Check maximum length
      else if (digitsOnly.length > 15) {
        isValid = false;
        errorMsg = 'Phone number is too long';
      }
    }

    setIsValid(isValid);
    setErrorMessage(errorMsg);
    
    return isValid;
  };

  const handlePhoneChange = (value, country) => {
    // If digitsOnly is true, remove all formatting and send only digits to parent
    const processedValue = digitsOnly ? value.replace(/\D/g, '') : value;
    
    setPhoneValue(processedValue);
    
    // Update parent with processed phone number
    if (onChange) {
      const isValid = validatePhoneNumber(processedValue);
      onChange(processedValue, isValid);
    }
  };

  const handleBlur = () => {
    // Validate on blur
    validatePhoneNumber(phoneValue);
  };

  // For display in the input, we need to format it properly
  // but we'll store and send only digits if digitsOnly is true
  const displayValue = digitsOnly && phoneValue 
    ? formatPhoneNumber(phoneValue) 
    : phoneValue;

  // Helper function to format phone number for display
  function formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Format based on length
    if (cleaned.length <= 4) {
      return cleaned;
    } else if (cleaned.length <= 7) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    } else {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 11)}`;
    }
  }

  return (
    <div className="w-full">
      <PhoneInput
        country={'ph'}
        value={displayValue}
        onChange={handlePhoneChange}
        onBlur={handleBlur}
        countryCodeEditable={true}
        enableSearch={true}
        disableSearchIcon={false}
        inputProps={{
          required: required,
        }}
        inputStyle={{
          width: '100%',
          padding: '6px 10px',
          paddingLeft: '46px',
          fontSize: '12px',
          height: '32px',
          transition: 'all 0.2s ease-in-out',
        }}
        buttonStyle={{
          width: '42px',
          padding: '0 3px',
          height: '32px',
          transition: 'all 0.2s ease-in-out',
        }}
        inputClass={`border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#cba235] focus:border-transparent transition-all duration-200 ${
          !isValid ? 'border-red-500 bg-red-50' : 'hover:border-gray-400'
        }`}
        buttonClass={`transition-all duration-200 ${!isValid ? 'border-red-500 bg-red-50' : ''}`}
        dropdownClass="border-gray-300 rounded text-xs"
      />
      
      {!isValid && (
        <div className="text-red-500 text-xs mt-1 transition-all duration-200">
          {errorMessage}
        </div>
      )}

      {/* Display full phone number for reference */}
      {phoneValue && (
        <div className="text-xs text-gray-500 mt-1 transition-colors duration-200">
          Full number: {phoneValue}
        </div>
      )}
    </div>
  );
};

export default PhoneNumberValidation;
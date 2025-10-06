import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const PhoneNumberValidation = ({ 
  value = '', 
  onChange, 
  required = false,
  digitsOnly = false
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
    // Additional validation for Philippine numbers
    else {
      // Remove any formatting to check digit count
      const digitsOnly = phone.replace(/\D/g, '');
      
      // Check if it starts with Philippine country code (63)
      if (!digitsOnly.startsWith('63')) {
        isValid = false;
        errorMsg = 'Only Philippine phone numbers are allowed';
      }
      // Check minimum length for Philippine numbers (country code + area code + number)
      else if (digitsOnly.length < 11) {
        isValid = false;
        errorMsg = 'Philippine phone number is too short';
      }
      // Check maximum length for Philippine numbers
      else if (digitsOnly.length > 12) {
        isValid = false;
        errorMsg = 'Philippine phone number is too long';
      }
      // Validate Philippine mobile number format
      else if (digitsOnly.length >= 11) {
        const mobilePrefix = digitsOnly.substring(2, 4); // Get the prefix after 63
        const validMobilePrefixes = ['90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '81', '82', '83'];
        
        if (!validMobilePrefixes.includes(mobilePrefix)) {
          isValid = false;
          errorMsg = 'Invalid Philippine mobile number format';
        }
      }
    }

    setIsValid(isValid);
    setErrorMessage(errorMsg);
    
    return isValid;
  };

  const handlePhoneChange = (value, country) => {
    // Force Philippines country code
    let processedValue = value;
    
    // If the user tries to change country, force it back to Philippines
    if (country.countryCode !== 'ph') {
      // Extract digits only and ensure it starts with 63
      const digits = value.replace(/\D/g, '');
      if (!digits.startsWith('63')) {
        processedValue = '63' + digits;
      }
    }
    
    // If digitsOnly is true, remove all formatting and send only digits to parent
    if (digitsOnly) {
      processedValue = processedValue.replace(/\D/g, '');
    }
    
    setPhoneValue(processedValue);
    
    // Update parent with processed phone number
    if (onChange) {
      const isValid = validatePhoneNumber(processedValue);
      onChange(processedValue, isValid, country);
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
    
    // Format Philippine numbers: +63 XXX XXX XXXX
    if (cleaned.startsWith('63')) {
      const rest = cleaned.substring(2);
      if (rest.length <= 3) {
        return `+63 ${rest}`;
      } else if (rest.length <= 6) {
        return `+63 ${rest.substring(0, 3)} ${rest.substring(3)}`;
      } else {
        return `+63 ${rest.substring(0, 3)} ${rest.substring(3, 6)} ${rest.substring(6, 10)}`;
      }
    }
    
    return phoneNumber;
  }

  return (
    <div className="w-full">
      <PhoneInput
        country={'ph'}
        value={displayValue}
        onChange={handlePhoneChange}
        onBlur={handleBlur}
        countryCodeEditable={false} // Disable country code editing
        enableSearch={false} // Disable country search
        disableSearchIcon={true} // Hide search icon
        onlyCountries={['ph']} // Only show Philippines as an option
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
          cursor: 'default', // Indicate non-clickable
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



      {/* Help text for Philippine number format */}
      <div className="text-xs text-gray-400 mt-1">
        Format: +63 9XX XXX XXXX (Philippine mobile)
      </div>
    </div>
  );
};

export default PhoneNumberValidation;
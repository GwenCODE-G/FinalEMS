import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const PhoneNumberValidation = ({ 
  value = '', 
  onChange, 
  required = false,
  placeholder = "Enter phone number"
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
    
    // If required and empty
    if (required && !phone) {
      setIsValid(false);
      setErrorMessage('Phone number is required');
      return false;
    }

    // Remove any formatting to check digit count
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Check if it's a Philippine number (starts with 63)
    if (!digitsOnly.startsWith('63')) {
      setIsValid(false);
      setErrorMessage('Only Philippine phone numbers are allowed');
      return false;
    }
    
    // Check length (63 + 10 digits = 12 total)
    if (digitsOnly.length !== 12) {
      setIsValid(false);
      setErrorMessage('Philippine mobile number must be 12 digits (including +63)');
      return false;
    }
    
    // Validate Philippine mobile number format
    const mobilePrefix = digitsOnly.substring(2, 4); // Get the prefix after 63
    const validMobilePrefixes = [
      '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', // Globe/TM
      '81', '82', '83', '84', '85', '86', '87', '88', '89', // Smart/TNT
      '77', '78', '79' // New prefixes
    ];
    
    if (!validMobilePrefixes.includes(mobilePrefix)) {
      setIsValid(false);
      setErrorMessage('Invalid Philippine mobile number format');
      return false;
    }

    setIsValid(true);
    return true;
  };

  const handlePhoneChange = (value, country) => {
    setPhoneValue(value);
    
    // Validate the phone number
    const isValid = validatePhoneNumber(value);
    
    // Call parent onChange with the formatted value and validation status
    if (onChange) {
      onChange(value, isValid, country);
    }
  };

  const handleBlur = () => {
    validatePhoneNumber(phoneValue);
  };

  return (
    <div className="w-full">
      <PhoneInput
        country={'ph'}
        value={phoneValue}
        onChange={handlePhoneChange}
        onBlur={handleBlur}
        countryCodeEditable={false}
        enableSearch={false}
        disableSearchIcon={true}
        onlyCountries={['ph']}
        inputProps={{
          required: required,
          placeholder: placeholder,
        }}
        inputStyle={{
          width: '100%',
          padding: '8px 10px',
          paddingLeft: '48px',
          fontSize: '14px',
          height: '40px',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          transition: 'all 0.2s ease-in-out',
        }}
        buttonStyle={{
          width: '46px',
          padding: '0 4px',
          height: '40px',
          border: '1px solid #d1d5db',
          borderRight: 'none',
          borderTopLeftRadius: '8px',
          borderBottomLeftRadius: '8px',
          backgroundColor: '#f9fafb',
          transition: 'all 0.2s ease-in-out',
          cursor: 'default',
        }}
        inputClass={`focus:outline-none focus:ring-2 focus:ring-[#cba235] focus:border-transparent ${
          !isValid ? 'border-red-500 bg-red-50' : 'hover:border-gray-400'
        }`}
        buttonClass={`${!isValid ? 'border-red-500 bg-red-50' : ''}`}
        dropdownClass="border-gray-300 rounded-lg shadow-lg"
      />
      
      {!isValid && (
        <div className="text-red-500 text-xs mt-1 transition-all duration-200">
          {errorMessage}
        </div>
      )}

      {/* Help text for Philippine number format */}
      <div className="text-xs text-gray-500 mt-1">
        Format: +63 9XX XXX XXXX (Philippine mobile only)
      </div>
    </div>
  );
};

export default PhoneNumberValidation;
import React from 'react';

const BasicInfo = ({ formData, errors, isMinor, handleInputChange }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-[#400504] border-b pb-2">Basic Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* First Name */}
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            value={formData.firstName || ''}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
              errors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="Enter first name"
            required
            aria-describedby={errors.firstName ? "firstName-error" : undefined}
          />
          {errors.firstName && (
            <p id="firstName-error" className="mt-1 text-sm text-red-600">{errors.firstName}</p>
          )}
        </div>

        {/* Middle Name */}
        <div>
          <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-1">
            Middle Name
          </label>
          <input
            id="middleName"
            name="middleName"
            type="text"
            value={formData.middleName || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
            placeholder="Enter middle name"
          />
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            value={formData.lastName || ''}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
              errors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="Enter last name"
            required
            aria-describedby={errors.lastName ? "lastName-error" : undefined}
          />
          {errors.lastName && (
            <p id="lastName-error" className="mt-1 text-sm text-red-600">{errors.lastName}</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gender */}
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
            Gender *
          </label>
          <select
            id="gender"
            name="gender"
            value={formData.gender || ''}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
              errors.gender ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            required
            aria-describedby={errors.gender ? "gender-error" : undefined}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {errors.gender && (
            <p id="gender-error" className="mt-1 text-sm text-red-600">{errors.gender}</p>
          )}
        </div>
        
        {/* Birthday */}
        <div>
          <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-1">
            Birthday *
          </label>
          <input
            id="birthday"
            name="birthday"
            type="date"
            value={formData.birthday || ''}
            onChange={handleInputChange}
            max={new Date().toISOString().split('T')[0]}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
              errors.birthday ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            required
            aria-describedby={errors.birthday ? "birthday-error" : undefined}
          />
          {errors.birthday && (
            <p id="birthday-error" className="mt-1 text-sm text-red-600">{errors.birthday}</p>
          )}
        </div>
      </div>
      
      {/* Age Display */}
      <div>
        <label htmlFor="age-display" className="block text-sm font-medium text-gray-700 mb-1">
          Age
        </label>
        <input
          id="age-display"
          type="text"
          value={`${formData.age || ''} ${isMinor ? '(Minor)' : ''}`}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
          readOnly
          aria-live="polite"
          aria-atomic="true"
        />
        {isMinor && (
          <p className="mt-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            ⚠️ This employee is a minor. Please confirm if you want to proceed.
          </p>
        )}
      </div>
    </div>
  );
};

export default BasicInfo;
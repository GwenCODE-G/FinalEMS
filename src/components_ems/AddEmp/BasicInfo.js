import React, { useState, useEffect } from 'react';

const BasicInfo = ({ formData, errors, isMinor, handleInputChange }) => {
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const capitalizeWords = (text) => {
    return text.replace(/\b\w/g, char => char.toUpperCase());
  };

  const handleTextInput = (e) => {
    const { name, value } = e.target;
    const textOnly = value.replace(/[0-9]/g, '');
    const limitedValue = textOnly.slice(0, 30);
    const capitalizedValue = capitalizeWords(limitedValue);
    
    handleInputChange({
      target: {
        name: name,
        value: capitalizedValue
      }
    });
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const textOnly = pastedText.replace(/[0-9]/g, '');
    const limitedText = textOnly.slice(0, 30);
    const capitalizedText = capitalizeWords(limitedText);
    
    const target = e.target;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const currentValue = target.value;
    
    const newValue = currentValue.substring(0, start) + capitalizedText + currentValue.substring(end);
    const finalValue = newValue.slice(0, 30);
    
    handleInputChange({
      target: {
        name: target.name,
        value: finalValue
      }
    });
  };

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await fetch('https://psgc.gitlab.io/api/provinces/');
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
  }, []);

  useEffect(() => {
    if (selectedProvince) {
      const fetchCities = async () => {
        try {
          const response = await fetch(`https://psgc.gitlab.io/api/provinces/${selectedProvince}/cities-municipalities/`);
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
    }
  }, [selectedProvince]);

  const handleProvinceChange = (e) => {
    const provinceCode = e.target.value;
    setSelectedProvince(provinceCode);
    setSelectedCity('');
    
    const selectedProvinceName = provinces.find(p => p.code === provinceCode)?.name || '';
    
    handleInputChange({
      target: {
        name: 'birthplace',
        value: selectedProvinceName
      }
    });
  };

  const handleCityChange = (e) => {
    const cityCode = e.target.value;
    setSelectedCity(cityCode);
    
    const selectedCityName = cities.find(c => c.code === cityCode)?.name || '';
    const selectedProvinceName = provinces.find(p => p.code === selectedProvince)?.name || '';
    
    handleInputChange({
      target: {
        name: 'birthplace',
        value: `${selectedCityName}, ${selectedProvinceName}`
      }
    });
  };

  const getAgeCategory = () => {
    const age = formData.age || 0;
    
    if (age < 15) {
      return {
        category: 'child',
        message: 'This person is below working age. Cannot proceed with employment.',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    } else if (age < 18) {
      return {
        category: 'teenager',
        message: 'This employee is a teenager. Please confirm if you want to proceed.',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200'
      };
    } else if (age >= 60) {
      return {
        category: 'senior',
        message: 'This person is already a senior citizen. Employment may have restrictions.',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    } else {
      return {
        category: 'adult',
        message: '',
        color: '',
        bgColor: '',
        borderColor: ''
      };
    }
  };

  const ageCategory = getAgeCategory();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-[#400504] border-b pb-2">Basic Information</h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={formData.firstName || ''}
              onChange={handleTextInput}
              onPaste={handlePaste}
              maxLength={30}
              pattern="[A-Za-z\s]*"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                errors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter first name"
              required
              aria-describedby={errors.firstName ? "firstName-error" : undefined}
            />
            <div className="flex justify-between mt-2">
              {errors.firstName ? (
                <p id="firstName-error" className="text-sm text-red-600">{errors.firstName}</p>
              ) : (
                <div></div>
              )}
              <p className="text-xs text-gray-500">
                {formData.firstName?.length || 0}/30
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-2">
              Middle Name
            </label>
            <input
              id="middleName"
              name="middleName"
              type="text"
              value={formData.middleName || ''}
              onChange={handleTextInput}
              onPaste={handlePaste}
              maxLength={30}
              pattern="[A-Za-z\s]*"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
              placeholder="Enter middle name"
            />
            <p className="text-xs text-gray-500 text-right mt-2">
              {formData.middleName?.length || 0}/30
            </p>
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName || ''}
                  onChange={handleTextInput}
                  onPaste={handlePaste}
                  maxLength={30}
                  pattern="[A-Za-z\s]*"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                    errors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter last name"
                  required
                  aria-describedby={errors.lastName ? "lastName-error" : undefined}
                />
              </div>
              <div className="w-20">
                <select
                  id="suffix"
                  name="suffix"
                  value={formData.suffix || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors text-sm"
                >
                  <option value="">Suffix</option>
                  <option value="Jr.">Jr.</option>
                  <option value="Sr.">Sr.</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                  <option value="V">V</option>
                </select>
              </div>
            </div>
            <div className="flex justify-between mt-2">
              {errors.lastName ? (
                <p id="lastName-error" className="text-sm text-red-600">{errors.lastName}</p>
              ) : (
                <div></div>
              )}
              <p className="text-xs text-gray-500">
                {formData.lastName?.length || 0}/30
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
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
              <p id="gender-error" className="mt-2 text-sm text-red-600">{errors.gender}</p>
            )}
          </div>

          <div className="md:col-span-1">
            <label htmlFor="civilStatus" className="block text-sm font-medium text-gray-700 mb-2">
              Civil Status *
            </label>
            <select
              id="civilStatus"
              name="civilStatus"
              value={formData.civilStatus || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                errors.civilStatus ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Select Status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
              <option value="Separated">Separated</option>
            </select>
            {errors.civilStatus && (
              <p className="mt-2 text-sm text-red-600">{errors.civilStatus}</p>
            )}
          </div>

          <div className="md:col-span-1">
            <label htmlFor="religion" className="block text-sm font-medium text-gray-700 mb-2">
              Religion *
            </label>
            <select
              id="religion"
              name="religion"
              value={formData.religion || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors ${
                errors.religion ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              required
              aria-describedby={errors.religion ? "religion-error" : undefined}
            >
              <option value="">Select Religion</option>
              <option value="Roman Catholic">Roman Catholic</option>
              <option value="Islam">Islam</option>
              <option value="Evangelical">Evangelical</option>
              <option value="Iglesia ni Cristo">Iglesia ni Cristo</option>
              <option value="Protestant">Protestant</option>
              <option value="Baptist">Baptist</option>
              <option value="Born Again">Born Again</option>
              <option value="Mormon">Mormon</option>
              <option value="Seventh-day Adventist">Seventh-day Adventist</option>
              <option value="Ang Dating Daan">Ang Dating Daan</option>
              <option value="Jehovah's Witness">Jehovah's Witness</option>
              <option value="Buddhism">Buddhism</option>
              <option value="Hinduism">Hinduism</option>
              <option value="Judaism">Judaism</option>
              <option value="None">None</option>
              <option value="Other">Other</option>
            </select>
            {errors.religion && (
              <p id="religion-error" className="mt-2 text-sm text-red-600">{errors.religion}</p>
            )}
          </div>
          
          <div className="md:col-span-1">
            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-3">
                <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-2">
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
                  <p id="birthday-error" className="mt-2 text-sm text-red-600">{errors.birthday}</p>
                )}
              </div>
              
              <div className="col-span-2">
                <label htmlFor="age-display" className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <input
                  id="age-display"
                  type="text"
                  value={formData.age || ''}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed text-center ${
                    ageCategory.category === 'child' ? 'border-red-300 bg-red-50 text-red-600' :
                    ageCategory.category === 'teenager' ? 'border-amber-300 bg-amber-50 text-amber-600' :
                    ageCategory.category === 'senior' ? 'border-blue-300 bg-blue-50 text-blue-600' : ''
                  }`}
                  readOnly
                  aria-live="polite"
                  aria-atomic="true"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Birthplace *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label htmlFor="birthProvince" className="block text-sm font-medium text-gray-600 mb-2">
              Province
            </label>
            <select
              id="birthProvince"
              value={selectedProvince}
              onChange={handleProvinceChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors"
              required
            >
              <option value="">Select Province</option>
              {provinces.map(province => (
                <option key={province.code} value={province.code}>
                  {province.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="birthCity" className="block text-sm font-medium text-gray-600 mb-2">
              City/Municipality
            </label>
            <select
              id="birthCity"
              value={selectedCity}
              onChange={handleCityChange}
              disabled={!selectedProvince}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cba235] focus:border-transparent transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
            >
              <option value="">
                {!selectedProvince ? 'Select province first' : 'Select City/Municipality'}
              </option>
              {cities.map(city => (
                <option key={city.code} value={city.code}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="max-w-2xl">
          <input
            type="hidden"
            name="birthplace"
            value={formData.birthplace || ''}
          />
          {errors.birthplace && (
            <p className="mt-2 text-sm text-red-600">{errors.birthplace}</p>
          )}
        </div>
      </div>

      {ageCategory.message && (
        <div className="max-w-2xl">
          <p className={`text-sm px-3 py-2 rounded-lg border ${ageCategory.color} ${ageCategory.bgColor} ${ageCategory.borderColor}`}>
            {ageCategory.message}
          </p>
        </div>
      )}
    </div>
  );
};

export default BasicInfo;
// frontend/src/components_ems/AddEmp/FormNavigation.js
import React from 'react';

const FormNavigation = ({ step, prevStep, nextStep, isMinor, isSubmitting, validateStep }) => {
  const handleNextClick = () => {
    if (validateStep && !validateStep(step)) {
      return; // Don't proceed if validation fails
    }
    nextStep();
  };

  return (
    <div className="flex justify-between mt-8">
      {step > 1 ? (
        <button
          type="button"
          onClick={prevStep}
          className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          Previous
        </button>
      ) : (
        <div></div>
      )}
      
      {step < 4 ? (
        <button
          type="button"
          onClick={handleNextClick}
          className="px-6 py-3 bg-[#cba235] text-[#400504] rounded-lg hover:bg-[#dbb545] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          Next
        </button>
      ) : (
        <button
          type="submit"
          className="px-6 py-3 bg-[#400504] text-white rounded-lg hover:bg-[#300404] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Adding Employee...
            </>
          ) : (
            'Save Employee'
          )}
        </button>
      )}
    </div>
  );
};

export default FormNavigation;
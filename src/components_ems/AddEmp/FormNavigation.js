import React from 'react';

const FormNavigation = ({ step, prevStep, nextStep, isMinor }) => {
  return (
    <div className="flex justify-between mt-8">
      {step > 1 ? (
        <button
          type="button"
          onClick={prevStep}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
        >
          Previous
        </button>
      ) : (
        <div></div>
      )}
      
      {step < 4 ? (
        <button
          type="button"
          onClick={nextStep}
          className="px-4 py-2 bg-[#cba235] text-[#400504] rounded-lg hover:bg-[#dbb545] transition-colors"
        >
          Next
        </button>
      ) : (
        <button
          type="submit"
          className="px-4 py-2 bg-[#400504] text-white rounded-lg hover:bg-[#300404] transition-colors"
        >
          Save Employee
        </button>
      )}
    </div>
  );
};

export default FormNavigation;
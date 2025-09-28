import React from 'react';

const StepProgress = ({ step }) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">Step {step} of 4</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-[#cba235] h-2.5 rounded-full" 
          style={{ width: `${(step / 4) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

export default StepProgress;
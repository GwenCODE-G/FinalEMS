import React from 'react';
import { FaTimes } from 'react-icons/fa';

const ManualAttendanceModal = ({
  isOpen,
  onClose,
  employee,
  action,
  time,
  selectedDate,
  onTimeChange,
  onConfirm
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!time) {
      onConfirm();
      return;
    }

    if (action === 'timeout') {
      const currentTime = new Date();
      const selectedTime = new Date(`${selectedDate}T${time}`);
      
      const timeDifference = (currentTime - selectedTime) / (1000 * 60);
      
      if (timeDifference < 10) {
        alert('Please wait at least 10 minutes between time in and time out');
        return;
      }
    }
    
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-[#400504]">
            Manual {action === 'timein' ? 'Time In' : 'Time Out'} - {employee?.firstName} {employee?.lastName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#cba235] text-sm"
            disabled
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time (HH:MM)
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#cba235] text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to use current time
          </p>
          {action === 'timeout' && (
            <p className="text-xs text-yellow-600 mt-1">
              Note: Time out must be at least 10 minutes after time in
            </p>
          )}
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] text-sm"
          >
            Record {action === 'timein' ? 'Time In' : 'Time Out'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualAttendanceModal;
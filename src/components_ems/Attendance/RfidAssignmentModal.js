import React, { useState } from 'react';
import { 
  FaTimes, FaInfoCircle, FaQrcode, FaKey, FaCheck, 
  FaExclamationCircle, FaExclamationTriangle, FaIdCard 
} from 'react-icons/fa';

const RfidAssignmentModal = ({ 
  isOpen, 
  onClose, 
  employee, 
  mode, 
  scannedUid, 
  existingAssignment,
  removalReason,
  otherReason,
  onScanRfid,
  onConfirmReassignment,
  onRemoveRfid,
  onInputChange
}) => {
  const [uidInput, setUidInput] = useState('');

  if (!isOpen) return null;

  const handleUidInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    // Auto-format as user types: XX XX XX XX
    const formatted = value.replace(/[^0-9A-F]/g, '')
      .replace(/(.{2})/g, '$1 ')
      .trim()
      .slice(0, 11); // Limit to 8 characters + 3 spaces
    setUidInput(formatted);
  };

  const handleSubmit = () => {
    const cleanUid = uidInput.replace(/\s/g, '');
    if (cleanUid.length === 8 && /^[0-9A-F]{8}$/i.test(cleanUid)) {
      onScanRfid(cleanUid);
    } else {
      alert('Please enter a valid 8-character RFID UID (e.g., 4DD6D8B5)');
    }
  };

  const renderScanMode = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <FaInfoCircle className="text-blue-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-blue-800 font-semibold">How to Assign RFID</h4>
            <ul className="text-blue-700 text-sm mt-2 space-y-1">
              <li className="flex items-center">
                <FaQrcode className="mr-2 text-blue-500" />
                Scan the RFID card or enter the UID manually
              </li>
              <li className="flex items-center">
                <FaKey className="mr-2 text-blue-500" />
                Format: 8 hexadecimal characters (e.g., 4D D6 D8 B5)
              </li>
              <li className="flex items-center">
                <FaCheck className="mr-2 text-blue-500" />
                The system will verify and assign the card
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Enter RFID UID
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={uidInput}
            onChange={handleUidInputChange}
            placeholder="4D D6 D8 B5"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] focus:border-transparent font-mono text-sm uppercase"
            maxLength={11}
          />
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] flex items-center space-x-2"
          >
            <FaCheck className="text-sm" />
            <span>Assign</span>
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Enter 8 hexadecimal characters (0-9, A-F). Spaces will be added automatically.
        </p>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Employee Information</h5>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Name:</span>
            <div className="font-medium">{employee?.firstName} {employee?.lastName}</div>
          </div>
          <div>
            <span className="text-gray-500">ID:</span>
            <div className="font-medium">{employee?.employeeId}</div>
          </div>
          <div>
            <span className="text-gray-500">Department:</span>
            <div className="font-medium">{employee?.department}</div>
          </div>
          <div>
            <span className="text-gray-500">Position:</span>
            <div className="font-medium">{employee?.position}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConfirmMode = () => (
    <div className="space-y-4">
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <div className="flex items-start">
          <FaExclamationCircle className="text-yellow-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-yellow-800 font-semibold">RFID Already Assigned</h4>
            <p className="text-yellow-700 text-sm mt-1">
              This RFID card is currently assigned to another employee.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
        <div className="text-center">
          <div className="text-red-600 font-semibold">Current Assignment</div>
          <div className="text-red-700 text-sm mt-1">{existingAssignment}</div>
        </div>
      </div>

      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
        <div className="text-center">
          <div className="text-blue-600 font-semibold">New Assignment</div>
          <div className="text-blue-700 text-sm mt-1">
            {employee?.firstName} {employee?.lastName} ({employee?.employeeId})
          </div>
          <div className="text-blue-600 text-xs mt-1 font-mono">{scannedUid}</div>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <p className="text-sm text-gray-600 text-center">
          Do you want to reassign this RFID card? The previous assignment will be removed.
        </p>
      </div>
    </div>
  );

  const renderRemoveMode = () => (
    <div className="space-y-4">
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <div className="flex items-start">
          <FaExclamationTriangle className="text-red-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-red-800 font-semibold">Remove RFID Assignment</h4>
            <p className="text-red-700 text-sm mt-1">
              This will remove the RFID assignment from the employee. Please provide a reason for removal.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Employee Information</h5>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Name:</span>
            <div className="font-medium">{employee?.firstName} {employee?.lastName}</div>
          </div>
          <div>
            <span className="text-gray-500">ID:</span>
            <div className="font-medium">{employee?.employeeId}</div>
          </div>
          <div>
            <span className="text-gray-500">Current RFID:</span>
            <div className="font-medium font-mono">{employee?.rfidUid || 'Not assigned'}</div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Removal Reason <span className="text-red-500">*</span>
        </label>
        <select
          value={removalReason}
          onChange={(e) => onInputChange('removalReason', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm"
        >
          <option value="">Select a reason</option>
          <option value="CARD_LOST">Card Lost</option>
          <option value="CARD_DAMAGED">Card Damaged</option>
          <option value="EMPLOYEE_TERMINATED">Employee Terminated</option>
          <option value="EMPLOYEE_TRANSFER">Employee Transfer</option>
          <option value="SECURITY_ISSUE">Security Issue</option>
          <option value="SYSTEM_UPDATE">System Update</option>
          <option value="OTHER">Other Reason</option>
        </select>
      </div>

      {removalReason === 'OTHER' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Specify Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={otherReason}
            onChange={(e) => onInputChange('otherReason', e.target.value)}
            placeholder="Please specify the reason for removal..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] text-sm"
            rows="3"
          />
        </div>
      )}
    </div>
  );

  const getModalTitle = () => {
    switch (mode) {
      case 'scan': return 'Assign RFID Card';
      case 'confirm': return 'Confirm RFID Reassignment';
      case 'remove': return 'Remove RFID Assignment';
      default: return 'RFID Management';
    }
  };

  const getActionButtons = () => {
    switch (mode) {
      case 'scan':
        return (
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] text-sm flex items-center"
            >
              <FaCheck className="mr-2" />
              Assign RFID
            </button>
          </div>
        );
      
      case 'confirm':
        return (
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onConfirmReassignment}
              className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] text-sm"
            >
              Confirm Reassignment
            </button>
          </div>
        );
      
      case 'remove':
        return (
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onRemoveRfid}
              disabled={!removalReason || (removalReason === 'OTHER' && !otherReason)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            >
              Remove RFID
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  const getModalIcon = () => {
    switch (mode) {
      case 'scan':
        return <FaIdCard className="text-[#400504] text-xl" />;
      case 'confirm':
        return <FaExclamationCircle className="text-yellow-600 text-xl" />;
      case 'remove':
        return <FaExclamationTriangle className="text-red-600 text-xl" />;
      default:
        return <FaIdCard className="text-[#400504] text-xl" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getModalIcon()}
            <h3 className="text-lg font-bold text-[#400504]">
              {getModalTitle()}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="p-6">
          {mode === 'scan' && renderScanMode()}
          {mode === 'confirm' && renderConfirmMode()}
          {mode === 'remove' && renderRemoveMode()}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          {getActionButtons()}
        </div>
      </div>
    </div>
  );
};

export default RfidAssignmentModal;
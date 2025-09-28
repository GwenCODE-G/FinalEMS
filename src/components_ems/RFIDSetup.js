import React, { useState, useEffect, useCallback } from 'react';
import {
  assignRFIDToEmployee,
  checkRFIDAvailability,
  getAvailableUIDs,
  addEMSUID,
} from './employeeService';

const RFIDSetup = ({ employee, onClose, onSave }) => {
  const [rfidUid, setRfidUid] = useState(employee?.rfidUid || '');
  const [message, setMessage] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [uids, setUids] = useState([]);
  const [loadingUIDs, setLoadingUIDs] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [addingUID, setAddingUID] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const fetchUIDs = useCallback(async () => {
    setLoadingUIDs(true);
    try {
      const data = await getAvailableUIDs();
      setUids(data);
    } catch (err) {
      console.error('Failed to fetch UIDs:', err);
    } finally {
      setLoadingUIDs(false);
    }
  }, []);

  useEffect(() => {
    fetchUIDs();
  }, [fetchUIDs]);

  const formatInput = (value) => {
    const clean = value.replace(/[^A-Fa-f0-9]/g, '').toUpperCase();
    const parts = [];
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.substring(i, i + 4));
    }
    return parts.join(' - ');
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    const formatted = formatInput(val);
    setRfidUid(formatted);
  };

  const handleSelectUID = (uid) => {
    setRfidUid(uid);
  };

  const handleCheckAvailability = async () => {
    if (!rfidUid) return;
    setCheckingAvailability(true);
    setMessage('');
    try {
      const { available } = await checkRFIDAvailability(rfidUid);
      setIsAvailable(available);
      setMessage(available ? 'RFID is available' : 'UID already assigned to another employee');
    } catch (err) {
      setMessage('Error checking UID');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleAddUID = async () => {
    if (!rfidUid) {
      setMessage('Enter a valid UID');
      return;
    }
    setAddingUID(true);
    setMessage('');
    try {
      await addEMSUID(rfidUid);
      setMessage('UID added to database');
      fetchUIDs();
    } catch (err) {
      setMessage('Failed to add UID');
    } finally {
      setAddingUID(false);
    }
  };

  const handleAssign = async () => {
    if (!rfidUid || !isAvailable) {
      setMessage('Select a valid and available UID');
      return;
    }
    setAssigning(true);
    setMessage('');
    try {
      await assignRFIDToEmployee(employee._id, rfidUid);
      setMessage('RFID assigned successfully!');
      if (onSave) onSave();
    } catch (err) {
      setMessage('Error assigning RFID');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-[#400504]">
          {employee ? `Assign RFID to ${employee.firstName} ${employee.lastName}` : 'Assign RFID'}
        </h2>
        {employee && (
          <div className="mb-4 p-3 bg-gray-100 rounded">
            <p><strong>Employee ID:</strong> {employee.employeeId}</p>
            <p><strong>Department:</strong> {employee.department}</p>
            <p><strong>Current RFID:</strong> {employee.rfidUid || 'None'}</p>
          </div>
        )}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Enter RFID UID</label>
          <input
            type="text"
            value={rfidUid}
            onChange={handleInputChange}
            onBlur={handleCheckAvailability}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="e.g., 36D7 B6B8"
            disabled={addingUID || assigning}
          />
        </div>
        <div className="mb-2">
          <h4 className="text-gray-600 text-sm">Stored UIDs</h4>
          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2 mt-2">
            {loadingUIDs ? (
              <p className="text-gray-500 text-sm">Loading UIDs...</p>
            ) : uids.length === 0 ? (
              <p className="text-gray-500 text-sm">No UIDs stored</p>
            ) : (
              uids.map((uid) => (
                <div key={uid._id} className="flex justify-between items-center py-1 border-b border-gray-200">
                  <button
                    onClick={() => handleSelectUID(uid.uid)}
                    className="text-blue-600 hover:underline"
                  >
                    {uid.uid}
                  </button>
                  {uid.assignedTo ? (
                    <span className="text-sm text-gray-500">Assigned</span>
                  ) : (
                    <span className="text-sm text-green-600">Available</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        <div className="mt-2 mb-4 flex gap-2">
          <button
            onClick={handleAddUID}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            disabled={addingUID}
          >
            {addingUID ? 'Adding...' : 'Add UID'}
          </button>
          <button
            onClick={handleCheckAvailability}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={checkingAvailability}
          >
            {checkingAvailability ? 'Checking...' : 'Check Availability'}
          </button>
        </div>
        {message && (
          <div
            className={`mb-4 p-2 rounded ${
              message.includes('Error') || message.includes('already')
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {message}
          </div>
        )}
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            disabled={assigning}
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            className="px-4 py-2 bg-[#400504] text-white rounded hover:bg-[#600606]"
            disabled={!isAvailable || assigning}
          >
            {assigning ? 'Assigning...' : 'Assign RFID'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RFIDSetup;
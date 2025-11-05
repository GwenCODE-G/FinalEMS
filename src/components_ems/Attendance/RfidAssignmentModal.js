import React, { useState, useEffect } from 'react';
import { 
  FaTimes, FaInfoCircle, FaQrcode, FaKey, FaCheck, 
  FaExclamationCircle, FaExclamationTriangle, FaSync,
  FaDatabase
} from 'react-icons/fa';
import axios from 'axios';

const RfidAssignmentModal = ({ 
  isOpen, 
  onClose, 
  employee, 
  onAssignSuccess 
}) => {
  const [uidInput, setUidInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [assignmentStatus, setAssignmentStatus] = useState('');

  // Safe employee data with defaults
  const safeEmployee = employee || {};
  const hasRfidAssigned = safeEmployee.isRfidAssigned && safeEmployee.rfidUid;
  const employeeName = safeEmployee.firstName && safeEmployee.lastName 
    ? `${safeEmployee.firstName} ${safeEmployee.lastName}`
    : 'Unknown Employee';
  const employeeId = safeEmployee.employeeId || 'Unknown ID';

  useEffect(() => {
    const findBackendUrl = async () => {
      const ports = [5000, 5001, 3001, 3000, 8080];
      for (let port of ports) {
        try {
          const response = await axios.get(`http://localhost:${port}/api/test`, { timeout: 3000 });
          setApiBaseUrl(`http://localhost:${port}`);
          break;
        } catch (error) {
          continue;
        }
      }
    };
    
    if (isOpen) {
      findBackendUrl();
      setUidInput('');
      setIsSubmitting(false);
      setAssignmentStatus('');
    }
  }, [isOpen]);

  const normalizeUid = (uid) => {
    if (!uid) return '';
    return uid.replace(/\s/g, '').toUpperCase();
  };

  const formatUidForDisplay = (uid) => {
    if (!uid) return '';
    const cleanUid = normalizeUid(uid);
    if (cleanUid.length === 8) {
      return cleanUid.match(/.{1,2}/g)?.join(' ').toUpperCase() || cleanUid;
    }
    return cleanUid;
  };

  const validateUid = (uid) => {
    const cleanUid = normalizeUid(uid);
    
    if (cleanUid.length !== 8) {
      return {
        valid: false,
        message: `UID must be exactly 8 characters long. Current: ${cleanUid.length} characters`
      };
    }
    
    if (!/^[0-9A-F]{8}$/i.test(cleanUid)) {
      return {
        valid: false,
        message: 'UID must contain only hexadecimal characters (0-9, A-F)'
      };
    }
    
    return { valid: true, message: 'Valid UID format' };
  };

  const handleUidInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    const cleanValue = value.replace(/[^0-9A-F\s]/g, '');
    
    let formatted = '';
    let charCount = 0;
    
    for (let i = 0; i < cleanValue.length; i++) {
      if (cleanValue[i] === ' ') continue;
      
      if (charCount > 0 && charCount % 2 === 0) {
        formatted += ' ';
      }
      formatted += cleanValue[i];
      charCount++;
      
      if (charCount >= 8) break;
    }
    
    setUidInput(formatted.trim());
  };

  const handleAssignRfid = async () => {
    if (!apiBaseUrl) {
      alert('Backend connection not available. Please make sure the backend server is running.');
      return;
    }

    if (!safeEmployee.employeeId) {
      alert('Employee information is incomplete. Cannot assign RFID.');
      return;
    }

    const cleanUid = normalizeUid(uidInput);
    const validation = validateUid(cleanUid);
    
    if (!validation.valid) {
      alert(`Invalid UID Format:\n${validation.message}\n\nExamples:\n• E154E2A9\n• E1 54 E2 A9\n• 4DD6D8B5`);
      return;
    }

    setIsSubmitting(true);
    setAssignmentStatus('assigning');

    try {
      console.log('Assigning RFID to both collections:', {
        employeeId: safeEmployee.employeeId,
        uid: cleanUid,
        formatted: formatUidForDisplay(cleanUid),
        database: 'BrightonSystem',
        collections: ['EMS_UID', 'EMS_Employee']
      });

      const response = await axios.post(`${apiBaseUrl}/api/rfid/assign`, {
        employeeId: safeEmployee.employeeId,
        rfidUid: cleanUid
      });

      if (response.data.success) {
        console.log('RFID assignment successful in both collections:', response.data);
        setAssignmentStatus('success');
        
        // Wait a moment to show success message
        setTimeout(() => {
          if (onAssignSuccess) {
            onAssignSuccess();
          }
          onClose();
        }, 1500);
      } else {
        throw new Error(response.data.message || 'Failed to assign RFID');
      }
    } catch (error) {
      console.error('RFID assignment error:', error);
      setAssignmentStatus('error');
      
      if (error.response?.data?.message) {
        if (error.response.data.assignedTo) {
          alert(`RFID Assignment Failed: ${error.response.data.message}\n\nCurrently assigned to: ${error.response.data.assignedTo}`);
        } else {
          alert(`RFID Assignment Failed: ${error.response.data.message}`);
        }
      } else {
        alert('Error assigning RFID. Please check the backend connection and try again.');
      }
      
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAssignRfid();
    }
  };

  const handleRemoveRfid = async () => {
    if (!apiBaseUrl) {
      alert('Backend connection not available.');
      return;
    }

    if (!safeEmployee.employeeId) {
      alert('Employee information is incomplete. Cannot remove RFID.');
      return;
    }

    if (!hasRfidAssigned) {
      alert('This employee does not have an RFID assigned.');
      return;
    }

    const confirmRemove = window.confirm(
      `Are you sure you want to remove RFID assignment from ${employeeName}?\n\nThis will remove the assignment from both EMS_UID and Employee collections.`
    );

    if (!confirmRemove) return;

    setIsSubmitting(true);
    setAssignmentStatus('removing');

    try {
      console.log('Removing RFID from both collections for employee:', safeEmployee.employeeId);

      const response = await axios.delete(`${apiBaseUrl}/api/rfid/remove/${safeEmployee.employeeId}`);

      if (response.data.success) {
        console.log('RFID removal successful from both collections:', response.data);
        setAssignmentStatus('removed');
        
        // Wait a moment to show success message
        setTimeout(() => {
          if (onAssignSuccess) {
            onAssignSuccess();
          }
          onClose();
        }, 1500);
      } else {
        throw new Error(response.data.message || 'Failed to remove RFID');
      }
    } catch (error) {
      console.error('RFID removal error:', error);
      setAssignmentStatus('error');
      alert(`Error removing RFID: ${error.response?.data?.message || error.message}`);
      setIsSubmitting(false);
    }
  };

  const getStatusMessage = () => {
    switch (assignmentStatus) {
      case 'assigning':
        return { message: 'Assigning RFID to both collections...', color: 'text-blue-600' };
      case 'success':
        return { message: 'RFID assigned successfully!', color: 'text-green-600' };
      case 'removing':
        return { message: 'Removing RFID from both collections...', color: 'text-blue-600' };
      case 'removed':
        return { message: 'RFID removed successfully!', color: 'text-green-600' };
      case 'error':
        return { message: 'Operation failed. Please try again.', color: 'text-red-600' };
      default:
        return { message: '', color: '' };
    }
  };

  const status = getStatusMessage();

  // Don't render if not open or employee data is completely missing
  if (!isOpen || !safeEmployee.employeeId) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-bold text-[#400504]">
            {hasRfidAssigned ? 'Manage RFID Card' : 'Assign RFID Card'}
          </h3>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <FaInfoCircle className="text-blue-600 mt-1 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-blue-800 font-semibold">
                    {hasRfidAssigned ? 'RFID Card Management' : 'RFID Card Assignment'}
                  </h4>
                  <p className="text-blue-700 text-sm mt-2">
                    {hasRfidAssigned ? (
                      <>
                        Managing RFID for: <strong>{employeeName}</strong>
                        <br />
                        Current RFID: <strong>{safeEmployee.rfidUid || 'Not available'}</strong>
                      </>
                    ) : (
                      <>
                        Assigning RFID to: <strong>{employeeName}</strong>
                        <br />
                        Employee ID: <strong>{employeeId}</strong>
                      </>
                    )}
                  </p>
                  <div className="flex items-center mt-2 text-blue-600 text-sm">
                    <FaDatabase className="mr-2" />
                    <span>Will update both EMS_UID and EMS_Employee collections</span>
                  </div>
                </div>
              </div>
            </div>

            {!hasRfidAssigned ? (
              <div className="space-y-3">
                <label htmlFor="rfid-uid-input" className="block text-sm font-medium text-gray-700">
                  RFID UID <span className="text-red-500">*</span>
                </label>
                
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <input
                      id="rfid-uid-input"
                      name="rfidUid"
                      type="text"
                      value={uidInput}
                      onChange={handleUidInputChange}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter UID (e.g., E1 54 E2 A9)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#400504] focus:border-transparent font-mono text-sm uppercase"
                      maxLength={11}
                      disabled={isSubmitting}
                      autoComplete="off"
                    />
                    {uidInput && (
                      <button
                        type="button"
                        onClick={() => setUidInput('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-gray-500">
                    Enter 8 hexadecimal characters (0-9, A-F). Spaces will be added automatically.
                  </p>
                  {uidInput && (
                    <p className="text-xs text-green-600 font-mono">
                      Formatted: {formatUidForDisplay(uidInput)}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-start">
                  <FaExclamationTriangle className="text-yellow-600 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-yellow-800 font-semibold">Current Assignment</h4>
                    <p className="text-yellow-700 text-sm mt-1">
                      This employee already has an RFID assigned.
                    </p>
                    <p className="text-yellow-700 text-sm mt-2 font-mono">
                      Current UID: <strong>{safeEmployee.rfidUid}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {status.message && (
              <div className={`p-3 rounded-lg border ${status.color.replace('text-', 'bg-').replace('-600', '-100')} ${status.color.replace('text-', 'border-').replace('-600', '-200')}`}>
                <p className={`text-sm font-medium ${status.color}`}>
                  {status.message}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            
            {hasRfidAssigned ? (
              <button
                type="button"
                onClick={handleRemoveRfid}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {isSubmitting && assignmentStatus === 'removing' ? (
                  <>
                    <FaSync className="animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <FaTimes />
                    <span>Remove RFID</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAssignRfid}
                disabled={isSubmitting || !uidInput.trim()}
                className="px-4 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {isSubmitting && assignmentStatus === 'assigning' ? (
                  <>
                    <FaSync className="animate-spin" />
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <FaCheck />
                    <span>Assign RFID</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RfidAssignmentModal;
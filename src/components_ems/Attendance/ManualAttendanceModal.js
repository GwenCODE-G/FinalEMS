import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManualAttendanceModal = ({
  isOpen,
  onClose,
  employee,
  action,
  selectedDate,
  onConfirm,
  apiBaseUrl
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentTime24, setCurrentTime24] = useState('');
  const [existingTimeIn, setExistingTimeIn] = useState(null);
  const [minTimeOut, setMinTimeOut] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [timeInSource, setTimeInSource] = useState('');

  // Fetch existing attendance record when modal opens
  useEffect(() => {
    if (!isOpen || !employee || !apiBaseUrl) return;

    const fetchExistingAttendance = async () => {
      setLoading(true);
      setValidationError('');
      try {
        console.log('🔍 Fetching attendance record for:', {
          employeeId: employee.employeeId,
          date: selectedDate,
          action: action
        });

        // Get today's attendance for this specific employee
        const response = await axios.get(
          `${apiBaseUrl}/api/attendance/today`,
          { timeout: 10000 }
        );

        console.log('📊 Today attendance response:', response.data);

        if (response.data.success && response.data.data) {
          // Find this employee's record in today's attendance
          const employeeRecord = response.data.data.find(
            record => record.employeeId === employee.employeeId
          );

          console.log('👤 Employee attendance record:', employeeRecord);

          if (employeeRecord) {
            setAttendanceRecord(employeeRecord);
            
            if (employeeRecord.timeIn) {
              setExistingTimeIn(employeeRecord.timeIn);
              setTimeInSource(employeeRecord.timeInSource || 'unknown');
              
              // Calculate minimum time out (time in + 10 minutes)
              const timeIn = new Date(employeeRecord.timeIn);
              const minTimeOutDate = new Date(timeIn.getTime() + (10 * 60 * 1000));
              setMinTimeOut(minTimeOutDate);
              
              console.log('⏰ Time In Details:', {
                timeIn: timeIn.toLocaleString(),
                source: employeeRecord.timeInSource,
                minTimeOut: minTimeOutDate.toLocaleString()
              });
            } else {
              console.log('❌ No time in found in record');
              setExistingTimeIn(null);
            }
          } else {
            console.log('❌ No attendance record found for employee today');
            setExistingTimeIn(null);
          }
        } else {
          console.log('❌ No attendance data in response');
          setExistingTimeIn(null);
        }
      } catch (error) {
        console.error('💥 Error fetching existing attendance:', error);
        if (error.response) {
          console.error('Error response:', error.response.data);
        }
        setValidationError('Error checking existing attendance record. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchExistingAttendance();
  }, [isOpen, employee, action, selectedDate, apiBaseUrl]);

  // Update current time every second
  useEffect(() => {
    if (!isOpen) return;

    const updateTime = () => {
      const now = new Date();
      // Convert to Philippine Time (UTC+8)
      const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      const timeString24 = phTime.toISOString().substr(11, 5);
      setCurrentTime24(timeString24);
      
      // Convert to 12-hour format
      const [hours, minutes] = timeString24.split(':');
      const hour = parseInt(hours);
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const timeString12 = `${hour12}:${minutes} ${period}`;
      setCurrentTime(timeString12);
    };

    updateTime(); // Initial call
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Validate time out against 10-minute rule
  const validateTimeOut = (timeIn, proposedTimeOut) => {
    if (!timeIn || !proposedTimeOut) return { valid: false, error: 'Missing time data' };

    const timeInDate = new Date(timeIn);
    const timeOutDate = new Date(proposedTimeOut);
    
    const timeDifference = (timeOutDate - timeInDate) / (1000 * 60); // difference in minutes
    
    console.log('⏱️ Time validation:', {
      timeIn: timeInDate.toLocaleString(),
      timeOut: timeOutDate.toLocaleString(),
      difference: timeDifference + ' minutes'
    });

    if (timeDifference < 10) {
      const remainingMinutes = Math.ceil(10 - timeDifference);
      return {
        valid: false,
        error: `Time out must be at least 10 minutes after time in. Wait ${remainingMinutes} more minutes.`,
        remainingMinutes: remainingMinutes
      };
    }

    return { valid: true, error: '' };
  };

  const handleConfirm = async () => {
    if (!currentTime24) {
      setValidationError('Please wait for time to sync');
      return;
    }

    // Create full datetime for validation
    const proposedTime = new Date(`${selectedDate}T${currentTime24}:00`);
    const hours = proposedTime.getHours();
    const minutes = proposedTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    if (action === 'timein') {
      // Check if time in already exists
      if (existingTimeIn) {
        setValidationError('Time in already recorded for today. Cannot record duplicate time in.');
        return;
      }

      // Time in allowed: 6:00 AM - 5:00 PM (360 to 1020 minutes)
      if (totalMinutes < 360 || totalMinutes >= 1020) {
        setValidationError('Manual time in only allowed between 6:00 AM - 5:00 PM (Philippine Time)');
        return;
      }
    } 
    else if (action === 'timeout') {
      // Check if time in exists
      if (!existingTimeIn) {
        setValidationError('Cannot record time out: No time in record found for today.');
        return;
      }

      // Check if time out already exists
      if (attendanceRecord && attendanceRecord.timeOut) {
        setValidationError('Time out already recorded for today. Cannot record duplicate time out.');
        return;
      }

      // Validate 10-minute rule
      const validation = validateTimeOut(existingTimeIn, proposedTime);
      if (!validation.valid) {
        setValidationError(validation.error);
        return;
      }

      // Time out allowed: 6:00 AM - 7:00 PM (360 to 1140 minutes)
      if (totalMinutes < 360 || totalMinutes >= 1140) {
        setValidationError('Manual time out only allowed between 6:00 AM - 7:00 PM (Philippine Time)');
        return;
      }
    }

    setValidationError('');
    onConfirm(currentTime24);
  };

  const formatTimeForDisplay = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
  };

  const calculateTimeDifference = () => {
    if (!existingTimeIn || !currentTime24) return null;

    const timeInDate = new Date(existingTimeIn);
    const timeOutDate = new Date(`${selectedDate}T${currentTime24}:00`);
    const difference = (timeOutDate - timeInDate) / (1000 * 60); // minutes

    return difference;
  };

  const getSourceBadge = (source) => {
    const sourceConfig = {
      'rfid': { color: 'bg-green-100 text-green-800', text: 'RFID' },
      'manual': { color: 'bg-blue-100 text-blue-800', text: 'Manual' },
      'unknown': { color: 'bg-gray-100 text-gray-800', text: 'System' }
    };
    
    const config = sourceConfig[source] || sourceConfig.unknown;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (!isOpen) return null;

  const timeDifference = calculateTimeDifference();
  const isTimeOutValid = timeDifference !== null && timeDifference >= 10;
  const hasExistingTimeOut = attendanceRecord && attendanceRecord.timeOut;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-[#400504]">
            Manual {action === 'timein' ? 'Time In' : 'Time Out'} - {employee?.firstName} {employee?.lastName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>
        
        {/* Real-time Philippine Time Display */}
        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">Current Philippine Time:</span>
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">LIVE</span>
            </div>
          </div>
          <div className="text-center">
            <span className="text-3xl font-bold text-[#400504] tracking-wider">
              {currentTime}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            Time updates automatically every second
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm cursor-not-allowed"
            disabled
          />
        </div>
        
        {/* Time Information Section */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time (Automatic - Cannot be changed)
          </label>
          <div className="w-full px-3 py-2 border-2 border-gray-300 rounded-md bg-gray-50 text-sm font-semibold text-gray-600 cursor-not-allowed text-center">
            {currentTime || '--:--'}
          </div>
          <div className="flex items-center mt-2 justify-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
            <p className="text-xs text-blue-600 font-medium">
              System will record the exact current time when you click "Record"
            </p>
          </div>
        </div>

        {/* Existing Record Information */}
        <div className="mb-4">
          {loading ? (
            <div className="text-center py-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#400504] mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Checking attendance records...</p>
            </div>
          ) : (
            <>
              {/* Time In Information */}
              {existingTimeIn && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200 mb-3">
                  <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center justify-between">
                    <span>Existing Time In Record</span>
                    {getSourceBadge(timeInSource)}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-green-700">Time In:</span>
                      <div className="font-semibold text-green-800">{formatTimeForDisplay(existingTimeIn)}</div>
                    </div>
                    <div>
                      <span className="text-green-700">Date:</span>
                      <div className="font-semibold text-green-800">
                        {new Date(selectedDate).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* 10-Minute Rule Information for Time Out */}
                  {action === 'timeout' && minTimeOut && (
                    <div className="mt-3 p-2 bg-white rounded border border-green-300">
                      <div className="text-xs text-green-700">
                        <div className="font-semibold">10-Minute Rule:</div>
                        <div>Earliest time out: <span className="font-semibold">{formatTimeForDisplay(minTimeOut)}</span></div>
                        {timeDifference !== null && (
                          <div className={`mt-1 ${isTimeOutValid ? 'text-green-600' : 'text-red-600'}`}>
                            Current difference: <span className="font-semibold">{formatDuration(Math.max(0, timeDifference))}</span>
                            {!isTimeOutValid && timeDifference > 0 && (
                              <span> (need {formatDuration(Math.ceil(10 - timeDifference))} more)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Time Out Information */}
              {hasExistingTimeOut && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center justify-between">
                    <span>Existing Time Out Record</span>
                    {getSourceBadge(attendanceRecord.timeOutSource)}
                  </h4>
                  <div className="text-sm">
                    <span className="text-blue-700">Time Out:</span>
                    <div className="font-semibold text-blue-800">{formatTimeForDisplay(attendanceRecord.timeOut)}</div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2 text-center">
                    Attendance already completed for today
                  </p>
                </div>
              )}

              {/* No Record Found */}
              {!existingTimeIn && action === 'timeout' && !loading && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-700 text-center">
                    No time in record found for today. Please record time in first.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Time restriction messages */}
        <div className="mb-4">
          {action === 'timein' && (
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-blue-700 font-semibold mb-1">⏰ Time In Restrictions:</p>
              <p className="text-xs text-blue-600">
                • Allowed: 6:00 AM - 5:00 PM (Philippine Time)
              </p>
              <p className="text-xs text-blue-600">
                • Cannot record if time in already exists
              </p>
            </div>
          )}
          {action === 'timeout' && (
            <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
              <p className="text-xs text-yellow-700 font-semibold mb-1">⏰ Time Out Restrictions:</p>
              <p className="text-xs text-yellow-600 mb-1">
                • Allowed: 6:00 AM - 7:00 PM (Philippine Time)
              </p>
              <p className="text-xs text-yellow-600">
                • Minimum: At least 10 minutes after time in
              </p>
              <p className="text-xs text-yellow-600">
                • Cannot record if time out already exists
              </p>
            </div>
          )}
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="mb-4 p-3 bg-red-50 rounded border border-red-200">
            <p className="text-sm text-red-700 text-center font-medium">
              {validationError}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || 
              (action === 'timein' && existingTimeIn) || 
              (action === 'timeout' && (!existingTimeIn || hasExistingTimeOut || !isTimeOutValid))}
            className={`px-4 py-2 text-white rounded-md text-sm ${
              loading || 
              (action === 'timein' && existingTimeIn) || 
              (action === 'timeout' && (!existingTimeIn || hasExistingTimeOut || !isTimeOutValid))
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#400504] hover:bg-[#300303]'
            }`}
          >
            {loading ? 'Checking...' : `Record ${action === 'timein' ? 'Time In' : 'Time Out'}`}
          </button>
        </div>

        {/* Recording info */}
        <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
          <p className="text-xs text-green-700 text-center">
            ✓ System will record: <strong className="text-green-800">{currentTime}</strong> when you click "Record"
          </p>
          {action === 'timeout' && timeDifference !== null && isTimeOutValid && (
            <p className="text-xs text-green-700 text-center mt-1">
              ✓ Time difference: <strong className="text-green-800">{formatDuration(timeDifference)}</strong> (meets 10-minute requirement)
            </p>
          )}
          <p className="text-xs text-green-600 text-center mt-1">
            ✓ Compatible with RFID and Manual records
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManualAttendanceModal;
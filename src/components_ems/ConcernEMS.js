import React, { useState } from 'react';
import { FaExclamationTriangle, FaClock, FaEnvelope, FaCheckCircle } from 'react-icons/fa';

const ConcernEMS = () => {
  const [activeTab, setActiveTab] = useState('resolve');
  const [selectedConcern, setSelectedConcern] = useState(null);
  const [resolutionForm, setResolutionForm] = useState({
    resolution: '',
    status: 'In Progress'
  });

  const sampleConcerns = [
    {
      id: 1,
      title: 'RFID Scanner Not Working',
      category: 'Technical',
      priority: 'High',
      status: 'Open',
      date: '2024-01-15',
      description: 'RFID scanner in the main entrance is not reading cards properly.',
      reportedBy: 'John Doe',
      contact: 'john.doe@brightonschool.edu.ph'
    },
    {
      id: 2,
      title: 'Attendance Data Sync Issue',
      category: 'Technical',
      priority: 'Medium',
      status: 'In Progress',
      date: '2024-01-14',
      description: 'Some attendance records are not syncing with the database.',
      reportedBy: 'Jane Smith',
      contact: 'jane.smith@brightonschool.edu.ph'
    },
    {
      id: 3,
      title: 'Employee Profile Update',
      category: 'Administrative',
      priority: 'Low',
      status: 'Resolved',
      date: '2024-01-10',
      description: 'Need to update department information for employee ACAT12345.',
      reportedBy: 'Mike Johnson',
      contact: 'mike.johnson@brightonschool.edu.ph',
      resolution: 'Updated department information in the system. Employee notified.',
      resolvedBy: 'Support Team',
      resolvedDate: '2024-01-12'
    }
  ];

  const handleResolveConcern = (e) => {
    e.preventDefault();
    if (!selectedConcern) return;
    
    alert(`Concern #${selectedConcern.id} has been ${resolutionForm.status === 'Resolved' ? 'resolved' : 'updated'} successfully!`);
    
    setResolutionForm({
      resolution: '',
      status: 'In Progress'
    });
    setSelectedConcern(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'bg-red-100 text-red-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const openConcernDetails = (concern) => {
    setSelectedConcern(concern);
    setResolutionForm({
      resolution: concern.resolution || '',
      status: concern.status
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#400504]">Support Dashboard</h1>
        <p className="text-gray-600">Manage and resolve system concerns</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('resolve')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'resolve'
                ? 'bg-white text-[#400504] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FaCheckCircle className="inline mr-2" />
            Resolve Concerns
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'track'
                ? 'bg-white text-[#400504] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FaClock className="inline mr-2" />
            All Concerns
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'contact'
                ? 'bg-white text-[#400504] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FaEnvelope className="inline mr-2" />
            Support Resources
          </button>
        </div>
      </div>

      {/* Resolve Concerns Tab */}
      {activeTab === 'resolve' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Concerns List */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-[#400504]">Pending Concerns</h2>
              <p className="text-sm text-gray-600">Select a concern to resolve</p>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {sampleConcerns.filter(concern => concern.status !== 'Resolved').map((concern) => (
                <div 
                  key={concern.id} 
                  className={`border border-gray-200 rounded-lg p-4 mb-3 cursor-pointer transition-colors ${
                    selectedConcern?.id === concern.id ? 'border-[#400504] bg-[#400504]/5' : 'hover:border-gray-300'
                  }`}
                  onClick={() => openConcernDetails(concern)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{concern.title}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(concern.status)}`}>
                        {concern.status}
                      </span>
                      <span className={`text-sm font-medium ${getPriorityColor(concern.priority)}`}>
                        {concern.priority}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                    <span>Category: {concern.category}</span>
                    <span>Date: {concern.date}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{concern.description}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    Reported by: {concern.reportedBy}
                  </div>
                </div>
              ))}
              {sampleConcerns.filter(concern => concern.status !== 'Resolved').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FaCheckCircle className="inline text-3xl text-green-500 mb-2" />
                  <p>No pending concerns to resolve</p>
                </div>
              )}
            </div>
          </div>

          {/* Resolution Form */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-[#400504] mb-4">
              {selectedConcern ? `Resolve Concern #${selectedConcern.id}` : 'Select a Concern'}
            </h2>
            
            {selectedConcern ? (
              <form onSubmit={handleResolveConcern} className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Concern Details</h3>
                  <p className="text-sm text-gray-700 mb-2">{selectedConcern.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>Reported by:</strong> {selectedConcern.reportedBy}
                    </div>
                    <div>
                      <strong>Contact:</strong> {selectedConcern.contact}
                    </div>
                    <div>
                      <strong>Category:</strong> {selectedConcern.category}
                    </div>
                    <div>
                      <strong>Priority:</strong> {selectedConcern.priority}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={resolutionForm.status}
                    onChange={(e) => setResolutionForm({ ...resolutionForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#cba235]"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resolution Details
                  </label>
                  <textarea
                    required={resolutionForm.status === 'Resolved'}
                    value={resolutionForm.resolution}
                    onChange={(e) => setResolutionForm({ ...resolutionForm, resolution: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#cba235]"
                    placeholder="Describe the solution or actions taken..."
                    rows="5"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#400504] text-white rounded-md hover:bg-[#300303] transition-colors"
                  >
                    Update Concern
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedConcern(null)}
                    className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FaExclamationTriangle className="inline text-3xl mb-2" />
                <p>Please select a concern from the list to resolve</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Concerns Tab */}
      {activeTab === 'track' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-[#400504]">All Concerns</h2>
          </div>
          <div className="p-6">
            {sampleConcerns.map((concern) => (
              <div key={concern.id} className="border-b border-gray-200 last:border-0 py-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{concern.title}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(concern.status)}`}>
                      {concern.status}
                    </span>
                    <span className={`text-sm font-medium ${getPriorityColor(concern.priority)}`}>
                      {concern.priority}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                  <span>Category: {concern.category} • Reported by: {concern.reportedBy}</span>
                  <span>Date: {concern.date}</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{concern.description}</p>
                {concern.resolution && (
                  <div className="bg-green-50 p-3 rounded-lg mt-2">
                    <strong className="text-green-800">Resolution:</strong>
                    <p className="text-green-700 text-sm mt-1">{concern.resolution}</p>
                    <div className="text-xs text-green-600 mt-1">
                      Resolved by: {concern.resolvedBy} on {concern.resolvedDate}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Support Resources Tab */}
      {activeTab === 'contact' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-[#400504] mb-4">Support Resources</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Support Team</h3>
              <p className="text-gray-600">
                <strong>IT Support Lead:</strong> Mark Wilson (mark.wilson@brightonschool.edu.ph)
              </p>
              <p className="text-gray-600">
                <strong>Technical Support:</strong> Sarah Chen (sarah.chen@brightonschool.edu.ph)
              </p>
              <p className="text-gray-600">
                <strong>Administrative Support:</strong> Robert Brown (robert.brown@brightonschool.edu.ph)
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Quick Resolution Guide</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li><strong>RFID Scanner Issues:</strong> Check power, network connection, and device drivers</li>
                <li><strong>Data Sync Problems:</strong> Verify database connection and check server logs</li>
                <li><strong>Employee Profile Errors:</strong> Confirm user permissions and data validation</li>
                <li><strong>System Performance:</strong> Clear cache and check server resources</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Escalation Process</h3>
              <p className="text-gray-600">For urgent issues that require immediate attention:</p>
              <ol className="list-decimal list-inside text-gray-600 space-y-1 mt-2">
                <li>Attempt basic troubleshooting</li>
                <li>Contact the relevant support team member</li>
                <li>If no response within 30 minutes, escalate to IT Support Lead</li>
                <li>For critical system outages, use emergency contact</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConcernEMS;
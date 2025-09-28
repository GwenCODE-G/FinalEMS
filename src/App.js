import React, { useState, useEffect } from 'react';
import EMSDashboard from './pages/EMSDashboard';

function App() {
  const [initialTab, setInitialTab] = useState('Overview');
  const [initialEmployeeView, setInitialEmployeeView] = useState('list');

  // Load saved state on component mount
  useEffect(() => {
    const savedTab = localStorage.getItem('ems-active-tab');
    const savedEmployeeView = localStorage.getItem('ems-employee-view');
    
    if (savedTab) {
      setInitialTab(savedTab);
    }
    if (savedEmployeeView) {
      setInitialEmployeeView(savedEmployeeView);
    }
  }, []);

  // Save state when tab changes
  const handleTabChange = (tab) => {
    localStorage.setItem('ems-active-tab', tab);
    setInitialTab(tab);
  };

  const handleEmployeeViewChange = (view) => {
    localStorage.setItem('ems-employee-view', view);
    setInitialEmployeeView(view);
  };

  return (
    <EMSDashboard 
      initialTab={initialTab} 
      initialEmployeeView={initialEmployeeView}
      onTabChange={handleTabChange}
      onEmployeeViewChange={handleEmployeeViewChange}
    />
  );
}

export default App;
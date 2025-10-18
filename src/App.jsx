import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FinancialAIAssistant from './FinancialAIAssistant';
import TestingDashboard from './TestingDashboard';
import { User } from 'lucide-react';
import './index.css';

// Navigation Component
const Navigation = ({ userName, onSwitchUser }) => {
  return (
    <nav className="light-bg-secondary backdrop-blur-sm border-b light-border fixed top-0 left-0 right-0 z-[60] main-shadow">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <img
                src="/logo.png"
                alt="Financial AI Assistant Logo"
                className="h-14 w-auto object-contain"
              />
              <span className="text-xl font-bold text-gradient">Financial AI Assistant</span>
            </div>
          </div>

          {/* User controls moved to header */}
          {userName && (
            <div className="flex items-center space-x-3">
              <button
                onClick={onSwitchUser}
                className="btn-secondary text-sm"
              >
                Switch User
              </button>
              <div className="flex items-center space-x-2 light-bg-primary px-3 py-1.5 rounded-lg light-border border">
                <User className="w-4 h-4" style={{color: '#e48415'}} />
                <span className="text-sm light-text-primary font-medium">{userName}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

// Main App Component
function App() {
  const [userName, setUserName] = React.useState('');
  const [isUserNameSet, setIsUserNameSet] = React.useState(false);

  // Check for saved username on component mount
  React.useEffect(() => {
    const savedUserName = localStorage.getItem('financial_ai_username');
    if (savedUserName) {
      setUserName(savedUserName);
      setIsUserNameSet(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('financial_ai_username');
    setUserName('');
    setIsUserNameSet(false);
  };

  const handleSwitchUser = () => {
    handleLogout();
  };

  return (
    <Router>
      <div className="min-h-screen light-bg-primary pt-16">
      

        <Routes>
          <Route path="/" element={
            <FinancialAIAssistant
              userName={userName}
              setUserName={setUserName}
              isUserNameSet={isUserNameSet}
              setIsUserNameSet={setIsUserNameSet}
            />
          } />
          <Route path="/testing" element={<TestingDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
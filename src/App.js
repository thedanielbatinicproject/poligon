import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('VIEW'); // 'VIEW' or 'EDIT'

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.authenticated) {
        setUser(data.user);
        setMode('EDIT'); // Authenticated users start in EDIT mode
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setMode('EDIT');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      setMode('VIEW');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleMode = () => {
    setMode(prevMode => prevMode === 'VIEW' ? 'EDIT' : 'VIEW');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="App">
      <Header 
        user={user} 
        mode={mode} 
        onToggleMode={toggleMode}
        onLogout={handleLogout}
      />
      <main className="main-content">
        {!user ? (
          <LoginPage onLogin={handleLogin} />
        ) : (
          <Dashboard user={user} mode={mode} />
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;
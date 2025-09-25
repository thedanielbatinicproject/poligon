import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import DocumentPage from './pages/DocumentPage';
import LoginPage from './pages/LoginPage';
import Header from './components/Header';
import Footer from './components/Footer';
import { authAPI } from './utils/api';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('documents');
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Funkcija za provjeru auth statusa - koristi cookies
  const checkAuthStatus = async () => {
    const result = await authAPI.status();
    
    if (result.success && (result.data.isAuthenticated || result.data.authenticated)) {
      setIsAuthenticated(true);
      setUser(result.data.user);
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    
    setLoading(false);
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    setCurrentPage('documents');
  };

  const handleLogout = async () => {
    await authAPI.logout();
    
    setUser(null);
    setIsAuthenticated(false);
    setCurrentPage('documents');
  };

  // Loading state
  if (loading) {
    return (
      <div className="app">
        <div className="loading">🔄 Loading...</div>
      </div>
    );
  }

  // Prikaz stranice za prijavu ako korisnik nije autentifikovan
  if (!isAuthenticated) {
    return (
      <div className="app">
        <Header 
          user={null}
          isAuthenticated={false}
          onLogout={handleLogout}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
        <LoginPage onLogin={handleLogin} />
        <Footer />
      </div>
    );
  }

  // Renderiranje stranica za autentifikovane korisnike
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'documents':
        return <DocumentPage />;
      default:
        return <DocumentPage />;
    }
  };

  return (
    <div className="app">
      <Header 
        user={user}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
      <main className="main-content">
        {renderPage()}
      </main>
      <Footer />
    </div>
  );
}

export default App;
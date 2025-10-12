import React, { useState, useEffect, Suspense, lazy } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import NotificationProvider from './components/Notification/NotificationProvider';
import { authAPI } from './utils/api';
import './App.css';


const Dashboard = lazy(() => import('./pages/Dashboard'));
const DocumentPage = lazy(() => import('./pages/DocumentPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const TasksTodos = lazy(() => import('./pages/TasksTodos'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    
    return localStorage.getItem('currentPage') || 'documents';
  });
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
    
    
    const savedDocId = localStorage.getItem('selectedDocumentId');
    const savedCurrentPage = localStorage.getItem('currentPage');
    
    
    if (savedDocId && savedCurrentPage === 'documents') {
      setCurrentPage('documents'); 
    }
  }, []);

  
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);
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

  
  if (loading) {
    return (
      <NotificationProvider>
        <div className="app">
          <div className="loading">🔄 Loading...</div>
        </div>
      </NotificationProvider>
    );
  }
  if (!isAuthenticated && currentPage === 'login') {
    return (
      <NotificationProvider>
        <div className="app">
          <Header 
            user={null}
            isAuthenticated={false}
            onLogout={handleLogout}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
          <main className="main-content">
            <Suspense fallback={<div className="loading">Učitava...</div>}>
              <LoginPage onLogin={handleLogin} />
            </Suspense>
          </main>
          <Footer />
        </div>
      </NotificationProvider>
    );
  }

  
  const renderPage = () => {
    if (currentPage === 'admin') {
      if (!isAuthenticated || !user || user.role !== 'admin') {
        setCurrentPage('documents');
        return <DocumentPage user={user} onPageChange={setCurrentPage} />;
      }
      return <AdminPanel user={user} onNavigateHome={() => setCurrentPage('documents')} />;
    }
    
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'about':
        return <About />;
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'documents':
        return <DocumentPage user={user} onPageChange={setCurrentPage} />;
      case 'tasks-todos':
        return <TasksTodos user={user} isAuthenticated={isAuthenticated} />;
      case 'login':
        return isAuthenticated ? <Dashboard user={user} /> : <LoginPage onLogin={handleLogin} />;
      default:
        return <Home />;
    }
  };

  return (
    <NotificationProvider>
      <div className="app">
        <Header 
          user={user}
          isAuthenticated={isAuthenticated}
          onLogout={handleLogout}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
        <main className="main-content">
          <Suspense fallback={<div className="loading">Učitava stranicu...</div>}>
            {renderPage()}
          </Suspense>
        </main>
        <Footer />
      </div>
    </NotificationProvider>
  );
}

export default App;
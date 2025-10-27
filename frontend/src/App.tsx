import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Documents from './pages/Documents';
import Files from './pages/Files';
import Tasks from './pages/Tasks';
import AdminPanel from './pages/AdminPanel';
import MentorPanel from './pages/MentorPanel';
import NotFound from './pages/NotFound';

import { refreshPoligonCookie } from './lib/serverAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Forbidden from './pages/Forbidden';

const App: React.FC = () => {
  useEffect(() => {
    // Renew role cookie expiration on each page load/refresh
    if (typeof window !== 'undefined') refreshPoligonCookie();
  }, []);

  return (
    <Router>
    <Header />
    <main className="min-h-screen p-4">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/files" element={<Files />} />
        <Route path="/tasks" element={<Tasks />} />
  <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPanel /></ProtectedRoute>} />
  <Route path="/mentor" element={<ProtectedRoute allowedRoles={["mentor"]}><MentorPanel /></ProtectedRoute>} />
  <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
    <Footer />
  </Router>
)};

export default App;

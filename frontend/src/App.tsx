import React from 'react';
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

const App: React.FC = () => (
  <Router>
    <Header />
    <main className="min-h-screen p-4">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/files" element={<Files />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/mentor" element={<MentorPanel />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
    <Footer />
  </Router>
);

export default App;

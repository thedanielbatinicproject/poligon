import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Documents from './pages/Documents'
import RoleRoute from './components/RoleRoute'
import Tasks from './pages/Tasks'
import Mentor from './pages/Mentor'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'

export default function App(): JSX.Element {
  return (
    <div>
      <Header />
      <main style={{ padding: 16 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<RoleRoute element={<Profile />} />} />
          <Route path="/documents" element={<RoleRoute element={<Documents />} />} />
          <Route path="/tasks" element={<RoleRoute element={<Tasks />} />} />
          <Route path="/mentor" element={<RoleRoute element={<Mentor />} allowedRoles={["mentor","admin"]} />} />
          <Route path="/admin" element={<RoleRoute element={<Admin />} allowedRoles={["admin"]} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
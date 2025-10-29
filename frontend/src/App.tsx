import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Documents from './pages/Documents'
import NotFound from './pages/NotFound'

export default function App(): JSX.Element {
  return (
    <div>
      <Header />
      <main style={{ padding: 16 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/documents" element={<Documents />} />
          {/* Add other routes as needed (tasks, mentor, admin) */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
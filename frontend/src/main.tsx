import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import { SessionProvider } from './lib/session'
import { ThemeProvider } from './lib/theme'
import NotificationsProvider from './lib/notifications'
import { SocketProvider } from './components/SocketProvider'
import ChatWidget from './components/ChatWidget'

const container = document.getElementById('root')!
const root = createRoot(container)
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <SessionProvider>
          <SocketProvider>
            <NotificationsProvider>
              <App />
              <ChatWidget />
            </NotificationsProvider>
          </SocketProvider>
        </SessionProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)

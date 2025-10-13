import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import NotificationProvider from './components/Notification/NotificationProvider';
import './styles/main.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </React.StrictMode>
);
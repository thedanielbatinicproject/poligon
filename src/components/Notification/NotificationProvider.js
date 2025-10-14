import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import './Notification.css';

const NotificationContext = createContext(null);
export const useNotification = () => useContext(NotificationContext);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications((n) => n.filter((x) => x.id !== id));
  }, []);

  const addNotification = useCallback((message, type = 'error', timeout = 5000) => {
    const id = 'n_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const note = { id, message, type };
    setNotifications((n) => [note, ...n]);

    if (timeout && timeout > 0) {
      setTimeout(() => removeNotification(id), timeout);
    }

    return id;
  }, [removeNotification]);

  useEffect(() => {
    // expose global helper for non-React callers (fetch wrapper / other scripts)
    window.showNotification = (message, type = 'error', timeout = 5000) => {
      try {
        addNotification(message, type, timeout);
      } catch (e) {
        /* noop */
      }
    };
    return () => {
      try { delete window.showNotification; } catch (e) {}
    };
  }, [addNotification]);

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification }}>
      {children}

      <div className="notification-stack" aria-live="polite" aria-atomic="true">
        {notifications.map((note, idx) => (
          <div
            key={note.id}
            className={`notification-toast ${note.type}`}
            style={{ top: 12 + idx * 68 }}
          >
            <div className="notification-content">
              <span className="notification-message">{note.message}</span>
              <button className="notification-close" onClick={() => removeNotification(note.id)}>
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export default NotificationProvider;
import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import ConfirmationBox from '../ConfirmationBox';

declare global {
  interface Window {
    __pushNotification?: (message: string, durationSec?: number | string, isError?: boolean) => string;
  }
}

interface Session {
  session_id: string;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  user_agent: string;
  ip_address: string;
  created_at: string;
  expires_at: string;
  last_activity: string;
}

interface AdminSessionManagerProps {
  onClose: () => void;
}

export default function AdminSessionManager({ onClose }: AdminSessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmLogout, setConfirmLogout] = useState<{ type: 'single' | 'user'; id: string | number; name?: string } | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [sessions, searchTerm, sortColumn, sortDirection]);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    
    document.body.style.overflow = 'hidden';
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmLogout) {
          setConfirmLogout(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, confirmLogout]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await api.getAllSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      window.__pushNotification?.('Failed to load sessions', 3, true);
    } finally {
      setLoading(false);
    }
  };

  const filterSessions = () => {
    let result = [...sessions];

    if (searchTerm.trim()) {
      const tokens = searchTerm.toLowerCase().trim().split(/\s+/);
      result = result.filter(session => {
        const searchableText = `${session.first_name} ${session.last_name} ${session.email} ${session.user_id}`.toLowerCase();
        return tokens.every(token => searchableText.includes(token));
      });
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let aVal: any = a[sortColumn as keyof Session];
        let bVal: any = b[sortColumn as keyof Session];

        // Handle null values
        if (aVal === null) aVal = '';
        if (bVal === null) bVal = '';

        // String comparison
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        // Number comparison
        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    }

    setFilteredSessions(result);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Same column: cycle through asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      // New column: start with asc
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return null;
    return (
      <span className="sort-indicator">
        {sortDirection === 'asc' ? '▲' : '▼'}
        <span className="sort-label">{sortDirection}</span>
      </span>
    );
  };

  const handleLogoutSession = async (sessionId: string) => {
    try {
      await api.deleteSession(sessionId);
      window.__pushNotification?.('Session terminated successfully', 3, false);
      loadSessions();
    } catch (err) {
      console.error('Failed to logout session:', err);
      window.__pushNotification?.('Failed to terminate session', 3, true);
    }
  };

  const handleLogoutAllUserSessions = async (userId: number) => {
    try {
      await api.deleteAllUserSessions(userId);
      window.__pushNotification?.('All user sessions terminated successfully', 3, false);
      loadSessions();
    } catch (err) {
      console.error('Failed to logout user sessions:', err);
      window.__pushNotification?.('Failed to terminate user sessions', 3, true);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('hr-HR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserSessionCount = (userId: number) => {
    return sessions.filter(s => s.user_id === userId).length;
  };

  if (loading) {
    return (
      <div className="admin-modal-overlay">
        <div className="admin-modal">
          <div className="admin-modal-header">
            <h2>Session Management</h2>
            <button onClick={onClose} className="close-btn">×</button>
          </div>
          <div className="admin-modal-body">
            <div className="loading-state">Loading sessions...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="admin-modal-overlay">
        <div className="admin-modal admin-modal-large">
          <div className="admin-modal-header">
            <h2>Session Management</h2>
            <button onClick={onClose} className="close-btn">×</button>
          </div>
          <div className="admin-modal-body">
            <div className="search-filter-container">
              <input
                type="text"
                placeholder="Search by user name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <div className="filter-info">
                Showing {filteredSessions.length} of {sessions.length} sessions
              </div>
            </div>

            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('session_id')} className="sortable-header">
                      Session ID {getSortIcon('session_id')}
                    </th>
                    <th onClick={() => handleSort('first_name')} className="sortable-header">
                      User {getSortIcon('first_name')}
                    </th>
                    <th onClick={() => handleSort('email')} className="sortable-header">
                      Email {getSortIcon('email')}
                    </th>
                    <th onClick={() => handleSort('ip_address')} className="sortable-header">
                      IP Address {getSortIcon('ip_address')}
                    </th>
                    <th onClick={() => handleSort('user_agent')} className="sortable-header">
                      User Agent {getSortIcon('user_agent')}
                    </th>
                    <th onClick={() => handleSort('created_at')} className="sortable-header">
                      Created {getSortIcon('created_at')}
                    </th>
                    <th onClick={() => handleSort('last_activity')} className="sortable-header">
                      Last Activity {getSortIcon('last_activity')}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map(session => (
                    <tr key={session.session_id}>
                      <td className="session-id-cell" title={session.session_id}>{session.session_id}</td>
                      <td>{session.first_name} {session.last_name}</td>
                      <td className="email-cell">{session.email}</td>
                      <td>{session.ip_address || '-'}</td>
                      <td className="user-agent-cell">{session.user_agent || '-'}</td>
                      <td className="date-cell">{formatDate(session.created_at)}</td>
                      <td className="date-cell">{formatDate(session.last_activity)}</td>
                      <td className="session-actions">
                        <button
                          onClick={() => setConfirmLogout({ type: 'single', id: session.session_id })}
                          className="session-action-btn danger"
                          title="Force logout this session"
                        >
                          Logout
                        </button>
                        {getUserSessionCount(session.user_id) > 1 && (
                          <button
                            onClick={() => setConfirmLogout({ 
                              type: 'user', 
                              id: session.user_id, 
                              name: `${session.first_name} ${session.last_name}` 
                            })}
                            className="session-action-btn warning"
                            title="Force logout all sessions for this user"
                          >
                            Logout All
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredSessions.length === 0 && (
              <div className="empty-state">No active sessions found</div>
            )}
          </div>
        </div>
      </div>

      {confirmLogout && (
        <ConfirmationBox
          title="Force Logout Confirmation"
          question={
            confirmLogout.type === 'single'
              ? 'Are you sure you want to terminate this session? The user will be logged out immediately.'
              : `Are you sure you want to terminate all ${getUserSessionCount(confirmLogout.id as number)} sessions for ${confirmLogout.name}? The user will be logged out from all devices.`
          }
          isOpen={true}
          onConfirm={() => {
            if (confirmLogout.type === 'single') {
              handleLogoutSession(confirmLogout.id as string);
            } else {
              handleLogoutAllUserSessions(confirmLogout.id as number);
            }
            setConfirmLogout(null);
          }}
          onCancel={() => setConfirmLogout(null)}
        />
      )}
    </>
  );
}

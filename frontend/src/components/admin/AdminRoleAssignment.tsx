import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import ConfirmationBox from '../ConfirmationBox';

declare global {
  interface Window {
    __pushNotification?: (message: string, durationSec?: number | string, isError?: boolean) => string;
  }
}

interface User {
  user_id: number;
  principal_name: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'user' | 'student' | 'mentor' | 'admin';
  preferred_language: 'hr' | 'en';
  affiliation: string | null;
}

interface AdminRoleAssignmentProps {
  onClose: () => void;
}

export default function AdminRoleAssignment({ onClose }: AdminRoleAssignmentProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [newRole, setNewRole] = useState<'user' | 'student' | 'mentor' | 'admin'>('student');
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const terms = query.trim().toLowerCase().split(/\s+/);
    const scored = allUsers.map(u => {
      const searchableText = `${u.first_name} ${u.last_name} ${u.email} ${u.principal_name} ${u.affiliation || ''}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (searchableText.includes(term)) score++;
      }
      return { u, score };
    }).filter(s => s.score > 0);

    scored.sort((a, b) => b.score - a.score);
    setResults(scored.map(s => s.u));
  }, [query, allUsers]);

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
        if (showConfirmation) {
          setShowConfirmation(false);
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
  }, [onClose, showConfirmation]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getAllUsers();
      // Exclude admin users
      const nonAdminUsers = data.filter((u: User) => u.role !== 'admin');
      setAllUsers(nonAdminUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = (userId: number) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleBulkRoleUpdate = async () => {
    if (selectedUsers.size === 0) {
      window.__pushNotification?.('Please select at least one user', 3, true);
      return;
    }

    try {
      await api.bulkUpdateRoles({ user_ids: Array.from(selectedUsers), new_role: newRole });
      window.__pushNotification?.(`Successfully updated ${selectedUsers.size} user(s) to role: ${newRole}`, 3, false);
      setSelectedUsers(new Set());
      setQuery('');
      loadUsers();
      onClose();
    } catch (err) {
      console.error('Failed to update roles:', err);
      window.__pushNotification?.('Failed to update user roles', 3, true);
    } finally {
      setShowConfirmation(false);
    }
  };

  const getSelectedUsersList = () => {
    return Array.from(selectedUsers)
      .map(id => allUsers.find(u => u.user_id === id))
      .filter((u): u is User => !!u)
      .map(u => `${u.first_name} ${u.last_name} (${u.email})`)
      .join('\n');
  };

  return (
    <>
      <div className="admin-modal-overlay">
        <div className="admin-modal admin-modal-large">
          <div className="admin-modal-header">
            <h2>Bulk Role Assignment</h2>
            <button onClick={onClose} className="close-btn">×</button>
          </div>
          <div className="admin-modal-body">
            <div className="role-assignment-controls">
              <div className="search-filter-container">
                <input
                  type="text"
                  placeholder="Search by name, email, principal name..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="search-input"
                  autoFocus
                />
                <div className="filter-info">
                  {selectedUsers.size > 0 && `${selectedUsers.size} user(s) selected`}
                </div>
              </div>

              <div className="role-selection-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>New Role to Assign</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'user' | 'student' | 'mentor' | 'admin')}
                    className="role-select"
                  >
                    <option value="user">User</option>
                    <option value="student">Student</option>
                    <option value="mentor">Mentor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowConfirmation(true)}
                  className="form-btn form-btn-primary"
                  disabled={selectedUsers.size === 0}
                  style={{ alignSelf: 'flex-end' }}
                >
                  Assign Role to {selectedUsers.size} User(s)
                </button>
              </div>
            </div>

            <div className="user-finder-results">
              {loading && <div className="loading-state">Loading users...</div>}
              
              {!loading && query.trim() === '' && (
                <div className="empty-state">
                  Type a name or email to search for users, then select them with checkboxes
                </div>
              )}

              {!loading && query.trim() !== '' && results.length === 0 && (
                <div className="empty-state">No users found matching your search</div>
              )}

              {!loading && results.length > 0 && (
                <div className="users-table-container">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>Select</th>
                        <th>ID</th>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Email</th>
                        <th>Current Role</th>
                        <th>Affiliation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(user => (
                        <tr 
                          key={user.user_id}
                          className={selectedUsers.has(user.user_id) ? 'selected-row' : ''}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(user.user_id)}
                              onChange={() => handleToggleUser(user.user_id)}
                              className="user-checkbox"
                            />
                          </td>
                          <td>{user.user_id}</td>
                          <td>{user.first_name}</td>
                          <td>{user.last_name}</td>
                          <td className="email-cell">{user.email}</td>
                          <td>
                            <span className={`role-badge role-${user.role}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="affiliation-cell">{user.affiliation || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showConfirmation && (
        <ConfirmationBox
          title="Confirm Bulk Role Assignment"
          question={`Do you really want to change role to "${newRole}" for all these users?\n\n${getSelectedUsersList()}`}
          isOpen={true}
          onConfirm={handleBulkRoleUpdate}
          onCancel={() => setShowConfirmation(false)}
        />
      )}
    </>
  );
}

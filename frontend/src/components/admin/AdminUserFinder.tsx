import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface User {
  user_id: number;
  principal_name: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'user' | 'student' | 'mentor' | 'admin';
  preferred_language: 'hr' | 'en';
  affiliation: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminUserFinderProps {
  onClose: () => void;
  onEditUser: (user: User) => void;
}

export default function AdminUserFinder({ onClose, onEditUser }: AdminUserFinderProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

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
      const searchableText = `${u.first_name} ${u.last_name} ${u.email} ${u.principal_name} ${u.affiliation || ''} ${u.display_name || ''}`.toLowerCase();
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
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getAllUsers();
      // Exclude admin users (admin cannot edit other admins)
      const nonAdminUsers = data.filter((u: User) => u.role !== 'admin');
      setAllUsers(nonAdminUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    onEditUser(user);
    onClose();
  };

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal admin-modal-large">
        <div className="admin-modal-header">
          <h2>Find User to Edit</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="admin-modal-body">
          <div className="search-filter-container">
            <input
              type="text"
              placeholder="Search by name, email, principal name, OID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
              autoFocus
            />
            <div className="filter-info">
              {results.length > 0 && `${results.length} users found`}
            </div>
          </div>

          <div className="user-finder-results">
            {loading && <div className="loading-state">Loading users...</div>}
            
            {!loading && query.trim() === '' && (
              <div className="empty-state">
                Type a name, email, or principal name to search for users
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
                      <th>ID</th>
                      <th>First Name</th>
                      <th>Last Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Affiliation</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(user => (
                      <tr key={user.user_id}>
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
                        <td>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="edit-user-btn"
                          >
                            Edit User
                          </button>
                        </td>
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
  );
}

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

interface AdminUserBrowserProps {
  onClose: () => void;
}

export default function AdminUserBrowser({ onClose }: AdminUserBrowserProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('no filter');
  const [languageFilter, setLanguageFilter] = useState<string>('no filter');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, languageFilter, sortColumn, sortDirection]);

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
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let result = [...users];

    // Role filter
    if (roleFilter !== 'no filter') {
      result = result.filter(u => u.role === roleFilter);
    }

    // Language filter
    if (languageFilter !== 'no filter') {
      result = result.filter(u => u.preferred_language === languageFilter);
    }

    // Search filter (multi-token)
    if (searchTerm.trim()) {
      const tokens = searchTerm.toLowerCase().trim().split(/\s+/);
      result = result.filter(user => {
        const searchableText = `${user.first_name} ${user.last_name} ${user.email} ${user.principal_name} ${user.affiliation || ''} ${user.display_name || ''}`.toLowerCase();
        return tokens.every(token => searchableText.includes(token));
      });

      // Sort by match count (users with more matches first)
      result.sort((a, b) => {
        const aText = `${a.first_name} ${a.last_name} ${a.email} ${a.principal_name} ${a.affiliation || ''} ${a.display_name || ''}`.toLowerCase();
        const bText = `${b.first_name} ${b.last_name} ${b.email} ${b.principal_name} ${b.affiliation || ''} ${b.display_name || ''}`.toLowerCase();
        
        const aMatches = tokens.filter(token => aText.includes(token)).length;
        const bMatches = tokens.filter(token => bText.includes(token)).length;
        
        return bMatches - aMatches;
      });
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let aVal: any = a[sortColumn as keyof User];
        let bVal: any = b[sortColumn as keyof User];

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

    setFilteredUsers(result);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('hr-HR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="admin-modal-overlay">
        <div className="admin-modal">
          <div className="admin-modal-header">
            <h2>Browse All Users</h2>
            <button onClick={onClose} className="close-btn">×</button>
          </div>
          <div className="admin-modal-body">
            <div className="loading-state">Loading users...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal admin-modal-large">
        <div className="admin-modal-header">
          <h2>Browse All Users</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="admin-modal-body">
          <div className="search-filter-container">
            <input
              type="text"
              placeholder="Search by name, email, principal name, affiliation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="filter-info">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          </div>

          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('user_id')} className="sortable-header">
                    ID {getSortIcon('user_id')}
                  </th>
                  <th onClick={() => handleSort('first_name')} className="sortable-header">
                    First Name {getSortIcon('first_name')}
                  </th>
                  <th onClick={() => handleSort('last_name')} className="sortable-header">
                    Last Name {getSortIcon('last_name')}
                  </th>
                  <th onClick={() => handleSort('email')} className="sortable-header">
                    Email {getSortIcon('email')}
                  </th>
                  <th>
                    Role
                    <select 
                      value={roleFilter} 
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="column-filter"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="no filter">no filter</option>
                      <option value="user">user</option>
                      <option value="student">student</option>
                      <option value="mentor">mentor</option>
                      <option value="admin">admin</option>
                    </select>
                  </th>
                  <th>
                    Language
                    <select 
                      value={languageFilter} 
                      onChange={(e) => setLanguageFilter(e.target.value)}
                      className="column-filter"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="no filter">no filter</option>
                      <option value="hr">hr</option>
                      <option value="en">en</option>
                    </select>
                  </th>
                  <th onClick={() => handleSort('affiliation')} className="sortable-header">
                    Affiliation {getSortIcon('affiliation')}
                  </th>
                  <th onClick={() => handleSort('created_at')} className="sortable-header">
                    Created At {getSortIcon('created_at')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
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
                    <td>{user.preferred_language.toUpperCase()}</td>
                    <td className="affiliation-cell">{user.affiliation || '-'}</td>
                    <td className="date-cell">{formatDate(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

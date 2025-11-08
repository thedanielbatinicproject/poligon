import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import AdminUserBrowser from '../components/admin/AdminUserBrowser';
import AdminUserFinder from '../components/admin/AdminUserFinder';
import AdminEditCreateUser from '../components/admin/AdminEditCreateUser';
import AdminRoleAssignment from '../components/admin/AdminRoleAssignment';
import AdminSessionManager from '../components/admin/AdminSessionManager';
import AdminDocumentBrowser from '../components/admin/AdminDocumentBrowser';
import AdminDocumentTypes from '../components/admin/AdminDocumentTypes';
import AdminDocumentEditors from '../components/admin/AdminDocumentEditors';
import AdminFileManager from '../components/admin/AdminFileManager';
import AdminDocumentVersions from '../components/admin/AdminDocumentVersions';
import '../styles.css';
import './admin.css';

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

interface SystemStats {
  totalRenders: number;
  databaseSize: number;
  folderSize: number;
  activeSessions: number;
}

interface RenderServiceStatus {
  isOnline: boolean;
  url: string;
  checking: boolean;
}

const COLLAPSED_CARDS_KEY = 'admin_collapsed_cards';

// Helper functions for localStorage with 5+ year expiry
const getCollapsedCards = (): Set<string> => {
  try {
    const stored = localStorage.getItem(COLLAPSED_CARDS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Set(parsed.cards || []);
    }
  } catch (err) {
    console.error('Failed to read collapsed cards from localStorage:', err);
  }
  return new Set();
};

const saveCollapsedCards = (collapsedCards: Set<string>) => {
  try {
    localStorage.setItem(COLLAPSED_CARDS_KEY, JSON.stringify({
      cards: Array.from(collapsedCards),
      timestamp: Date.now(),
    }));
  } catch (err) {
    console.error('Failed to save collapsed cards to localStorage:', err);
  }
};

export default function Admin() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(() => getCollapsedCards());
  const [renderService, setRenderService] = useState<RenderServiceStatus>({
    isOnline: false,
    url: import.meta.env.VITE_EXTERNAL_RENDERER_URL || '',
    checking: true,
  });
  const [showUserBrowser, setShowUserBrowser] = useState(false);
  const [showUserFinder, setShowUserFinder] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [showRoleAssignment, setShowRoleAssignment] = useState(false);
  const [showSessionManager, setShowSessionManager] = useState(false);
  
  // Document Management modals
  const [showDocumentBrowser, setShowDocumentBrowser] = useState(false);
  const [showDocumentTypes, setShowDocumentTypes] = useState(false);
  const [showDocumentEditors, setShowDocumentEditors] = useState(false);
  const [showFileManager, setShowFileManager] = useState(false);
  const [showDocumentVersions, setShowDocumentVersions] = useState(false);

  useEffect(() => {
    loadStatistics();
    checkRenderService();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [renders, storage, sessions] = await Promise.all([
        api.getTotalRenders(),
        api.getStorageStats(),
        api.getActiveSessionsCount(),
      ]);

      setStats({
        totalRenders: renders.total_renders || 0,
        databaseSize: Number(storage.database_size) || 0,
        folderSize: Number(storage.folder_size) || 0,
        activeSessions: sessions.active_sessions || 0,
      });
    } catch (err: any) {
      console.error('Failed to load admin statistics:', err);
      setError(err.body?.error || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const checkRenderService = async () => {
    try {
      setRenderService(prev => ({ ...prev, checking: true }));
      
      const status = await api.getRenderServiceStatus();
      
      setRenderService({
        isOnline: status.isOnline || false,
        url: status.url || '',
        checking: false,
      });
    } catch (err) {
      console.warn('Render service check failed:', err);
      setRenderService({
        isOnline: false,
        url: '',
        checking: false,
      });
    }
  };

  const formatBytes = (bytes: number, type: 'database' | 'disk' = 'database'): string => {
    if (!bytes || isNaN(bytes) || bytes === 0) {
      return type === 'disk' ? 'no data saved on disk' : 'no db records';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('hr-HR').format(num);
  };

  const toggleCardCollapse = (cardId: string) => {
    setCollapsedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      saveCollapsedCards(newSet);
      return newSet;
    });
  };

  const isCardCollapsed = (cardId: string): boolean => {
    return collapsedCards.has(cardId);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowEditUser(true);
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
        </div>
        <div className="admin-content">
          <div className="loading-state">Loading statistics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
        </div>
        <div className="admin-content">
          <div className="error-state">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={loadStatistics} className="refresh-btn">
          Refresh Statistics
        </button>
      </div>

      <div className="admin-content">
        <div className={`admin-card system-overview ${isCardCollapsed('system-overview') ? 'collapsed' : ''}`}>
          <div className="card-header" onClick={() => toggleCardCollapse('system-overview')}>
            <h2>System Overview</h2>
            <span className="collapse-icon">{isCardCollapsed('system-overview') ? '▼' : '▲'}</span>
          </div>
          <div className="card-body">
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">Total Renders</div>
                <div className="stat-value">{formatNumber(stats?.totalRenders || 0)}</div>
                <div className="stat-description">All document versions rendered</div>
              </div>

              <div className="stat-item">
                <div className="stat-label">Database Storage</div>
                <div className="stat-value">{formatBytes(stats?.databaseSize || 0, 'database')}</div>
                <div className="stat-description">Recorded file sizes in database</div>
              </div>

              <div className="stat-item">
                <div className="stat-label">Disk Storage</div>
                <div className="stat-value">{formatBytes(stats?.folderSize || 0, 'disk')}</div>
                <div className="stat-description">Actual files on disk</div>
              </div>

              <div className="stat-item">
                <div className="stat-label">Active Sessions</div>
                <div className="stat-value">{formatNumber(stats?.activeSessions || 0)}</div>
                <div className="stat-description">Currently logged-in users</div>
              </div>
            </div>

            <div className="render-service-section">
              <h3 className="section-title">LaTeX Online Rendering Service</h3>
              {renderService.checking ? (
                <div className="service-status checking">
                  <div className="status-badge">CHECKING...</div>
                  <div className="status-description">Verifying service availability...</div>
                </div>
              ) : renderService.isOnline ? (
                <div className="service-status online">
                  <div className="status-badge online-badge">ONLINE</div>
                  <div className="status-description">Available on {renderService.url}</div>
                </div>
              ) : (
                <div className="service-status offline">
                  <div className="status-badge offline-badge">OFFLINE</div>
                  <div className="status-description">The render function is not available for all users on this webapp.</div>
                  {renderService.url && (
                    <div className="status-url">Configured URL: {renderService.url}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`admin-card user-management ${isCardCollapsed('user-management') ? 'collapsed' : ''}`}>
          <div className="card-header" onClick={() => toggleCardCollapse('user-management')}>
            <h2>User Management</h2>
            <span className="collapse-icon">{isCardCollapsed('user-management') ? '▼' : '▲'}</span>
          </div>
          <div className="card-body">
            <div className="user-management-grid">
              <div className="management-item" onClick={() => setShowUserBrowser(true)}>
                <h3>Browse All Users</h3>
                <p>View all registered users with advanced filtering and search capabilities</p>
              </div>

              <div className="management-item" onClick={() => setShowUserFinder(true)}>
                <h3>Edit User</h3>
                <p>Search for a user and modify their account details, role, and preferences</p>
              </div>

              <div className="management-item" onClick={() => setShowCreateUser(true)}>
                <h3>Create New User</h3>
                <p>Register a new user account with automatic password generation</p>
              </div>

              <div className="management-item" onClick={() => setShowRoleAssignment(true)}>
                <h3>Bulk Role Assignment</h3>
                <p>Change roles for multiple users at once with confirmation</p>
              </div>

              <div className="management-item" onClick={() => setShowSessionManager(true)}>
                <h3>Session Management</h3>
                <p>View active sessions and force logout users from their devices</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`admin-card document-management ${isCardCollapsed('document-management') ? 'collapsed' : ''}`}>
          <div className="card-header" onClick={() => toggleCardCollapse('document-management')}>
            <h2>Document Management</h2>
            <span className="collapse-icon">{isCardCollapsed('document-management') ? '▼' : '▲'}</span>
          </div>
          <div className="card-body">
            <div className="user-management-grid">
              <div className="management-item" onClick={() => setShowDocumentBrowser(true)}>
                <h3>All Documents</h3>
                <p>Browse all documents with advanced filtering by status, type, and language</p>
              </div>

              <div className="management-item" onClick={() => setShowDocumentTypes(true)}>
                <h3>Document Types</h3>
                <p>Manage document type categories (thesis, report, seminar, etc.)</p>
              </div>

              <div className="management-item" onClick={() => setShowDocumentEditors(true)}>
                <h3>Change Document Editors</h3>
                <p>Add or remove editors, viewers, and mentors for any document</p>
              </div>

              <div className="management-item" onClick={() => setShowFileManager(true)}>
                <h3>Storage Management</h3>
                <p>View and manage uploaded files (images, PDFs, BIB, TEX) per document</p>
              </div>

              <div className="management-item" onClick={() => setShowDocumentVersions(true)}>
                <h3>Document Versions</h3>
                <p>Browse all rendered versions with download capability</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showUserBrowser && <AdminUserBrowser onClose={() => setShowUserBrowser(false)} />}
      {showUserFinder && <AdminUserFinder onClose={() => setShowUserFinder(false)} onEditUser={handleEditUser} />}
      {showCreateUser && <AdminEditCreateUser onClose={() => setShowCreateUser(false)} mode="create" />}
      {showEditUser && editingUser && (
        <AdminEditCreateUser 
          onClose={() => { setShowEditUser(false); setEditingUser(undefined); }} 
          user={editingUser}
          mode="edit" 
        />
      )}
      {showRoleAssignment && <AdminRoleAssignment onClose={() => setShowRoleAssignment(false)} />}
      {showSessionManager && <AdminSessionManager onClose={() => setShowSessionManager(false)} />}
      
      {showDocumentBrowser && <AdminDocumentBrowser onClose={() => setShowDocumentBrowser(false)} />}
      {showDocumentTypes && <AdminDocumentTypes onClose={() => setShowDocumentTypes(false)} />}
      {showDocumentEditors && <AdminDocumentEditors onClose={() => setShowDocumentEditors(false)} />}
      {showFileManager && <AdminFileManager onClose={() => setShowFileManager(false)} />}
      {showDocumentVersions && <AdminDocumentVersions onClose={() => setShowDocumentVersions(false)} />}
    </div>
  );
}


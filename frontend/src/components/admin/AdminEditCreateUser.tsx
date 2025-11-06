import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

declare global {
  interface Window {
    __pushNotification?: (message: string, durationSec?: number | string, isError?: boolean) => string;
  }
}

interface User {
  user_id?: number;
  principal_name: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'user' | 'student' | 'mentor' | 'admin';
  preferred_language: 'hr' | 'en';
  affiliation: string | null;
  display_name: string | null;
}

interface AdminEditCreateUserProps {
  onClose: () => void;
  user?: User;
  mode: 'create' | 'edit';
}

export default function AdminEditCreateUser({ onClose, user, mode }: AdminEditCreateUserProps) {
  const [formData, setFormData] = useState<User>({
    principal_name: '',
    first_name: '',
    last_name: '',
    email: '',
    role: 'user',
    preferred_language: 'hr',
    affiliation: '',
    display_name: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && user) {
      setFormData({
        user_id: user.user_id,
        principal_name: user.principal_name,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        preferred_language: user.preferred_language,
        affiliation: user.affiliation || '',
        display_name: user.display_name || '',
      });
    }
  }, [mode, user]);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.email || !formData.first_name || !formData.last_name || !formData.role) {
      window.__pushNotification?.('Please fill in all required fields', 'error');
      return;
    }

    try {
      setSubmitting(true);

      if (mode === 'create') {
        await api.createUser({
          principal_name: formData.principal_name || formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          role: formData.role,
          preferred_language: formData.preferred_language,
          affiliation: formData.affiliation || null,
          display_name: formData.display_name || null,
        });
        window.__pushNotification?.('User created successfully', 'success');
      } else if (mode === 'edit' && formData.user_id) {
        await api.updateUser(formData.user_id, {
          principal_name: formData.principal_name,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          role: formData.role,
          preferred_language: formData.preferred_language,
          affiliation: formData.affiliation || null,
          display_name: formData.display_name || null,
        });
        window.__pushNotification?.('User updated successfully', 'success');
      }

      onClose();
    } catch (err: any) {
      console.error('Failed to save user:', err);
      window.__pushNotification?.(err.body?.error || 'Failed to save user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal admin-modal-form">
        <div className="admin-modal-header">
          <h2>{mode === 'create' ? 'Create New User' : 'Edit User'}</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="admin-modal-body">
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <div className="form-group">
                <label>
                  Email <span className="required">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="user@example.com"
                />
              </div>

              <div className="form-group">
                <label>Principal Name (OID)</label>
                <input
                  type="text"
                  name="principal_name"
                  value={formData.principal_name}
                  onChange={handleChange}
                  placeholder="Leave empty to use email"
                />
                <span className="hint">Unique identifier for SAML/OID authentication</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  First Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Last Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  name="display_name"
                  value={formData.display_name || ''}
                  onChange={handleChange}
                  placeholder="Optional custom display name"
                />
              </div>

              <div className="form-group">
                <label>Affiliation</label>
                <input
                  type="text"
                  name="affiliation"
                  value={formData.affiliation || ''}
                  onChange={handleChange}
                  placeholder="Organization or institution"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  Role <span className="required">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                >
                  <option value="user">User</option>
                  <option value="student">Student</option>
                  <option value="mentor">Mentor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  Preferred Language <span className="required">*</span>
                </label>
                <select
                  name="preferred_language"
                  value={formData.preferred_language}
                  onChange={handleChange}
                  required
                >
                  <option value="hr">Croatian (HR)</option>
                  <option value="en">English (EN)</option>
                </select>
              </div>
            </div>

            {mode === 'create' && (
              <div className="form-row">
                <div className="form-group">
                  <span className="hint">
                    Password will be automatically generated and sent to the user's email address.
                  </span>
                </div>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={onClose}
                className="form-btn form-btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="form-btn form-btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

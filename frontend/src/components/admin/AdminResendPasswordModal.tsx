import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

declare global {
  interface Window {
    __pushNotification?: (message: string, durationSec?: number | string, isError?: boolean) => string;
  }
}

interface User {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
}

interface AdminResendPasswordModalProps {
  user: User;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AdminResendPasswordModal({ user, onClose, onSuccess }: AdminResendPasswordModalProps) {
  const [recipientEmail, setRecipientEmail] = useState(user.email);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientEmail || !recipientEmail.includes('@')) {
      window.__pushNotification?.('Please enter a valid email address', 3000, true);
      return;
    }

    try {
      setSubmitting(true);
      await api.resendPassword(user.user_id, recipientEmail);
      window.__pushNotification?.(`Password reset and sent to ${recipientEmail}`, 8000, false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to resend password:', err);
      window.__pushNotification?.(err.body?.error || 'Failed to resend password', 5000, true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal admin-modal-form" style={{ maxWidth: '500px' }}>
        <div className="admin-modal-header">
          <h2>Resend Password</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="admin-modal-body">
          <div style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            <strong>User:</strong> {user.first_name} {user.last_name} (ID: {user.user_id})
          </div>
          
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <div className="form-group">
                <label>
                  Email to send password to <span className="required">*</span>
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  required
                  placeholder="user@example.com"
                  autoFocus
                />
                <span className="hint" style={{ display: 'block', marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  A new password will be generated and sent to this email address. 
                  You can send it to a different address than the user's registered email if needed.
                </span>
              </div>
            </div>

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
                {submitting ? 'Sending...' : 'Resend Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

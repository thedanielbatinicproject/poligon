import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type WorkflowEvent = {
  workflow_id: number;
  document_id: number;
  status: string;
  changed_by: number;
  changed_at: string;
};

type WorkflowHistoryModalProps = {
  open: boolean;
  onClose: () => void;
  documentId: number | null;
  usersMap: Record<number, string>;
};

export default function WorkflowHistoryModal({ open, onClose, documentId, usersMap }: WorkflowHistoryModalProps) {
  const [history, setHistory] = useState<WorkflowEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !documentId) return;
    setLoading(true);
    fetch(`/api/documents/${documentId}/workflow`, { credentials: 'include' })
      .then(r => {
        setLoading(false);
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then((json: WorkflowEvent[]) => {
        const list = Array.isArray(json) ? json : [];
        // Show last 10 events, newest first
        setHistory(list.slice(-10).reverse());
      })
      .catch(() => {
        setLoading(false);
        setHistory([]);
      });
  }, [open, documentId]);

  useEffect(() => {
    // freeze background scroll while modal open
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!open) return null;

  const formatDate = (ts: string): string => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '—';
      const pad = (n: number) => String(n).padStart(2, '0');
      const day = pad(d.getDate());
      const month = pad(d.getMonth() + 1);
      const year = d.getFullYear();
      const hh = pad(d.getHours());
      const mm = pad(d.getMinutes());
      return `${day}.${month}.${year}. ${hh}:${mm}`;
    } catch (e) {
      return '—';
    }
  };

  const getUserName = (userId: number): string => {
    return usersMap[userId] || `User ${userId}`;
  };

  const modal = (
    <div
      className="userfinder-backdrop"
      role="dialog"
      aria-modal
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '90%',
          maxWidth: 600,
          maxHeight: '80vh',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--heading)' }}>Workflow History</h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.75rem',
              cursor: 'pointer',
              color: 'var(--text)',
              lineHeight: 1,
              padding: 0,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading && <div style={{ color: 'var(--muted)' }}>Loading workflow history...</div>}
          {!loading && history.length === 0 && <div style={{ color: 'var(--muted)' }}>No workflow history available.</div>}
          {!loading && history.length > 0 && (
            <div style={{ position: 'relative', paddingLeft: '2rem' }}>
              {/* Vertical timeline line */}
              <div
                style={{
                  position: 'absolute',
                  left: '0.5rem',
                  top: '1rem',
                  bottom: '1rem',
                  width: 2,
                  background: 'linear-gradient(to bottom, var(--accent), transparent)',
                }}
              />
              {history.map((event, idx) => (
                <div
                  key={event.workflow_id}
                  style={{
                    position: 'relative',
                    marginBottom: idx === history.length - 1 ? 0 : '1.5rem',
                    paddingLeft: '1.5rem',
                  }}
                >
                  {/* Timeline dot */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-1.6rem',
                      top: '0.4rem',
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      border: '2px solid var(--panel)',
                      boxShadow: '0 0 0 2px var(--accent)',
                    }}
                  />
                  {/* Event content */}
                  <div
                    style={{
                      background: 'rgba(var(--accent-rgb), 0.1)',
                      padding: '0.75rem 1rem',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--text)' }}>
                      <strong>{getUserName(event.changed_by)}</strong> set document status to{' '}
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{event.status}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                      {formatDate(event.changed_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

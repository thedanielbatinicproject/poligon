import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';

type AuditLogEntry = {
  log_id: number;
  user_id: number;
  action_type: string;
  entity_type: string;
  entity_id: number;
  action_timestamp: string;
};

type AuditLogModalProps = {
  open: boolean;
  onClose: () => void;
  documentId: number | null;
  usersMap: Record<number, string>;
};

export default function AuditLogModal({ open, onClose, documentId, usersMap }: AuditLogModalProps) {
  const [allLogs, setAllLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [displayCount, setDisplayCount] = useState(10);

  useEffect(() => {
    if (!open || !documentId) return;
    setLoading(true);
    setDisplayCount(10); // reset display count on open
    fetch(`/api/documents/${documentId}/audit-log`, { credentials: 'include' })
      .then(r => {
        setLoading(false);
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then((json: AuditLogEntry[]) => {
        const list = Array.isArray(json) ? json : [];
        setAllLogs(list);
      })
      .catch(() => {
        setLoading(false);
        setAllLogs([]);
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

  const uniqueActionTypes = useMemo(() => {
    const types = new Set<string>();
    allLogs.forEach((log) => types.add(log.action_type));
    return Array.from(types).sort();
  }, [allLogs]);

  const filteredLogs = useMemo(() => {
    if (selectedActionType === 'all') return allLogs;
    return allLogs.filter((log) => log.action_type === selectedActionType);
  }, [allLogs, selectedActionType]);

  const displayedLogs = useMemo(() => {
    return filteredLogs.slice(0, displayCount);
  }, [filteredLogs, displayCount]);

  const hasMore = displayedLogs.length < filteredLogs.length;

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + 10);
  };

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
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--heading)' }}>Audit Log History</h3>
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

        {/* Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label htmlFor="action-type-filter" style={{ fontSize: '0.95rem', color: 'var(--text)', fontWeight: 500 }}>
            Filter by Action:
          </label>
          <select
            id="action-type-filter"
            value={selectedActionType}
            onChange={(e) => {
              setSelectedActionType(e.target.value);
              setDisplayCount(10); // reset display count on filter change
            }}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--panel)',
              color: 'var(--text)',
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <option value="all">All Actions</option>
            {uniqueActionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading && <div style={{ color: 'var(--muted)' }}>Loading audit log...</div>}
          {!loading && filteredLogs.length === 0 && <div style={{ color: 'var(--muted)' }}>No audit log entries available.</div>}
          {!loading && displayedLogs.length > 0 && (
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
              {displayedLogs.map((entry, idx) => (
                <div
                  key={entry.log_id}
                  style={{
                    position: 'relative',
                    marginBottom: idx === displayedLogs.length - 1 ? 0 : '1.5rem',
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
                      <strong>{getUserName(entry.user_id)}</strong> performed action{' '}
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>'{entry.action_type}'</span> on this document.
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                      {formatDate(entry.action_timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem' }}>
              <button
                onClick={handleLoadMore}
                style={{
                  padding: '0.5rem 1.5rem',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--panel)',
                  color: 'var(--accent)',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

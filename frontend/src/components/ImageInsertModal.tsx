import React, { useEffect, useState } from 'react';
import { getDocumentImages } from '../lib/documentsApi';
import { createPortal } from 'react-dom';

interface ImageInsertModalProps {
  documentId: number;
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string) => void;
}

export const ImageInsertModal: React.FC<ImageInsertModalProps> = ({ documentId, isOpen, onClose, onInsert }) => {
  const [images, setImages] = useState<{ name: string; size?: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Disable scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    // Disable scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Escape key handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    getDocumentImages(documentId)
      .then((res) => setImages(res.images || []))
      .catch((e) => setError(e.message || 'Failed to fetch images.'))
      .finally(() => setLoading(false));
  }, [isOpen, documentId]);

  const handleInsert = (img: string) => {
    const latex = `\\includegraphics[width=0.8\\textwidth]{${img}}`;
    onInsert(latex);
    onClose();
  };

  if (!isOpen) return null;

  const modal = (
    <div className="userfinder-backdrop" role="dialog" aria-modal>
      <div
        className="glass-panel"
        style={{
          minWidth: 340,
          maxWidth: '95vw',
          padding: '2rem 2.5rem 1.5rem 2.5rem',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="userfinder-header" style={{ marginBottom: 18 }}>
          <h3>Document uploads</h3>
          <button className="uf-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="userfinder-body" style={{ flex: 1, minHeight: 0 }}>
          {loading && <div className="muted">Loading images…</div>}
          {error && <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div>}
          {!loading && !error && images.length === 0 && <div className="muted">No images found in the pool folder.</div>}
          <div
            className="image-list"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 18,
              margin: '1.2em 0 0.5em 0',
              maxHeight: '48vh',
              overflowY: 'auto',
            }}
          >
            {images.map((img) => (
              <div
                key={img.name}
                className="image-item"
                style={{ cursor: 'pointer', textAlign: 'center', transition: 'transform 0.13s' }}
                onClick={() => handleInsert(img.name)}
              >
                <div
                  style={{
                    width: 96,
                    height: 96,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--glass, #23272f)',
                    borderRadius: 10,
                    boxShadow: '0 1px 6px #0002',
                    border: '1.5px solid var(--border, #2a2e38)',
                    margin: '0 auto',
                  }}
                >
                  <img
                    src={`/api/uploads/${documentId}/${img.name}`}
                    alt={img.name}
                    style={{
                      maxWidth: '90%',
                      maxHeight: '90%',
                      objectFit: 'contain',
                      display: 'block',
                      borderRadius: 6,
                    }}
                    loading="lazy"
                  />
                </div>
                <div className="image-name" style={{ fontSize: '0.95em', marginTop: '0.3em', wordBreak: 'break-all' }}>{img.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
};

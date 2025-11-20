
import React, { useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import YjsEditor from '../components/YjsEditor';
import { useSession } from '../lib/session';
import { useNotifications } from '../lib/notifications';

const PLAYGROUND_STORAGE_KEY = 'playground-editor-content';

const RENDER_LIMIT = 15;
const PDF_COOKIE_KEY = 'playground-pdf-base64';
const LATEX_COOKIE_KEY = 'playground-latex';
const COOKIE_EXPIRE_DAYS = 60;


const Playground: React.FC = () => {
  const { session, loading: sessionLoading } = useSession();
  const { push } = useNotifications();
  const editorRef = useRef<any>(null);
  const [renderCount, setRenderCount] = useState<number>(0);
  const [unlimited, setUnlimited] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Load render count on mount
  useEffect(() => {
    if (sessionLoading) return;
    if (session && session.user_id) {
      setUnlimited(true);
      setLoading(false);
    } else {
      fetch('/api/utility/playground/renders')
        .then(res => res.json())
        .then(data => {
          if (data.unlimited) setUnlimited(true);
          else setRenderCount(data.count || 0);
        })
        .catch(() => push('Could not fetch remaining renders', 3, true))
        .finally(() => setLoading(false));
    }
  }, [session, sessionLoading, push]);


  // Track LaTeX content in state, update onChange, and persist
  const [latexContent, setLatexContent] = useState<string>('');
  // (log removed)
  const [initialContent, setInitialContent] = useState<string>('');
  // Load initial content only once on mount (no template, just user content or empty)
  useEffect(() => {
    const content = Cookies.get(LATEX_COOKIE_KEY);
    if (typeof content === 'string') {
      setInitialContent(content);
      setLatexContent(content);
    } else {
      const local = localStorage.getItem(PLAYGROUND_STORAGE_KEY);
      if (typeof local === 'string') {
        setInitialContent(local);
        setLatexContent(local);
      } else {
        setInitialContent('');
        setLatexContent('');
      }
    }
  }, []);

  // Editor content persistence (localStorage + cookie)
  const handleEditorChange = (content: string) => {
    // (log removed)
    setLatexContent(content);
    localStorage.setItem(PLAYGROUND_STORAGE_KEY, content);
    Cookies.set(LATEX_COOKIE_KEY, content, { expires: COOKIE_EXPIRE_DAYS });
  };




  // Render handler
  const handleRender = async () => {
    // (log removed)
    setIsRendering(true);
    setRenderError(null);
    try {
      // Use latexContent from state
      const content = typeof latexContent === 'string' ? latexContent : '';
      // (log removed)
      if (!content.trim()) {
        setRenderError('Cannot render: document is empty.');
        setIsRendering(false);
        // (log removed)
        return;
      }
      // Check render limit if not unlimited
      if (!unlimited) {
        const res = await fetch('/api/utility/playground/render', { method: 'POST' });
        const data = await res.json();
        if (!data.allowed) {
          push('Daily render limit reached!', 4, true);
          setIsRendering(false);
          return;
        }
        // Do not update renderCount yet; wait for successful compile
      }
      // Call backend to render LaTeX and get PDF as Blob
      const res = await fetch('/api/utility/playground/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        // After failed compile, fetch correct render count from backend
        if (!unlimited) {
          fetch('/api/utility/playground/renders')
            .then(res => res.json())
            .then(data => {
              if (!data.unlimited) setRenderCount(data.count || 0);
            });
        }
        throw new Error(errData.error || 'Render failed');
      }
      const pdfBlob = await res.blob();
      if (pdfBlob.type !== 'application/pdf') {
        // After failed compile, fetch correct render count from backend
        if (!unlimited) {
          fetch('/api/utility/playground/renders')
            .then(res => res.json())
            .then(data => {
              if (!data.unlimited) setRenderCount(data.count || 0);
            });
        }
        throw new Error('Did not receive a valid PDF.');
      }
      // After successful compile, fetch correct render count from backend
      if (!unlimited) {
        fetch('/api/utility/playground/renders')
          .then(res => res.json())
          .then(data => {
            if (!data.unlimited) setRenderCount(data.count || 0);
          });
      }
      // Convert PDF Blob to base64 for cookie storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        Cookies.set(PDF_COOKIE_KEY, base64, { expires: COOKIE_EXPIRE_DAYS });
        // (log removed)
      };
      reader.readAsDataURL(pdfBlob);
      // Create object URL for preview
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      // (log removed)
    } catch (e: any) {
      setRenderError(e?.message || 'Render failed');
      setPdfUrl(null);
      push(e?.message || 'Failed to render', 3, true);
      // (log removed)
    } finally {
      setIsRendering(false);
    }
  };


  // Restore PDF from cookie on mount
  useEffect(() => {
    const base64 = Cookies.get(PDF_COOKIE_KEY);
    if (base64) {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      // (log removed)
    } else {
      // (log removed)
    }
  }, []);

  return (
    <div className="playground-root col">
      <div className="main-editor" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100vw', minHeight: '100vh' }}>
        {/* Toolbar */}
        <div className="glass-panel playground-toolbar" style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="playground-title"><b>LaTeX Playground</b></span>
          {loading ? null : unlimited ? (
            <span className="playground-unlimited">Unlimited renders</span>
          ) : (
            <span className="playground-renders-left">Renders left: {RENDER_LIMIT - renderCount} / {RENDER_LIMIT}</span>
          )}
          <button className="btn btn-action" onClick={handleRender} disabled={!unlimited && renderCount >= RENDER_LIMIT} style={{ minWidth: 110, marginLeft: 'auto' }}>
            Render
          </button>
        </div>
        {/* Editor area (no split, just editor) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: LaTeX Editor */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '1px solid var(--border)' }}>
            <div style={{ padding: '0.5rem 1rem', background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
              <strong>LaTeX Editor</strong>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              {initialContent !== null && (
                <YjsEditor
                  key={initialContent}
                  ref={editorRef}
                  documentId={-1} // dummy, not used
                  readOnly={false}
                  onSave={() => {}}
                  onCompile={() => {}}
                  localOnly={true}
                  initialContent={initialContent}
                  onChange={handleEditorChange}
                />
              )}
            </div>
          </div>
          {/* Right: PDF Preview */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.5rem 1rem', background: 'var(--panel)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong>Preview (Temporary Compile)</strong>
              {isRendering && <span className="spinner" style={{ marginLeft: 8 }} />}
            </div>
            <div style={{ flex: 1, padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
              {renderError ? (
                <div style={{ color: 'var(--danger)', textAlign: 'center', whiteSpace: 'pre-line' }}>{renderError}</div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  title="PDF Preview"
                  style={{ width: '100%', height: '100%', border: 'none', minHeight: 400, background: '#fff', borderRadius: 6 }}
                />
              ) : (
                <div style={{ color: 'var(--muted)', textAlign: 'center' }}>
                  Preview will be available after rendering
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playground;

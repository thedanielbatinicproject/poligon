
import React, { useEffect, useRef, useState } from 'react';
import YjsEditor from '../components/YjsEditor';
import { useSession } from '../lib/session';
import { useNotifications } from '../lib/notifications';

const PLAYGROUND_STORAGE_KEY = 'playground-editor-content';
const RENDER_LIMIT = 15;


const Playground: React.FC = () => {
  const { user, loading: sessionLoading } = useSession();
  const { push } = useNotifications();
  const editorRef = useRef<any>(null);
  const [renderCount, setRenderCount] = useState<number>(0);
  const [unlimited, setUnlimited] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Load render count on mount
  useEffect(() => {
    if (sessionLoading) return;
    if (user) {
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
  }, [user, sessionLoading, push]);

  // Editor content persistence (localStorage)
  const handleEditorChange = (content: string) => {
    localStorage.setItem(PLAYGROUND_STORAGE_KEY, content);
  };
  const loadEditorContent = () => {
    return localStorage.getItem(PLAYGROUND_STORAGE_KEY) || '';
  };

  // Render handler
  const handleRender = async () => {
    if (unlimited) {
      push('Rendered! (no limit)', 2);
      // Place your render logic here
      return;
    }
    try {
      const res = await fetch('/api/utility/playground/render', { method: 'POST' });
      const data = await res.json();
      if (data.allowed) {
        setRenderCount(data.count);
        push('Rendered!', 2);
        // Place your render logic here
      } else {
        push('Daily render limit reached!', 4, true);
      }
    } catch {
      push('Failed to check or increment renders', 3, true);
    }
  };


  return (
    <div className="playground-root col">
      <main className="main-editor col">
        <div className="playground-editor-area col">
          <div className="playground-toolbar row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="playground-title"><b>Playground Editor</b></span>
            {loading ? null : unlimited ? (
              <span className="playground-unlimited" style={{ color: 'var(--success)' }}>Unlimited renders</span>
            ) : (
              <span className="playground-renders-left">Renders left: {RENDER_LIMIT - renderCount} / {RENDER_LIMIT}</span>
            )}
            <button className="editor-remove-btn" onClick={handleRender} disabled={!unlimited && renderCount >= RENDER_LIMIT}>
              Render
            </button>
          </div>
          <div className="playground-editor-flex" style={{ flex: 1, minHeight: 0 }}>
            <YjsEditor
              ref={editorRef}
              documentId={-1} // dummy, not used
              readOnly={false}
              onSave={() => {}}
              onCompile={() => {}}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Playground;

import React, { useEffect, useRef, useState } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { StreamLanguage, foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface YjsEditorProps {
  documentId: number;
  readOnly: boolean;
  onUserCountChange?: (count: number) => void;
}

export default function YjsEditor({ documentId, readOnly, onUserCountChange }: YjsEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    if (!editorRef.current || !documentId) return;

    // Cleanup previous instance
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
    }

    // Create new Y.Doc
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    
    // Get Yjs text type
    const ytext = ydoc.getText('latex');

    // Setup WebSocket provider - use VITE_API_BASE from env
    const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
    const wsUrl = apiBase.replace(/^http/, 'ws') + `/yjs?documentId=${documentId}`;
    // Room name ostavi prazan string, backend koristi documentId iz query parametra
    const provider = new WebsocketProvider(wsUrl, '', ydoc, {
      connect: true,
      WebSocketPolyfill: WebSocket as any
    });
    providerRef.current = provider;

    // Listen to connection status
    provider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    });

    provider.on('sync', (isSynced: boolean) => {
      setIsSynced(isSynced);
    });

    // Listen to user count updates from server
    provider.ws?.addEventListener('message', (event: MessageEvent) => {
      try {
        if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
          // Binary message - parse for userCount
          const parseUserCount = async (data: ArrayBuffer | Blob) => {
            const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
            const bytes = new Uint8Array(buffer);
            
            if (bytes.length > 0) {
              const typeLength = bytes[0];
              const type = new TextDecoder().decode(bytes.slice(1, 1 + typeLength));
              
              if (type === 'userCount') {
                const countStr = new TextDecoder().decode(bytes.slice(1 + typeLength));
                const count = parseInt(countStr, 10);
                if (!isNaN(count) && onUserCountChange) {
                  onUserCountChange(count);
                }
              }
            }
          };
          
          parseUserCount(event.data);
        }
      } catch (err) {
        // Ignore parsing errors
      }
    });

    // Create basic extensions
    const basicExtensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap
      ])
    ];

    // Create read-only compartment
    const readOnlyCompartment = new Compartment();

    // Create CodeMirror state with Yjs collaboration
    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        ...basicExtensions,
        StreamLanguage.define(stex),
        yCollab(ytext, provider.awareness),
        readOnlyCompartment.of(EditorView.editable.of(!readOnly)),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '0.95rem'
          },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily: 'monospace'
          }
        })
      ]
    });

    // Create CodeMirror view
    const view = new EditorView({
      state,
      parent: editorRef.current
    });
    viewRef.current = view;

    // Store compartment in view for later reconfiguration
    (view as any).readOnlyCompartment = readOnlyCompartment;

    // Cleanup on unmount or documentId change
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
    };
  }, [documentId, readOnly]);

  // Update read-only state when prop changes
  useEffect(() => {
    if (viewRef.current) {
      const compartment = (viewRef.current as any).readOnlyCompartment as Compartment;
      if (compartment) {
        viewRef.current.dispatch({
          effects: compartment.reconfigure(EditorView.editable.of(!readOnly))
        });
      }
    }
  }, [readOnly]);

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Connection status indicator */}
      {!isConnected && (
        <div style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'var(--warning)',
          color: 'var(--bg)',
          borderRadius: 6,
          fontSize: '0.85rem',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          ⚠️ Connecting to collaboration server...
        </div>
      )}
      
      {isConnected && !isSynced && (
        <div style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'var(--accent)',
          color: 'var(--bg)',
          borderRadius: 6,
          fontSize: '0.85rem',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          🔄 Syncing document...
        </div>
      )}

      {/* Editor container */}
      <div 
        ref={editorRef} 
        style={{ 
          flex: 1,
          overflow: 'auto',
          background: 'var(--bg)',
          color: 'var(--text)'
        }}
      />
    </div>
  );
}

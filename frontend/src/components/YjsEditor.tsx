// (removed duplicate import)
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';
import { latexCompletions } from './latexCompletions';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { StreamLanguage, foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';

import { stex } from '@codemirror/legacy-modes/mode/stex';
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import './codemirror-poligon-theme.css';
// ...existing code...

export interface YjsEditorHandle {
  getLatexContent: () => string;
}

interface YjsEditorProps {
  documentId: number;
  readOnly: boolean;
  onUserCountChange?: (count: number) => void;
  onSave?: () => void;
  onCompile?: () => void;
}

const YjsEditor = forwardRef<YjsEditorHandle, YjsEditorProps>(
  ({ documentId, readOnly, onUserCountChange, onSave, onCompile }, ref) => {
    // Keyboard shortcut handler
    // Remove broken dynamic keymap reconfiguration. Instead, add keymap in initial extensions below.
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
      // Use the new external Yjs websocket server
      const wsUrl = 'wss://socket.poligon.live';
      const provider = new WebsocketProvider(wsUrl, String(documentId), ydoc, {
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
      // Use awareness API to compute connected user count and notify parent
      if (onUserCountChange) {
        const computeAndNotify = () => {
          try {
            const states = provider.awareness.getStates();
            let count = 0;
            for (const _ of states.keys()) count++;
            onUserCountChange(count);
          } catch (e) {}
        };
        // initial
        computeAndNotify();
        provider.awareness.on('change', computeAndNotify);
      }
      // Helper to get CSS variable value from :root (or body)
      function getThemeVar(name: string) {
        // Try :root first, then body
        return getComputedStyle(document.documentElement).getPropertyValue(name) || getComputedStyle(document.body).getPropertyValue(name) || undefined;
      }

      // Define a HighlightStyle using theme variables
      const poligonHighlightStyle = HighlightStyle.define([
        { tag: tags.keyword, color: getThemeVar('--cm-keyword'), fontWeight: '600' },
        { tag: tags.operator, color: getThemeVar('--cm-operator') },
        { tag: tags.variableName, color: getThemeVar('--cm-variable') },
        { tag: tags.function(tags.variableName), color: getThemeVar('--cm-function') },
        { tag: tags.string, color: getThemeVar('--cm-string') },
        { tag: tags.number, color: getThemeVar('--cm-number') },
        { tag: tags.typeName, color: getThemeVar('--cm-type'), fontStyle: 'italic' },
        { tag: tags.comment, color: getThemeVar('--cm-comment'), fontStyle: 'italic' },
        { tag: tags.meta, color: getThemeVar('--cm-meta'), fontStyle: 'italic' },
        { tag: tags.attributeName, color: getThemeVar('--cm-attribute') },
        { tag: tags.propertyName, color: getThemeVar('--cm-property') },
        { tag: tags.bracket, color: getThemeVar('--cm-bracket') },
        { tag: tags.heading, color: getThemeVar('--cm-heading'), fontWeight: '700' },
        { tag: tags.link, color: getThemeVar('--cm-link'), textDecoration: 'underline' },
        { tag: tags.strong, color: getThemeVar('--cm-strong'), fontWeight: '700' },
        { tag: tags.emphasis, color: getThemeVar('--cm-emphasis'), fontStyle: 'italic' },
        { tag: tags.quote, color: getThemeVar('--cm-quote'), fontStyle: 'italic' },
        { tag: tags.regexp, color: getThemeVar('--cm-regexp') },
        { tag: tags.special(tags.variableName), color: getThemeVar('--cm-special') },
        { tag: tags.namespace, color: getThemeVar('--cm-namespace') },
        { tag: tags.deleted, color: getThemeVar('--cm-deleted'), textDecoration: 'line-through' },
        { tag: tags.inserted, color: getThemeVar('--cm-inserted'), textDecoration: 'underline' },
        { tag: tags.invalid, color: getThemeVar('--cm-invalid'), backgroundColor: 'rgba(255,0,0,0.08)' },
      ]);
      const customKeymap = keymap.of([
        {
          key: 'Mod-s',
          preventDefault: true,
          run: () => {
            if (onSave) onSave();
            return true;
          }
        },
        {
          key: 'Mod-e',
          preventDefault: true,
          run: () => {
            if (onCompile) onCompile();
            return true;
          }
        }
      ]);
      // Custom LaTeX completion source
      function latexCompletionSource(context: CompletionContext) {
        const word = context.matchBefore(/\\[a-zA-Z]*$/);
        if (!word || (word.from == word.to && !context.explicit)) return null;
        const term = word.text.slice(1); // remove leading '\'
        return {
          from: word.from + 1, // only complete after '\'
          options: latexCompletions
            .filter(cmd => cmd.label.startsWith(term))
            .map(cmd => ({
              label: cmd.label,
              type: cmd.type,
              info: cmd.info,
              apply: `\\${cmd.label}`
            })),
        };
      }

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
        syntaxHighlighting(poligonHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        EditorView.lineWrapping,
        autocompletion({
          override: [latexCompletionSource],
          activateOnTyping: true,
          defaultKeymap: true,
        }),
        customKeymap,
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

    // Expose getLatexContent method to parent via ref
    useImperativeHandle(ref, () => ({
      getLatexContent: () => {
        if (ydocRef.current) {
          return ydocRef.current.getText('latex').toString();
        }
        return '';
      }
    }), []);

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
        overflow: 'hidden',
        maxWidth: '40vw',
        minWidth: '0',
        width: '100%',
        alignSelf: 'flex-start'
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
            overflowX: 'hidden',
            overflowY: 'auto',
            background: 'var(--bg)',
            color: 'var(--text)',
            width: '100%',
            minWidth: 0,
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            maxWidth: '40vw',
            boxSizing: 'border-box'
          }}
        />
      </div>
    );
  }
);

export default YjsEditor;
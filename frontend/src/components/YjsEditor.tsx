import { ImageInsertModal } from './ImageInsertModal';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { autocompletion, CompletionContext, completionKeymap, acceptCompletion } from '@codemirror/autocomplete';
import { renderLatexCompletion } from './latexCompletionRender';
// import { latexCompletions } from './latexCompletions';
import { dynamicLatexCompletionSource } from './dynamicLatexCompletionProvider';
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


export interface YjsEditorHandle {
  getLatexContent: () => string;
}

interface YjsEditorProps {
  documentId: number;
  readOnly: boolean;
  onUserCountChange?: (count: number) => void;
  onSave?: () => void;
  onCompile?: () => void;
  localOnly?: boolean;
  initialContent?: string;
  onChange?: (content: string) => void;
  ydoc?: Y.Doc;
}

const YjsEditor = forwardRef<YjsEditorHandle, YjsEditorProps>(
  
  ({ documentId, readOnly, onUserCountChange, onSave, onCompile, localOnly, initialContent, onChange, ydoc }, ref) => {
    // Keyboard shortcut handler
    // Remove broken dynamic keymap reconfiguration. Instead, add keymap in initial extensions below.
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const providerRef = useRef<WebsocketProvider | null>(null);
    const ydocRef = useRef<Y.Doc | null>(ydoc || null);
    const [isConnected, setIsConnected] = useState(false);
    const [isSynced, setIsSynced] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);

    // Handler for inserting image LaTeX code
    const handleInsertImageLatex = (latex: string) => {
      // Insert at current cursor position, but ako je ispred kursora "\\in[a-z]*" (npr. "\\ins"), delete it before image insertion
      if (viewRef.current) {
        const view = viewRef.current;
        const { state } = view;
        const { from } = state.selection.main;
        // Find \in[a-z]* immediately before the cursor
        const before = state.sliceDoc(Math.max(0, from - 10), from); // max 10 characters back
        const match = before.match(/\\in[a-z]*$/);
        let tr = null;
        if (match) {
          // Delete \in[a-z]*
          tr = state.update({
            changes: { from: from - match[0].length, to: from, insert: '' }
          });
          view.dispatch(tr);
        }
        // Insert latex at new position
        const pos = match ? from - match[0].length : from;
        const tr2 = view.state.update({
          changes: { from: pos, to: pos, insert: latex }
        });
        view.dispatch(tr2);
        view.focus();
      }
    };
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
      // Use provided Y.Doc or create new
      if (!ydocRef.current) {
        ydocRef.current = ydoc ? ydoc : new Y.Doc();
      }
      const ydocInstance = ydocRef.current;
      // Get Yjs text type
      const ytext = ydocInstance.getText('latex');

      // Helper to get CSS variable value from :root (or body)
      function getThemeVar(name: string) {
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
        },
        {
          key: 'Tab',
          run: acceptCompletion,
        },
      ]);

      // Custom LaTeX completion source using dynamic provider
      function completionSourceWithImage(context: CompletionContext) {
        return Promise.resolve(dynamicLatexCompletionSource(context)).then(result => {
          if (!result) return null;
          result.options = result.options.map(opt => {
            if (opt.label === 'insertimage') {
              return {
                ...opt,
                apply: () => { setShowImageModal(true); return ''; }
              };
            }
            return opt;
          });
          return result;
        });
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
          override: [completionSourceWithImage],
          activateOnTyping: true,
          defaultKeymap: true,
          optionClass: (completion) => {
            const tag = (completion as any).tag;
            return tag ? `cm-latex-tag-${tag}` : '';
          },
          addToOptions: [
            {
              render: renderLatexCompletion,
              position: 100
            }
          ],
        }),
        customKeymap,
        keymap.of([
          ...completionKeymap,
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap
        ])
      ];
      // Create read-only compartment
      const readOnlyCompartment = new Compartment();

      // LOCAL-ONLY MODE: no WebSocket, use localStorage for persistence
      if (localOnly) {
        let initial = '';
        if (typeof initialContent === 'string') {
          initial = initialContent;
        } else {
          const storageKey = 'playground-editor-content';
          initial = localStorage.getItem(storageKey) || '';
        }
        // Force Yjs text to always match initialContent on mount
        if (ytext.toString() !== initial) {
          ytext.delete(0, ytext.length);
          if (initial) ytext.insert(0, initial);
          if (onChange) onChange(ytext.toString());
        } else if (initial && onChange) {
          // Only call onChange if initial is non-empty
          onChange(initial);
        }
        // Listen for changes and save to localStorage/callback
        // (log removed)
        ytext.observe(event => {
          const content = ytext.toString();
          localStorage.setItem('playground-editor-content', content);
          if (onChange) {
            onChange(content);
          }
        });
        // No yCollab extension
        const state = EditorState.create({
          doc: ytext.toString(),
          extensions: [
            ...basicExtensions,
            StreamLanguage.define(stex),
            yCollab(ytext, null),
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
        const view = new EditorView({
          state,
          parent: editorRef.current
        });
        viewRef.current = view;
        (view as any).readOnlyCompartment = readOnlyCompartment;
        return () => {
          if (viewRef.current) {
            viewRef.current.destroy();
            viewRef.current = null;
          }
          if (ydocRef.current) {
            ydocRef.current.destroy();
            ydocRef.current = null;
          }
        };
      }

      // COLLABORATIVE MODE (default)
      const wsUrl = 'wss://socket.poligon.live';
      const ydocForCollab = ydocRef.current || new Y.Doc();
      const provider = new WebsocketProvider(wsUrl, String(documentId), ydocForCollab, {
        connect: true,
        WebSocketPolyfill: WebSocket as any
      });
      providerRef.current = provider;
      provider.on('status', (event: { status: string }) => {
        setIsConnected(event.status === 'connected');
      });
      provider.on('sync', (isSynced: boolean) => {
        setIsSynced(isSynced);
      });
      if (onUserCountChange) {
        const computeAndNotify = () => {
          try {
            const states = provider.awareness.getStates();
            let count = 0;
            for (const _ of states.keys()) count++;
            onUserCountChange(count);
          } catch (e) {}
        };
        computeAndNotify();
        provider.awareness.on('change', computeAndNotify);
      }
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
      const view = new EditorView({
        state,
        parent: editorRef.current
      });
      viewRef.current = view;
      (view as any).readOnlyCompartment = readOnlyCompartment;
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
    }, [documentId, readOnly, localOnly]);

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
      <>
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
          {/* Connection status indicator (hide in localOnly mode) */}
          {!localOnly && !isConnected && (
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
              Connecting to collaboration server...
            </div>
          )}
          {!localOnly && isConnected && !isSynced && (
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
              Syncing document...
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
        <ImageInsertModal
          documentId={documentId}
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          onInsert={handleInsertImageLatex}
        />
      </>
    );
  }
);

export default YjsEditor;
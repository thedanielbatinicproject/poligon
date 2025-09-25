import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import './ChapterEditor.css';

const ChapterEditor = ({ chapter, onUpdate, onAutoSave, mode }) => {
    const [title, setTitle] = useState(chapter.title || '');
    const [notes, setNotes] = useState(chapter.notes || '');
    const autoSaveTimeoutRef = useRef(null);
    const lastSavedContentRef = useRef(chapter.content || '');

    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({
                inline: true,
                allowBase64: true,
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: chapter.content || '<p>Počnite pisanje...</p>',
        editable: mode === 'EDIT',
        onUpdate: ({ editor }) => {
            const content = editor.getHTML();
            
            // Auto-save only if content changed and we're in EDIT mode
            if (mode === 'EDIT' && content !== lastSavedContentRef.current) {
                handleAutoSave(content);
            }
        },
    });

    // Update editor content when chapter changes
    useEffect(() => {
        if (editor && chapter.content !== editor.getHTML()) {
            editor.commands.setContent(chapter.content || '<p>Počnite pisanje...</p>');
            lastSavedContentRef.current = chapter.content || '';
        }
        setTitle(chapter.title || '');
        setNotes(chapter.notes || '');
    }, [chapter, editor]);

    // Update editor editable state based on mode
    useEffect(() => {
        if (editor) {
            editor.setEditable(mode === 'EDIT');
        }
    }, [mode, editor]);

    const handleAutoSave = (content) => {
        // Clear previous timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        // Set new timeout for auto-save
        autoSaveTimeoutRef.current = setTimeout(() => {
            if (content !== lastSavedContentRef.current) {
                onAutoSave(chapter.id, content);
                lastSavedContentRef.current = content;
            }
        }, 2000); // 2 seconds delay
    };

    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        
        if (mode === 'EDIT') {
            // Debounce title updates
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
            
            autoSaveTimeoutRef.current = setTimeout(() => {
                onUpdate(chapter.id, { title: newTitle });
            }, 1000);
        }
    };

    const handleNotesChange = (e) => {
        const newNotes = e.target.value;
        setNotes(newNotes);
        
        if (mode === 'EDIT') {
            // Debounce notes updates
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
            
            autoSaveTimeoutRef.current = setTimeout(() => {
                onUpdate(chapter.id, { notes: newNotes });
            }, 1000);
        }
    };

    const insertTable = () => {
        if (editor) {
            editor.chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run();
        }
    };

    const insertImage = () => {
        const url = prompt('Unesite URL slike:');
        if (url && editor) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    const getWordCount = () => {
        if (!editor) return 0;
        const text = editor.getText();
        return text.split(/\s+/).filter(word => word.length > 0).length;
    };

    const getCharCount = () => {
        if (!editor) return 0;
        return editor.getText().length;
    };

    if (!editor) {
        return (
            <div className="chapter-editor loading">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Učitava editor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`chapter-editor ${mode.toLowerCase()}`}>
            {/* Chapter Header */}
            <div className="chapter-header">
                <div className="title-section">
                    {mode === 'EDIT' ? (
                        <input
                            type="text"
                            className="chapter-title-input"
                            value={title}
                            onChange={handleTitleChange}
                            placeholder="Naslov poglavlja..."
                        />
                    ) : (
                        <h1 className="chapter-title-display">{title || 'Naslov poglavlja'}</h1>
                    )}
                </div>

                <div className="chapter-stats">
                    <span className="word-count">{getWordCount()} riječi</span>
                    <span className="char-count">{getCharCount()} znakova</span>
                    {chapter.updated && (
                        <span className="last-updated">
                            Ažurirano: {new Date(chapter.updated).toLocaleString('hr-HR')}
                        </span>
                    )}
                </div>
            </div>

            {/* Toolbar - only in EDIT mode */}
            {mode === 'EDIT' && (
                <div className="editor-toolbar">
                    <div className="toolbar-group">
                        <button
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className={editor.isActive('bold') ? 'active' : ''}
                            title="Podebljano (Ctrl+B)"
                        >
                            <strong>B</strong>
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className={editor.isActive('italic') ? 'active' : ''}
                            title="Kurziv (Ctrl+I)"
                        >
                            <em>I</em>
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            className={editor.isActive('strike') ? 'active' : ''}
                            title="Precrtano"
                        >
                            <s>S</s>
                        </button>
                    </div>

                    <div className="toolbar-group">
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            className={editor.isActive('heading', { level: 1 }) ? 'active' : ''}
                            title="Zaglavlje 1"
                        >
                            H1
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}
                            title="Zaglavlje 2"
                        >
                            H2
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                            className={editor.isActive('heading', { level: 3 }) ? 'active' : ''}
                            title="Zaglavlje 3"
                        >
                            H3
                        </button>
                    </div>

                    <div className="toolbar-group">
                        <button
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            className={editor.isActive('bulletList') ? 'active' : ''}
                            title="Lista s oznakama"
                        >
                            •
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            className={editor.isActive('orderedList') ? 'active' : ''}
                            title="Numerirana lista"
                        >
                            1.
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            className={editor.isActive('blockquote') ? 'active' : ''}
                            title="Citat"
                        >
                            "
                        </button>
                    </div>

                    <div className="toolbar-group">
                        <button
                            onClick={insertTable}
                            title="Umetni tablicu"
                        >
                            ⚏
                        </button>
                        <button
                            onClick={insertImage}
                            title="Umetni sliku"
                        >
                            🖼
                        </button>
                        <button
                            onClick={() => editor.chain().focus().setHorizontalRule().run()}
                            title="Horizontalna linija"
                        >
                            ―
                        </button>
                    </div>

                    <div className="toolbar-group">
                        <button
                            onClick={() => editor.chain().focus().undo().run()}
                            disabled={!editor.can().undo()}
                            title="Poništi (Ctrl+Z)"
                        >
                            ↶
                        </button>
                        <button
                            onClick={() => editor.chain().focus().redo().run()}
                            disabled={!editor.can().redo()}
                            title="Ponovi (Ctrl+Y)"
                        >
                            ↷
                        </button>
                    </div>
                </div>
            )}

            {/* Main Editor */}
            <div className="editor-container">
                <EditorContent 
                    editor={editor} 
                    className="editor-content"
                />
            </div>

            {/* Notes Section - only in EDIT mode */}
            {mode === 'EDIT' && (
                <div className="notes-section">
                    <h4>Bilješke</h4>
                    <textarea
                        className="notes-textarea"
                        value={notes}
                        onChange={handleNotesChange}
                        placeholder="Dodajte bilješke o ovom poglavlju..."
                        rows={4}
                    />
                </div>
            )}

            {/* Chapter Progress */}
            <div className="chapter-progress">
                <div className="progress-info">
                    <span>Napredak poglavlja</span>
                    <span>{getWordCount()} / 2000 riječi (preporučeno)</span>
                </div>
                <div className="progress-bar">
                    <div 
                        className="progress-fill"
                        style={{ 
                            width: `${Math.min((getWordCount() / 2000) * 100, 100)}%` 
                        }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default ChapterEditor;
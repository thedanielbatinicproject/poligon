import React, { useRef, useEffect, useState, useCallback } from 'react';
import { notesAPI } from '../utils/api';
import './ScientificEditor.css';

const ScientificEditor = ({ 
    value, 
    onChange, 
    chapter, 
    thesis, 
    mode, 
    user,
    disabled = false 
}) => {
    const editorRef = useRef(null);
    const [counters, setCounters] = useState({
        tables: 0,
        figures: 0,
        graphs: 0,
        equations: 0
    });
    
    
    const [selectedText, setSelectedText] = useState('');
    const [selectionRange, setSelectionRange] = useState(null);
    const [showAddNoteButton, setShowAddNoteButton] = useState(false);
    const [noteButtonPosition, setNoteButtonPosition] = useState({ top: 0, left: 0 });
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [newNoteDescription, setNewNoteDescription] = useState('');
    const [selectionRect, setSelectionRect] = useState(null);

    
    const generateChapterPrefix = useCallback(() => {
        if (!chapter || !thesis) return '1';
        
        const chapters = thesis.chapters || [];
        
        
        const getChapterPath = (chapterId, path = []) => {
            const currentChapter = chapters.find(c => c.id === chapterId);
            if (!currentChapter) return path;
            
            path.unshift(currentChapter);
            
            if (currentChapter.parentId) {
                return getChapterPath(currentChapter.parentId, path);
            }
            
            return path;
        };
        
        const chapterPath = getChapterPath(chapter.id);
        
        
        let prefix = '';
        for (let i = 0; i < chapterPath.length; i++) {
            const currentChapter = chapterPath[i];
            const level = i;
            
            let siblings;
            if (level === 0) {
                siblings = chapters.filter(c => !c.parentId || c.parentId === null);
            } else {
                const parentId = chapterPath[i - 1].id;
                siblings = chapters.filter(c => c.parentId === parentId);
            }
            
            const index = siblings.findIndex(c => c.id === currentChapter.id);
            const number = index + 1;
            
            if (i === 0) {
                prefix = number.toString();
            } else {
                prefix += '.' + number;
            }
        }
        
        return prefix || '1';
    }, [chapter, thesis]);

    
    const editorConfig = {
        height: 650,
        menubar: mode === 'EDIT',
        statusbar: true, 
        plugins: mode === 'EDIT' ? [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'help', 'wordcount',
            'nonbreaking', 'autoresize', 'pagebreak', 'quickbars'
        ] : [],
        toolbar: mode === 'EDIT' ? 
                'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | ' +
                'forecolor backcolor | alignleft aligncenter alignright alignjustify | ' +
                'bullist numlist outdent indent | removeformat | ' +
                'table image media link | pagebreak | ' +
                'charmap | searchreplace | code fullscreen preview | help' : false,
        content_style: `
            body { 
                font-family: Times, 'Times New Roman', serif; 
                font-size: 12pt; 
                line-height: 1.6; 
                max-width: 21cm; 
                margin: 0 auto; 
                padding: 2cm; 
                background: white;
            }
            h1 { font-size: 16pt; text-align: center; margin: 24px 0 12px 0; }
            h2 { font-size: 14pt; margin: 20px 0 10px 0; }
            h3 { font-size: 12pt; margin: 16px 0 8px 0; }
            p { text-align: justify; text-indent: 1.25cm; margin: 12px 0; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #333; padding: 8px 12px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            figure { text-align: center; margin: 20px 0; }
            figcaption { font-size: 10pt; font-style: italic; color: #555; }
        `,
        image_advtab: true,
        automatic_uploads: true,
        file_picker_types: 'image',
        table_default_attributes: {
            border: '1'
        },
        table_default_styles: {
            'border-collapse': 'collapse'
        },
        
        toolbar_mode: 'sliding',
        
        table_use_colgroups: true,
        table_sizing_mode: 'fixed',
        
        images_upload_handler: (blobInfo, progress) => {
            return new Promise((resolve, reject) => {
                const formData = new FormData();
                formData.append('image', blobInfo.blob(), blobInfo.filename());
                
                fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(result => {
                    if (result.success) {
                        resolve(result.url);
                    } else {
                        reject(new Error(result.error || 'Upload failed'));
                    }
                })
                .catch(error => {
                    reject(error);
                });
            });
        },
        
        browser_spellcheck: true,
        contextmenu: false,
        
        paste_data_images: true,
        paste_as_text: false,
        readonly: mode === 'VIEW', 
        
        setup: (editor) => {
            if (mode === 'VIEW') {
                
                editor.on('init', () => {
                    editor.getBody().setAttribute('contenteditable', 'true');
                    editor.getBody().style.userSelect = 'text';
                    editor.getBody().style.webkitUserSelect = 'text';
                    editor.getBody().style.mozUserSelect = 'text';
                    editor.getBody().style.msUserSelect = 'text';
                });
                
                
                editor.on('keydown', (e) => {
                    
                    const allowedKeys = [37, 38, 39, 40, 35, 36, 33, 34, 16, 17, 18]; 
                    if (!allowedKeys.includes(e.keyCode)) {
                        e.preventDefault();
                        return false;
                    }
                });
                
                
                editor.on('paste cut', (e) => {
                    e.preventDefault();
                    return false;
                });
                
                
                editor.on('selectionchange', () => {
                    setTimeout(handleSelectionChange, 10);
                });
                
                editor.on('mouseup', () => {
                    setTimeout(handleSelectionChange, 50);
                });
                
                editor.on('keyup', () => {
                    setTimeout(handleSelectionChange, 10);
                });
                
                editor.on('nodechange', () => {
                    setTimeout(handleSelectionChange, 10);
                });
            }
            
            
            editor.on('selectionchange', handleSelectionChange);
            editor.on('mouseup', handleSelectionChange);
            editor.on('keyup', handleSelectionChange);
            
            
            editor.on('init', () => {
                const editorDoc = editor.getDoc();
                editorDoc.addEventListener('mouseup', handleSelectionChange);
                editorDoc.addEventListener('keyup', handleSelectionChange);
                editorDoc.addEventListener('selectionchange', handleSelectionChange);
            });
        }
    };

    
    const handleInit = (evt, editor) => {
        editorRef.current = editor;
    };

    
    const handleChange = (content, editor) => {
        onChange({ target: { value: content } });
        updateCounters(content);
    };

    
    const handleSelectionChange = useCallback(() => {
        
        if (mode !== 'VIEW') {
            return;
        }
        
        try {
            
            let selectedContent = '';
            let range = null;
            
            if (editorRef.current) {
                const editor = editorRef.current;
                const editorSel = editor.selection;
                
                
                selectedContent = editorSel.getContent({ format: 'text' }).trim();
                
                if (selectedContent) {
                    range = editorSel.getRng();
                }
            }
            
            
            if (!selectedContent) {
                const selection = window.getSelection();
                
                if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
                    selectedContent = selection.toString().trim();
                    range = selection.getRangeAt(0);
                }
            }
            
            
            if (!selectedContent && editorRef.current) {
                const editorBody = editorRef.current.getBody();
                const editorDoc = editorBody.ownerDocument;
                const editorSelection = editorDoc.getSelection();
                
                if (editorSelection && editorSelection.rangeCount > 0 && !editorSelection.isCollapsed) {
                    selectedContent = editorSelection.toString().trim();
                    range = editorSelection.getRangeAt(0);
                }
            }
            
            if (!selectedContent || selectedContent.length === 0) {
                setShowAddNoteButton(false);
                setSelectedText('');
                setSelectionRange(null);
                setSelectionRect(null);
                return;
            }
            
            
            if (!editorRef.current) {
                return;
            }
            
            const editorBody = editorRef.current.getBody();
            if (range) {
                let commonAncestor = range.commonAncestorContainer;
                if (commonAncestor.nodeType === Node.TEXT_NODE) {
                    commonAncestor = commonAncestor.parentElement;
                }
                
                const isWithinEditor = editorBody && editorBody.contains(commonAncestor);
                
                if (!isWithinEditor) {
                    setShowAddNoteButton(false);
                    return;
                }
            }
            
            
            setSelectedText(selectedContent);
            setSelectionRange(range);
            updateSelectionRect();
            
            calculateButtonPosition(range);
            setShowAddNoteButton(true);
        } catch (error) {
            
            setShowAddNoteButton(false);
        }
    }, [calculateButtonPosition, mode]);
    const updateSelectionRect = useCallback(() => {
        if (!editorRef.current || mode !== 'VIEW') {
            setSelectionRect(null);
            return;
        }

        try {
            const editor = editorRef.current;
            const editorContainer = editor.getContainer();
            const iframe = editorContainer ? editorContainer.querySelector('iframe') : null;
            
            let iframeRect = { top: 0, left: 0 };
            if (iframe) {
                iframeRect = iframe.getBoundingClientRect();
            } else if (editorContainer) {
                iframeRect = editorContainer.getBoundingClientRect();
            }
            
            const currentSelection = editor.selection;
            const currentRange = currentSelection ? currentSelection.getRng() : null;
            
            if (currentRange) {
                try {
                    const rangeRect = currentRange.getBoundingClientRect();
                    setSelectionRect({
                        top: rangeRect.top + iframeRect.top,
                        left: rangeRect.left + iframeRect.left,
                        width: rangeRect.width,
                        height: rangeRect.height
                    });
                } catch (e) {
                    const windowSelection = window.getSelection();
                    if (windowSelection && windowSelection.rangeCount > 0) {
                        const windowRange = windowSelection.getRangeAt(0);
                        const rangeRect = windowRange.getBoundingClientRect();
                        setSelectionRect({
                            top: rangeRect.top,
                            left: rangeRect.left,
                            width: rangeRect.width,
                            height: rangeRect.height
                        });
                    }
                }
            } else {
                setSelectionRect(null);
            }
        } catch (error) {
            setSelectionRect(null);
        }
    }, [mode]);

    
    const calculateButtonPosition = useCallback((range) => {
        if (!editorRef.current) {
            return;
        }
        
        try {
            const editor = editorRef.current;
            let clientRect;
            
            
            const editorBody = editor.getBody();
            const editorDoc = editor.getDoc();
            const editorContainer = editor.getContainer();
            const iframe = editorContainer ? editorContainer.querySelector('iframe') : null;
            
            let iframeRect = { top: 0, left: 0 };
            if (iframe) {
                iframeRect = iframe.getBoundingClientRect();
            } else {
                if (editorContainer) {
                    iframeRect = editorContainer.getBoundingClientRect();
                }
            }
            const currentSelection = editor.selection;
            const currentRange = currentSelection ? currentSelection.getRng() : null;
            
            if (currentRange) {
                try {
                    const rangeRect = currentRange.getBoundingClientRect();
                    
                    clientRect = {
                        top: rangeRect.top + iframeRect.top,
                        left: rangeRect.left + iframeRect.left,
                        bottom: rangeRect.bottom + iframeRect.top,
                        right: rangeRect.right + iframeRect.left,
                        width: rangeRect.width,
                        height: rangeRect.height
                    };
                } catch (e) {
                    clientRect = null;
                }
            }
            if (!clientRect || clientRect.width === 0) {
                const windowSelection = window.getSelection();
                if (windowSelection && windowSelection.rangeCount > 0) {
                    const windowRange = windowSelection.getRangeAt(0);
                    const rangeRect = windowRange.getBoundingClientRect();
                    
                    clientRect = {
                        top: rangeRect.top,
                        left: rangeRect.left,
                        bottom: rangeRect.bottom,
                        right: rangeRect.right,
                        width: rangeRect.width,
                        height: rangeRect.height
                    };
                }
            }
            
            
            if (!clientRect || clientRect.width === 0 || clientRect.height === 0) {
                return;
            }
            
            
            const buttonHeight = 40; 
            const margin = 10; 
            
            let top = clientRect.top - buttonHeight - margin;
            let left = clientRect.left;
            
            
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };
            
            
            if (top < 0) {
                top = clientRect.bottom + margin;
            }
            
            
            const buttonWidth = 150; 
            if (left + buttonWidth > viewport.width) {
                left = viewport.width - buttonWidth - 10;
            }
            if (left < 0) {
                left = 10;
            }
            
            setNoteButtonPosition({ top, left });
        } catch (error) {
            
        }
    }, []);

    
    const getLineNumber = useCallback((range) => {
        if (!editorRef.current || !range) return 1;
        
        const editor = editorRef.current;
        const body = editor.getBody();
        const allElements = body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, li');
        
        let lineNumber = 1;
        const startContainer = range.startContainer;
        
        
        let targetElement = startContainer.nodeType === Node.TEXT_NODE 
            ? startContainer.parentElement 
            : startContainer;
            
        for (let i = 0; i < allElements.length; i++) {
            if (allElements[i] === targetElement || allElements[i].contains(targetElement)) {
                lineNumber = i + 1;
                break;
            }
        }
        
        return lineNumber;
    }, []);

    
    const handleCreateNoteFromSelection = useCallback(() => {
        if (!selectedText || !selectionRange || !thesis || !chapter) return;
        
        
        window.dispatchEvent(new CustomEvent('openNoteForm', {
            detail: { 
                selectedText,
                lineNumber: getLineNumber(selectionRange)
            }
        }));
        
        
        document.body.style.overflow = 'hidden';
        
        setShowNoteForm(true);
        setShowAddNoteButton(false);
    }, [selectedText, selectionRange, thesis, chapter, getLineNumber]);

    
    const handleSaveNote = useCallback(async () => {
        if (!newNoteDescription.trim() || !selectedText || !selectionRange) return;
        
        try {
            const lineNumber = getLineNumber(selectionRange);
            
            const noteData = {
                thesisId: thesis.id,
                chapterId: chapter.id,
                lineNumber,
                selectedText,
                description: newNoteDescription.trim(),
                author: user?.username || 'Visitor'
            };
            
            const response = await notesAPI.createNote(noteData);
            
            
            setNewNoteDescription('');
            setShowNoteForm(false);
            setShowAddNoteButton(false);
            setSelectedText('');
            setSelectionRange(null);
            
            
            document.body.style.overflow = 'auto';
            
            
            window.dispatchEvent(new CustomEvent('noteCreated', {
                detail: { 
                    note: response.data,
                    thesisId: thesis.id,
                    chapterId: chapter.id
                }
            }));
            
            
            if (editorRef.current) {
                editorRef.current.notificationManager.open({
                    text: 'Bilješka je uspješno dodana!',
                    type: 'success',
                    timeout: 3000
                });
            }
            
        } catch (error) {
            
            if (editorRef.current) {
                editorRef.current.notificationManager.open({
                    text: 'Greška pri kreiranju bilješke',
                    type: 'error',
                    timeout: 4000
                });
            }
        }
    }, [newNoteDescription, selectedText, selectionRange, thesis, chapter, user, getLineNumber]);

    
    const handleCloseNoteForm = useCallback(() => {
        setShowNoteForm(false);
        setNewNoteDescription('');
        
        document.body.style.overflow = 'auto';
    }, []);

    
    const updateCounters = useCallback((content) => {
        if (!content) return;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        
        const tables = tempDiv.querySelectorAll('table').length;
        const figures = tempDiv.querySelectorAll('figure').length;
        const equations = tempDiv.querySelectorAll('[data-equation]').length;
        
        setCounters({ tables, figures, graphs: 0, equations });
    }, []);

    
    const insertTable = useCallback(() => {
        if (editorRef.current) {
            const editor = editorRef.current;
            const chapterPrefix = generateChapterPrefix();
            const tableNumber = counters.tables + 1;
            
            const tableHtml = `
                <p><strong>Tablica ${chapterPrefix}.${tableNumber}. Opis tablice</strong></p>
                <table>
                    <thead>
                        <tr>
                            <th>Zaglavlje 1</th>
                            <th>Zaglavlje 2</th>
                            <th>Zaglavlje 3</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Celija 1</td>
                            <td>Celija 2</td>
                            <td>Celija 3</td>
                        </tr>
                        <tr>
                            <td>Celija 4</td>
                            <td>Celija 5</td>
                            <td>Celija 6</td>
                        </tr>
                    </tbody>
                </table>
                <p>&nbsp;</p>
            `;
            
            editor.insertContent(tableHtml);
            setCounters(prev => ({ ...prev, tables: prev.tables + 1 }));
        }
    }, [generateChapterPrefix, counters.tables]);

    
    const insertFigure = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const formData = new FormData();
                formData.append('image', file);
                
                fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const figureNumber = generateChapterPrefix() + (counters.figures + 1);
                        const figureHtml = `
                            <figure>
                                <img src="${data.url}" alt="Slika ${figureNumber}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
                                <figcaption style="text-align: center; margin-top: 10px; font-style: italic;">
                                    Slika ${figureNumber}: [Opis slike]
                                </figcaption>
                            </figure>
                            <p>&nbsp;</p>
                        `;
                        
                        if (editorRef.current) {
                            editorRef.current.insertContent(figureHtml);
                            setCounters(prev => ({ ...prev, figures: prev.figures + 1 }));
                        }
                    } else {
                        alert('Greška pri uploadu slike: ' + data.error);
                    }
                })
                .catch(error => {
                    alert('Greška pri uploadu slike');
                });
            }
        };
        
        input.click();
    }, [generateChapterPrefix, counters.figures]);
    useEffect(() => {
        if (typeof window.tinymce === 'undefined') {
            return;
        }

        const editorId = `tinymce-editor-${Date.now()}`;
        const container = document.getElementById('tinymce-container');
        if (!container) return;
        
        const textarea = document.createElement('textarea');
        textarea.id = editorId;
        textarea.value = value || '';
        container.innerHTML = '';
        container.appendChild(textarea);

        window.tinymce.init({
            selector: `#${editorId}`,
            ...editorConfig,
            license_key: 'gpl',
            setup: (editor) => {
                editorRef.current = editor;
                
                if (editorConfig.setup) {
                    editorConfig.setup(editor);
                }
                
                editor.on('change keyup', () => {
                    const content = editor.getContent();
                    if (onChange) {
                        onChange(content);
                    }
                });
            }
        });

        return () => {
            if (editorRef.current) {
                window.tinymce.remove(`#${editorId}`);
                editorRef.current = null;
            }
        };
    }, [mode, user?.role, user?.id]); // Dodajemo ključne dependency-je
    useEffect(() => {
        if (mode !== 'VIEW' || !showAddNoteButton || !selectionRange) {
            return;
        }

        const handleScroll = () => {
            if (selectionRange) {
                calculateButtonPosition(selectionRange);
                updateSelectionRect();
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        document.addEventListener('scroll', handleScroll, { passive: true });
        
        // Dodaj listener za content-body kontejner
        const contentBodyElement = document.querySelector('[data-content-body="true"]');
        if (contentBodyElement) {
            contentBodyElement.addEventListener('scroll', handleScroll, { passive: true });
        }
        
        if (editorRef.current) {
            const editorContainer = editorRef.current.getContainer();
            if (editorContainer) {
                editorContainer.addEventListener('scroll', handleScroll, { passive: true });
            }
            const editorBody = editorRef.current.getBody();
            if (editorBody) {
                editorBody.addEventListener('scroll', handleScroll, { passive: true });
            }
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('scroll', handleScroll);
            
            // Ukloni listener za content-body kontejner
            const contentBodyElement = document.querySelector('[data-content-body="true"]');
            if (contentBodyElement) {
                contentBodyElement.removeEventListener('scroll', handleScroll);
            }
            
            if (editorRef.current) {
                const editorContainer = editorRef.current.getContainer();
                if (editorContainer) {
                    editorContainer.removeEventListener('scroll', handleScroll);
                }
                
                const editorBody = editorRef.current.getBody();
                if (editorBody) {
                    editorBody.removeEventListener('scroll', handleScroll);
                }
            }
        };
    }, [mode, showAddNoteButton, selectionRange, calculateButtonPosition, updateSelectionRect]);
    useEffect(() => {
        if (editorRef.current && editorRef.current.getContent() !== (value || '')) {
            editorRef.current.setContent(value || '');
        }
    }, [value]);

    return (
        <>
        <div className="scientific-editor">
            {/* TinyMCE Editor Container */}
            <div id="tinymce-container" style={{ minHeight: '650px' }}>
                {typeof window.tinymce === 'undefined' && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                        Ucitavanje editora...
                    </div>
                )}
            </div>
            
            {showAddNoteButton && (
                <div 
                    className="floating-note-button-container"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        pointerEvents: 'none',
                        zIndex: 10000
                    }}
                >

                    {/* Sivi okvir za prikazivanje selekcije */}
                    {selectionRect && selectionRect.width > 0 && selectionRect.height > 0 && (
                        <div
                            style={{
                                position: 'absolute',
                                top: selectionRect.top + 'px',
                                left: selectionRect.left + 'px',
                                width: selectionRect.width + 'px',
                                height: selectionRect.height + 'px',
                                background: 'rgba(150,150,150,0.2)',
                                pointerEvents: 'none',
                                borderRadius: '3px',
                                border: '1px solid rgba(150,150,150,0.4)'
                            }}
                        />
                    )}
                    
                    <div 
                        className="add-note-button"
                        style={{
                            position: 'absolute',
                            top: noteButtonPosition.top + 'px',
                            left: noteButtonPosition.left + 'px',
                            pointerEvents: 'auto',
                            background: 'white',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            borderRadius: '6px',
                            padding: '4px',
                            minWidth: '120px'
                        }}
                    >
                        <button 
                            className="selection-note-btn"
                            onClick={handleCreateNoteFromSelection}
                            title="Dodaj biljesku za selektirani tekst"
                        >
                            <img src="/icons/quote.png" alt="Quote" className="quote-icon" />
                            Dodaj biljesku
                        </button>
                    </div>
                </div>
            )}
        </div>
                
        {showNoteForm && (
            <div className="note-form-overlay" onClick={handleCloseNoteForm}>
                <div className="note-form-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="note-form-header">
                        <h3>Dodaj biljesku</h3>
                        <button 
                            className="close-btn"
                            onClick={handleCloseNoteForm}
                        >
                            ×
                        </button>
                    </div>
                    
                    <div className="note-form-content">
                        <div className="note-form-info">
                            <div className="form-info-item">
                                <strong>Poglavlje:</strong> {chapter?.title}
                            </div>
                            <div className="form-info-item">
                                <strong>Autor:</strong> {user?.username || 'Visitor'}
                            </div>
                            <div className="form-info-item">
                                <strong>Linija:</strong> {selectionRange ? getLineNumber(selectionRange) : 'N/A'}
                            </div>
                            <div className="form-info-item">
                                <strong>Datum:</strong> {new Date().toLocaleDateString('hr-HR')}
                            </div>
                        </div>
                        
                        <div className="selected-text-preview">
                            <strong>Selektirani tekst:</strong>
                            <em>"{selectedText}"</em>
                        </div>
                        
                        <div className="form-field">
                            <label htmlFor="note-description"><strong>Opis bilješke *</strong></label>
                            <textarea
                                id="note-description"
                                value={newNoteDescription}
                                onChange={(e) => setNewNoteDescription(e.target.value)}
                                placeholder="Unesite detaljni opis bilješke..."
                                rows={4}
                                className="note-description-input"
                                autoFocus
                            />
                        </div>
                        
                        <div className="note-form-actions">
                            <button 
                                className="save-note-btn"
                                onClick={handleSaveNote}
                                disabled={!newNoteDescription.trim()}
                            >
                                Spremi biljesku
                            </button>
                            <button 
                                className="cancel-note-btn"
                                onClick={handleCloseNoteForm}
                            >
                                Odustani
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default ScientificEditor;

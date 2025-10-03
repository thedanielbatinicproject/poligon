import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Editor } from '@tinymce/tinymce-react';
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
    
    // State za bilješke i selekciju
    const [selectedText, setSelectedText] = useState('');
    const [selectionRange, setSelectionRange] = useState(null);
    const [showAddNoteButton, setShowAddNoteButton] = useState(false);
    const [noteButtonPosition, setNoteButtonPosition] = useState({ top: 0, left: 0 });
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [newNoteDescription, setNewNoteDescription] = useState('');

    // Generiranje brojeva prema hijerarhiji poglavlja
    const generateChapterPrefix = useCallback(() => {
        if (!chapter || !thesis) return '1';
        
        const chapters = thesis.chapters || [];
        
        // Rekurzivna funkcija za pronalaženje puta do root poglavlja
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
        
        // Generiranje numeracije na osnovu puta
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

    // TinyMCE konfiguracija za znanstvene radove
    const editorConfig = {
        height: 650,
        menubar: mode === 'EDIT',
        statusbar: true, // Prikaži statusbar sa pozicijom kursora
        // Tvoj besplatni API ključ
        apiKey: 'z62828asb7sazqtp5t7jxtnul56kzuwkgap3xqrwh0hbes1p',
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
        // Toolbar options
        toolbar_mode: 'sliding',
        // Table options
        table_use_colgroups: true,
        table_sizing_mode: 'fixed',
        // Upload handler za slike
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
                    console.error('Upload error:', error);
                    reject(error);
                });
            });
        },
        // Basic browser paste support
        browser_spellcheck: true,
        contextmenu: false,
        // Modern paste handling
        paste_data_images: true,
        paste_as_text: false,
        readonly: false, // Omogućujem selekciju u VIEW režimu
        // Za VIEW režim - sakrivaj toolbar ali omogući selekciju
        setup: (editor) => {
            if (mode === 'VIEW') {
                // Onemogući uređivanje sadržaja ali omogući selekciju
                editor.on('init', () => {
                    editor.getBody().setAttribute('contenteditable', 'true');
                    editor.getBody().style.userSelect = 'text';
                    editor.getBody().style.webkitUserSelect = 'text';
                    editor.getBody().style.mozUserSelect = 'text';
                    editor.getBody().style.msUserSelect = 'text';
                });
                
                // Blokiraj sve tipkovnicu za uređivanje
                editor.on('keydown', (e) => {
                    // Dozvoljavaj samo navigacijske tipke (strelice, home, end, page up/down)
                    const allowedKeys = [37, 38, 39, 40, 35, 36, 33, 34, 16, 17, 18]; // arrows, home, end, page up/down, shift, ctrl, alt
                    if (!allowedKeys.includes(e.keyCode)) {
                        e.preventDefault();
                        return false;
                    }
                });
                
                // Blokiraj paste, cut, itd.
                editor.on('paste cut', (e) => {
                    e.preventDefault();
                    return false;
                });
                
                // Praćenje selekcije za bilješke
                editor.on('selectionchange', handleSelectionChange);
                editor.on('mouseup', handleSelectionChange);
                editor.on('keyup', handleSelectionChange);
            }
            
            // Za sve režime - praćenje selekcije za bilješke
            editor.on('selectionchange', handleSelectionChange);
            editor.on('mouseup', handleSelectionChange);
            editor.on('keyup', handleSelectionChange);
            
            // Dodaj i globalni event listener
            editor.on('init', () => {
                const editorDoc = editor.getDoc();
                editorDoc.addEventListener('mouseup', handleSelectionChange);
                editorDoc.addEventListener('keyup', handleSelectionChange);
                editorDoc.addEventListener('selectionchange', handleSelectionChange);
            });
        }
    };

    // Handle editor initialization
    const handleInit = (evt, editor) => {
        editorRef.current = editor;
    };

    // Handle content change
    const handleChange = (content, editor) => {
        onChange({ target: { value: content } });
        updateCounters(content);
    };

    // Funkcija za praćenje selekcije
    const handleSelectionChange = useCallback(() => {
        try {
            // Koristimo native browser selection
            const selection = window.getSelection();
            console.log('Selection change detected:', selection.toString());
            
            if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                // Nema selekcije
                setShowAddNoteButton(false);
                setSelectedText('');
                setSelectionRange(null);
                return;
            }
            
            const selectedContent = selection.toString().trim();
            if (selectedContent.length === 0) {
                setShowAddNoteButton(false);
                setSelectedText('');
                setSelectionRange(null);
                return;
            }
            
            // Provjeri da li je selekcija unutar editora
            if (!editorRef.current) return;
            const editorBody = editorRef.current.getBody();
            const range = selection.getRangeAt(0);
            if (!editorBody.contains(range.commonAncestorContainer)) {
                setShowAddNoteButton(false);
                return;
            }
            
            // Ima valjavnu selekciju
            console.log('Valid selection found:', selectedContent);
            setSelectedText(selectedContent);
            setSelectionRange(range.cloneRange());
            
            // Izračunaj poziciju gumba
            calculateButtonPosition(range);
            setShowAddNoteButton(true);
        } catch (error) {
            console.error('Error in handleSelectionChange:', error);
        }
    }, [calculateButtonPosition]);

    // Funkcija za izračunavanje pozicije gumba
    const calculateButtonPosition = useCallback((range) => {
        if (!editorRef.current) return;
        
        try {
            const editor = editorRef.current;
            const editorContainer = editor.getContainer();
            const editorRect = editorContainer.getBoundingClientRect();
            
            // Koristi native browser selection API
            const selection = window.getSelection();
            if (selection.rangeCount === 0) return;
            
            const clientRect = selection.getRangeAt(0).getBoundingClientRect();
            
            // Izračunaj poziciju relativno prema editoru
            const top = clientRect.top - editorRect.top - 40; // 40px iznad selekcije
            const left = clientRect.left - editorRect.left;
            
            console.log('Button position calculated:', { top, left });
            setNoteButtonPosition({ top, left });
        } catch (error) {
            console.error('Error calculating button position:', error);
        }
    }, []);

    // Funkcija za dobivanje broja linije
    const getLineNumber = useCallback((range) => {
        if (!editorRef.current || !range) return 1;
        
        const editor = editorRef.current;
        const body = editor.getBody();
        const allElements = body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, li');
        
        let lineNumber = 1;
        const startContainer = range.startContainer;
        
        // Pronađi element koji sadrži početak selekcije
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

    // Funkcija za kreiranje bilješke iz selekcije
    const handleCreateNoteFromSelection = useCallback(() => {
        if (!selectedText || !selectionRange || !thesis || !chapter) return;
        
        setShowNoteForm(true);
        setShowAddNoteButton(false);
    }, [selectedText, selectionRange, thesis, chapter]);

    // Funkcija za spremanje bilješke
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
            
            await notesAPI.createNote(noteData);
            
            // Resetiraj form
            setNewNoteDescription('');
            setShowNoteForm(false);
            setShowAddNoteButton(false);
            setSelectedText('');
            setSelectionRange(null);
            
            // Obavijesti korisnika
            alert('Bilješka je uspješno dodana!');
            
        } catch (error) {
            console.error('Error creating note:', error);
            alert('Greška pri kreiranju bilješke');
        }
    }, [newNoteDescription, selectedText, selectionRange, thesis, chapter, user, getLineNumber]);

    // Ažuriranje brojača elemenata
    const updateCounters = useCallback((content) => {
        if (!content) return;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        
        const tables = tempDiv.querySelectorAll('table').length;
        const figures = tempDiv.querySelectorAll('figure').length;
        const equations = tempDiv.querySelectorAll('[data-equation]').length;
        
        setCounters({ tables, figures, graphs: 0, equations });
    }, []);

    // Dodavanje tablice s automatskom numeracijom
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
                            <td>Ćelija 1</td>
                            <td>Ćelija 2</td>
                            <td>Ćelija 3</td>
                        </tr>
                        <tr>
                            <td>Ćelija 4</td>
                            <td>Ćelija 5</td>
                            <td>Ćelija 6</td>
                        </tr>
                    </tbody>
                </table>
                <p>&nbsp;</p>
            `;
            
            editor.insertContent(tableHtml);
            setCounters(prev => ({ ...prev, tables: prev.tables + 1 }));
        }
    }, [generateChapterPrefix, counters.tables]);

    // Dodavanje slike s automatskom numeracijom
    const insertFigure = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                if (result.success && editorRef.current) {
                    const editor = editorRef.current;
                    const chapterPrefix = generateChapterPrefix();
                    const figureNumber = counters.figures + 1;
                    
                    const figureHtml = `
                        <figure>
                            <img src="${result.url}" alt="Slika ${chapterPrefix}.${figureNumber}" style="max-width: 100%; height: auto;">
                            <figcaption><strong>Slika ${chapterPrefix}.${figureNumber}.</strong> Opis slike</figcaption>
                        </figure>
                        <p>&nbsp;</p>
                    `;
                    
                    editor.insertContent(figureHtml);
                    setCounters(prev => ({ ...prev, figures: prev.figures + 1 }));
                }
            } catch (error) {
                console.error('Error uploading image:', error);
            }
        };
        input.click();
    }, [generateChapterPrefix, counters.figures]);

    // Dodavanje jednadžbe
    const insertEquation = useCallback(() => {
        if (editorRef.current) {
            const editor = editorRef.current;
            const chapterPrefix = generateChapterPrefix();
            const equationNumber = counters.equations + 1;
            
            const equationHtml = `
                <p style="text-align: center;" data-equation="${chapterPrefix}.${equationNumber}">
                    <em>E = mc²</em> &nbsp;&nbsp;&nbsp;&nbsp; (${chapterPrefix}.${equationNumber})
                </p>
                <p>&nbsp;</p>
            `;
            
            editor.insertContent(equationHtml);
            setCounters(prev => ({ ...prev, equations: prev.equations + 1 }));
        }
    }, [generateChapterPrefix, counters.equations]);

    // Inicijalizacija brojača
    useEffect(() => {
        if (value) {
            updateCounters(value);
        }
    }, [value, updateCounters]);

    const isReadOnly = disabled;

    return (
        <div className="scientific-editor">
            {!isReadOnly && (
                <div className="editor-controls">
                    <div className="element-toolbar">
                        <button onClick={insertTable} className="control-btn">
                            📊 Tablica
                        </button>
                        <button onClick={insertFigure} className="control-btn">
                            🖼️ Slika
                        </button>
                        <button onClick={insertEquation} className="control-btn">
                            📐 Jednadžba
                        </button>
                    </div>
                    <div className="element-counters">
                        <span>Tablice: {counters.tables}</span>
                        <span>Slike: {counters.figures}</span>
                        <span>Jednadžbe: {counters.equations}</span>
                    </div>
                </div>
            )}
            
            <div className="editor-container">
                <Editor
                    tinymceScriptSrc="https://cdn.tiny.cloud/1/z62828asb7sazqtp5t7jxtnul56kzuwkgap3xqrwh0hbes1p/tinymce/6/tinymce.min.js"
                    onInit={handleInit}
                    value={value || ''}
                    onEditorChange={handleChange}
                    init={editorConfig}
                    disabled={isReadOnly}
                />
                
                {/* Gumb za dodavanje bilješke iz selekcije */}
                {showAddNoteButton && (
                    <div 
                        className="add-note-button"
                        style={{
                            position: 'absolute',
                            top: noteButtonPosition.top + 'px',
                            left: noteButtonPosition.left + 'px',
                            zIndex: 10000
                        }}
                    >
                        <button 
                            className="selection-note-btn"
                            onClick={handleCreateNoteFromSelection}
                            title="Dodaj bilješku za selektirani tekst"
                        >
                            <img src="/icons/quote.png" alt="Quote" className="quote-icon" />
                            Dodaj bilješku
                        </button>
                    </div>
                )}
                
                {/* Form za kreiranje bilješke */}
                {showNoteForm && (
                    <div className="note-form-overlay" onClick={() => setShowNoteForm(false)}>
                        <div className="note-form-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="note-form-header">
                                <h3>Dodaj bilješku</h3>
                                <button 
                                    className="close-btn"
                                    onClick={() => setShowNoteForm(false)}
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
                                        Spremi bilješku
                                    </button>
                                    <button 
                                        className="cancel-note-btn"
                                        onClick={() => setShowNoteForm(false)}
                                    >
                                        Odustani
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScientificEditor;

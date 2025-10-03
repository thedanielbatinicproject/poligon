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
    
    // TinyMCE API ključ state
    const [tinymceApiKey, setTinymceApiKey] = useState('');
    
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
        // API ključ iz environment variable
        apiKey: tinymceApiKey,
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
                
                // Praćenje selekcije za bilješke - TinyMCE specifični eventi
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
        // Samo u VIEW režimu
        if (mode !== 'VIEW') {
            return;
        }
        
        try {
            // Prvo pokušaj TinyMCE selekciju
            let selectedContent = '';
            let range = null;
            
            if (editorRef.current) {
                const editor = editorRef.current;
                const editorSel = editor.selection;
                
                // Pokušaj dobiti selekciju iz TinyMCE
                selectedContent = editorSel.getContent({ format: 'text' }).trim();
                
                if (selectedContent) {
                    range = editorSel.getRng();
                }
            }
            
            // Ako TinyMCE selekcija ne radi, pokušaj window.getSelection
            if (!selectedContent) {
                const selection = window.getSelection();
                
                if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
                    selectedContent = selection.toString().trim();
                    range = selection.getRangeAt(0);
                }
            }
            
            // Ako ni jedno ne radi, pokušaj direktno iz DOM-a
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
                return;
            }
            
            // Provjeri da li je selekcija unutar editora
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
            
            // Ima validnu selekciju
            setSelectedText(selectedContent);
            setSelectionRange(range);
            
            // Izračunaj poziciju gumba
            calculateButtonPosition(range);
            setShowAddNoteButton(true);
        } catch (error) {
            // Tiho upravljanje greškama
            setShowAddNoteButton(false);
        }
    }, [calculateButtonPosition, mode]);

    // Funkcija za izračunavanje pozicije gumba
    const calculateButtonPosition = useCallback((range) => {
        if (!editorRef.current) {
            return;
        }
        
        try {
            const editor = editorRef.current;
            let clientRect;
            
            // Dobij iframe poziciju
            const editorBody = editor.getBody();
            const editorDoc = editor.getDoc();
            const editorContainer = editor.getContainer();
            const iframe = editorContainer.querySelector('iframe');
            
            let iframeRect = { top: 0, left: 0 };
            if (iframe) {
                iframeRect = iframe.getBoundingClientRect();
            }
            
            // Pokušaj TinyMCE selekciju
            const currentSelection = editor.selection;
            const currentRange = currentSelection.getRng();
            
            if (currentRange && currentRange.getBoundingClientRect) {
                const rangeRect = currentRange.getBoundingClientRect();
                
                // Dodaj iframe offset
                clientRect = {
                    top: rangeRect.top + iframeRect.top,
                    left: rangeRect.left + iframeRect.left,
                    bottom: rangeRect.bottom + iframeRect.top,
                    right: rangeRect.right + iframeRect.left,
                    width: rangeRect.width,
                    height: rangeRect.height
                };
            } else {
                const windowSelection = window.getSelection();
                if (windowSelection.rangeCount === 0) {
                    return;
                }
                clientRect = windowSelection.getRangeAt(0).getBoundingClientRect();
            }
            
            // Provjeri da li je selekcija validna
            if (!clientRect || clientRect.width === 0 || clientRect.height === 0) {
                return;
            }
            
            // Izračunaj poziciju iznad selekcije (relativno prema viewportu)
            const buttonHeight = 40; // Procjena visine gumba
            const margin = 10; // Margina između gumba i selekcije
            
            let top = clientRect.top - buttonHeight - margin;
            let left = clientRect.left;
            
            // Osiguraj da gumb ne izađe izvan viewporta
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };
            
            // Ako je gumb previsoko, stavi ga ispod selekcije
            if (top < 0) {
                top = clientRect.bottom + margin;
            }
            
            // Osiguraj da gumb ne izađe lijevo ili desno
            const buttonWidth = 150; // Procjena širine gumba
            if (left + buttonWidth > viewport.width) {
                left = viewport.width - buttonWidth - 10;
            }
            if (left < 0) {
                left = 10;
            }
            
            setNoteButtonPosition({ top, left });
        } catch (error) {
            // Tiho upravljanje greškama
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
        
        // Pošalji CustomEvent da se notes panel otvori ako je zatvoren
        window.dispatchEvent(new CustomEvent('openNoteForm', {
            detail: { 
                selectedText,
                lineNumber: getLineNumber(selectionRange)
            }
        }));
        
        // Zabrani scrollanje
        document.body.style.overflow = 'hidden';
        
        setShowNoteForm(true);
        setShowAddNoteButton(false);
    }, [selectedText, selectionRange, thesis, chapter, getLineNumber]);

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
            
            const response = await notesAPI.createNote(noteData);
            
            // Resetiraj form
            setNewNoteDescription('');
            setShowNoteForm(false);
            setShowAddNoteButton(false);
            setSelectedText('');
            setSelectionRange(null);
            
            // Vrati scrollanje
            document.body.style.overflow = 'auto';
            
            // Obavijesti NotesPanel da se učitaju nove bilješke
            window.dispatchEvent(new CustomEvent('noteCreated', {
                detail: { 
                    note: response.data,
                    thesisId: thesis.id,
                    chapterId: chapter.id
                }
            }));
            
            // Obavijesti korisnika pomoću TinyMCE notification sustava
            if (editorRef.current) {
                editorRef.current.notificationManager.open({
                    text: 'Bilješka je uspješno dodana!',
                    type: 'success',
                    timeout: 3000
                });
            }
            
        } catch (error) {
            // Obavijesti o grešci pomoću TinyMCE notification sustava
            if (editorRef.current) {
                editorRef.current.notificationManager.open({
                    text: 'Greška pri kreiranju bilješke',
                    type: 'error',
                    timeout: 4000
                });
            }
        }
    }, [newNoteDescription, selectedText, selectionRange, thesis, chapter, user, getLineNumber]);

    // Funkcija za zatvaranje forme
    const handleCloseNoteForm = useCallback(() => {
        setShowNoteForm(false);
        setNewNoteDescription('');
        // Vrati scrollanje
        document.body.style.overflow = 'auto';
    }, []);

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

    // Dohvaćanje TinyMCE API ključa
    useEffect(() => {
        const fetchTinyMCEConfig = async () => {
            try {
                const response = await fetch('/api/tinymce-config');
                if (response.ok) {
                    const config = await response.json();
                    setTinymceApiKey(config.apiKey || '');
                }
            } catch (error) {
                console.error('Error fetching TinyMCE config:', error);
                // Fallback to empty string if fetch fails
                setTinymceApiKey('');
            }
        };

        fetchTinyMCEConfig();
    }, []);

    // Inicijalizacija brojača
    useEffect(() => {
        if (value) {
            updateCounters(value);
        }
    }, [value, updateCounters]);

    // Global event listeners za selekciju
    useEffect(() => {
        const globalSelectionHandler = () => {
            if (mode === 'VIEW') {
                setTimeout(() => {
                    handleSelectionChange();
                }, 50);
            }
        };
        
        const globalMouseUpHandler = () => {
            if (mode === 'VIEW') {
                setTimeout(() => {
                    handleSelectionChange();
                }, 100);
            }
        };
        
        const globalScrollHandler = () => {
            if (mode === 'VIEW' && showAddNoteButton && selectionRange) {
                calculateButtonPosition(selectionRange);
            }
        };
        
        const globalResizeHandler = () => {
            if (mode === 'VIEW' && showAddNoteButton && selectionRange) {
                calculateButtonPosition(selectionRange);
            }
        };
        
        const notesCollapseHandler = (event) => {
            if (mode === 'VIEW' && showAddNoteButton && selectionRange) {
                // Pronađi notes panel element
                const notesPanel = document.querySelector('.notes-panel');
                if (notesPanel) {
                    // Koristi transitionend event za precizno timing
                    const handleTransitionEnd = (e) => {
                        calculateButtonPosition(selectionRange);
                        notesPanel.removeEventListener('transitionend', handleTransitionEnd);
                    };
                    
                    notesPanel.addEventListener('transitionend', handleTransitionEnd);
                    
                    // Fallback timeout u slučaju da transitionend ne radi
                    setTimeout(() => {
                        calculateButtonPosition(selectionRange);
                        notesPanel.removeEventListener('transitionend', handleTransitionEnd);
                    }, 400); // 400ms fallback
                } else {
                    // Ako nema notes panel elementa, koristi timeout
                    setTimeout(() => {
                        calculateButtonPosition(selectionRange);
                    }, 300);
                }
            }
        };
        
        document.addEventListener('selectionchange', globalSelectionHandler);
        document.addEventListener('mouseup', globalMouseUpHandler);
        window.addEventListener('scroll', globalScrollHandler, true);
        window.addEventListener('resize', globalResizeHandler);
        window.addEventListener('notesCollapsedChange', notesCollapseHandler);
        
        return () => {
            document.removeEventListener('selectionchange', globalSelectionHandler);
            document.removeEventListener('mouseup', globalMouseUpHandler);
            window.removeEventListener('scroll', globalScrollHandler, true);
            window.removeEventListener('resize', globalResizeHandler);
            window.removeEventListener('notesCollapsedChange', notesCollapseHandler);
        };
    }, [mode, handleSelectionChange, showAddNoteButton, selectionRange, calculateButtonPosition]);

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
                {tinymceApiKey ? (
                    <Editor
                        tinymceScriptSrc={`https://cdn.tiny.cloud/1/${tinymceApiKey}/tinymce/6/tinymce.min.js`}
                        onInit={handleInit}
                        value={value || ''}
                        onEditorChange={handleChange}
                        init={editorConfig}
                        disabled={isReadOnly}
                    />
                ) : (
                    <div className="editor-loading">
                        <p>Učitavanje editora...</p>
                    </div>
                )}
                
                {/* Gumb za dodavanje bilješke iz selekcije */}
{/* Floating gumb container - renderira se na vrhu stranice */}
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
                    {/* Selection overlay - prikaži iframe-adjusted selection rect */}
                    {editorRef.current && (() => {
                        let selectionRect = null;
                        try {
                            const editor = editorRef.current;
                            const editorContainer = editor.getContainer();
                            const iframe = editorContainer.querySelector('iframe');
                            
                            let iframeRect = { top: 0, left: 0 };
                            if (iframe) {
                                iframeRect = iframe.getBoundingClientRect();
                            }
                            
                            const currentSelection = editor.selection;
                            const currentRange = currentSelection.getRng();
                            if (currentRange && currentRange.getBoundingClientRect) {
                                const rangeRect = currentRange.getBoundingClientRect();
                                
                                // Iframe-adjusted rect
                                selectionRect = {
                                    top: rangeRect.top + iframeRect.top,
                                    left: rangeRect.left + iframeRect.left,
                                    width: rangeRect.width,
                                    height: rangeRect.height
                                };
                            }
                        } catch (e) {
                            // Tiho upravljanje greškama
                        }
                        
                        if (selectionRect && selectionRect.width > 0 && selectionRect.height > 0) {
                            return (
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
                            );
                        }
                        
                        return null;
                    })()}
                    
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
                            title="Dodaj bilješku za selektirani tekst"
                        >
                            <img src="/icons/quote.png" alt="Quote" className="quote-icon" />
                            Dodaj bilješku
                        </button>
                    </div>
                </div>
            )}
                
                {/* Form za kreiranje bilješke */}
                {showNoteForm && (
                    <div className="note-form-overlay" onClick={handleCloseNoteForm}>
                        <div className="note-form-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="note-form-header">
                                <h3>Dodaj bilješku</h3>
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
                                        Spremi bilješku
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
            </div>
        </div>
    );
};

export default ScientificEditor;

import React, { useRef, useEffect, useState, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
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
    const quillRef = useRef(null);
    const [counters, setCounters] = useState({
        tables: 0,
        figures: 0,
        equations: 0
    });

    // Generiranje brojeva prema hijerarhiji poglavlja
    const generateChapterPrefix = useCallback(() => {
        if (!chapter || !thesis) return '1';
        
        const chapters = thesis.chapters || [];
        const level = chapter.level || 0;
        
        if (level === 0) {
            const mainChapters = chapters.filter(c => (c.level || 0) === 0);
            const index = mainChapters.findIndex(c => c.id === chapter.id);
            return `${index + 1}`;
        } else if (level === 1) {
            const parent = chapters.find(c => c.id === chapter.parentId);
            if (parent) {
                const parentPrefix = generateChapterPrefixForChapter(parent, chapters);
                const siblings = chapters.filter(c => c.parentId === chapter.parentId);
                const index = siblings.findIndex(c => c.id === chapter.id);
                return `${parentPrefix}.${index + 1}`;
            }
        } else if (level === 2) {
            const parent = chapters.find(c => c.id === chapter.parentId);
            if (parent) {
                const grandParent = chapters.find(c => c.id === parent.parentId);
                if (grandParent) {
                    const grandParentPrefix = generateChapterPrefixForChapter(grandParent, chapters);
                    const parentSiblings = chapters.filter(c => c.parentId === grandParent.id);
                    const parentIndex = parentSiblings.findIndex(c => c.id === parent.id);
                    const siblings = chapters.filter(c => c.parentId === chapter.parentId);
                    const index = siblings.findIndex(c => c.id === chapter.id);
                    return `${grandParentPrefix}.${parentIndex + 1}.${index + 1}`;
                }
            }
        }
        
        return '1';
    }, [chapter, thesis]);

    const generateChapterPrefixForChapter = (targetChapter, chapters) => {
        const level = targetChapter.level || 0;
        
        if (level === 0) {
            const mainChapters = chapters.filter(c => (c.level || 0) === 0);
            const index = mainChapters.findIndex(c => c.id === targetChapter.id);
            return `${index + 1}`;
        }
        
        return '1';
    };

    // Dodavanje tablice s automatskom numeracijom
    const insertTable = useCallback(() => {
        if (quillRef.current) {
            const quill = quillRef.current.getEditor();
            const chapterPrefix = generateChapterPrefix();
            const tableNumber = counters.tables + 1;
            const tableId = `table-${chapterPrefix}-${tableNumber}`;
            
            const tableHtml = `
                <div class="scientific-table-container" contenteditable="false">
                    <table id="${tableId}" data-table-number="${chapterPrefix}.${tableNumber}" class="scientific-table">
                        <caption>
                            <strong>Tablica ${chapterPrefix}.${tableNumber}.</strong> 
                            <span contenteditable="true" class="table-caption">Opis tablice</span>
                        </caption>
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
                </div>
                <p><br></p>
            `;
            
            const range = quill.getSelection(true);
            quill.clipboard.dangerouslyPasteHTML(range.index, tableHtml);
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
            if (file) {
                await uploadAndInsertImage(file);
            }
        };
        input.click();
    }, []);

    const uploadAndInsertImage = async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('thesisId', thesis.id);
        formData.append('chapterId', chapter.id);

        try {
            const response = await fetch('/api/upload/image', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                const chapterPrefix = generateChapterPrefix();
                const figureNumber = counters.figures + 1;
                const figureId = `figure-${chapterPrefix}-${figureNumber}`;

                const figureHtml = `
                    <div class="scientific-figure-container" contenteditable="false">
                        <figure id="${figureId}" data-figure-number="${chapterPrefix}.${figureNumber}" class="scientific-figure">
                            <img src="${result.url}" alt="Slika ${chapterPrefix}.${figureNumber}" style="max-width: 100%; height: auto;" />
                            <figcaption>
                                <strong>Slika ${chapterPrefix}.${figureNumber}.</strong> 
                                <span contenteditable="true" class="figure-caption">Opis slike</span>
                            </figcaption>
                        </figure>
                    </div>
                    <p><br></p>
                `;

                if (quillRef.current) {
                    const quill = quillRef.current.getEditor();
                    const range = quill.getSelection(true);
                    quill.clipboard.dangerouslyPasteHTML(range.index, figureHtml);
                    setCounters(prev => ({ ...prev, figures: prev.figures + 1 }));
                }
            } else {
                console.error('Error uploading image');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    };

    // Dodavanje jednadžbe s automatskom numeracijom
    const insertEquation = useCallback(() => {
        if (quillRef.current) {
            const quill = quillRef.current.getEditor();
            const chapterPrefix = generateChapterPrefix();
            const equationNumber = counters.equations + 1;
            const equationId = `equation-${chapterPrefix}-${equationNumber}`;
            
            const equationHtml = `
                <div class="scientific-equation-container" contenteditable="false">
                    <div id="${equationId}" data-equation-number="${chapterPrefix}.${equationNumber}" class="scientific-equation">
                        <div class="equation-content">
                            <span contenteditable="true" class="equation-latex">E = mc²</span>
                        </div>
                        <div class="equation-number">(${chapterPrefix}.${equationNumber})</div>
                    </div>
                </div>
                <p><br></p>
            `;
            
            const range = quill.getSelection(true);
            quill.clipboard.dangerouslyPasteHTML(range.index, equationHtml);
            setCounters(prev => ({ ...prev, equations: prev.equations + 1 }));
        }
    }, [generateChapterPrefix, counters.equations]);

    // Ažuriranje brojača na osnovu sadržaja
    const updateCounters = useCallback((content) => {
        if (!content) return;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        
        const tables = tempDiv.querySelectorAll('table[data-table-number], [data-table-number]').length;
        const figures = tempDiv.querySelectorAll('figure[data-figure-number], [data-figure-number]').length;
        const equations = tempDiv.querySelectorAll('[data-equation-number]').length;
        
        setCounters({ tables, figures, equations });
    }, []);

    // Custom Quill modules
    const modules = {
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                [{ 'align': [] }],
                ['link', 'blockquote', 'code-block'],
                [{ 'color': [] }, { 'background': [] }],
                ['clean']
            ]
        },
        history: {
            delay: 2000,
            maxStack: 500,
            userOnly: true
        }
    };

    const formats = [
        'header', 'bold', 'italic', 'underline', 'strike',
        'list', 'bullet', 'indent', 'align',
        'link', 'blockquote', 'code-block',
        'color', 'background'
    ];

    // Handle content change - simulate event object for compatibility
    const handleChange = (content) => {
        // Create a synthetic event object to match textarea onChange expectations
        const syntheticEvent = {
            target: {
                value: content
            }
        };
        onChange(syntheticEvent);
        updateCounters(content);
    };

    // Inicijalizacija brojača
    useEffect(() => {
        if (value) {
            updateCounters(value);
        }
    }, [value, updateCounters]);

    return (
        <div className="scientific-editor">
            {mode === 'EDIT' && user && (
                <div className="editor-toolbar">
                    <div className="toolbar-section">
                        <button onClick={insertTable} className="toolbar-btn">
                            📊 Tablica
                        </button>
                        <button onClick={insertFigure} className="toolbar-btn">
                            🖼️ Slika
                        </button>
                        <button onClick={insertEquation} className="toolbar-btn">
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
            
            <ReactQuill
                ref={quillRef}
                theme="snow"
                value={value || ''}
                onChange={handleChange}
                readOnly={disabled || !(mode === 'EDIT' && user)}
                modules={modules}
                formats={formats}
                className="quill-scientific-editor"
                placeholder={mode === 'EDIT' && user ? "Počnite pisati sadržaj poglavlja..." : ""}
            />
        </div>
    );
};

export default ScientificEditor;
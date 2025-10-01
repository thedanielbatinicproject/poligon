import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Editor } from '@tinymce/tinymce-react';
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
        readonly: mode === 'VIEW'
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
            </div>
        </div>
    );
};

export default ScientificEditor;

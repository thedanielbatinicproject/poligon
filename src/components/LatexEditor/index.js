import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import './styles.css';
import { HtmlGenerator } from 'latex.js';
import jsPDF from 'jspdf';

const LatexEditor = ({ 
  documentId, 
  initialContent = '', 
  onSave, 
  onAutoSave,
  readOnly = false 
}) => {
  const [latexCode, setLatexCode] = useState(initialContent || getDefaultTemplate());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationError, setCompilationError] = useState(null);
  const editorRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  // Default LaTeX template
  function getDefaultTemplate() {
    return `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[croatian]{babel}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{Naslov diplomskog rada}
\\author{Ime Prezime}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
Ovdje ide sažetak rada...
\\end{abstract}

\\section{Uvod}
Tekst uvoda...

\\subsection{Motivacija}
Opis motivacije...

\\section{Pregled literature}
Pregled postojećih radova...

\\section{Metodologija}
Opis korištenih metoda...

\\section{Rezultati}
Prikaz rezultata...

\\section{Zaključak}
Zaključna razmatranja...

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}`;
  }

  // Update content when prop changes
  useEffect(() => {
    if (initialContent && initialContent !== latexCode) {
      setLatexCode(initialContent);
      setHasUnsavedChanges(false);
    }
  }, [initialContent]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (hasUnsavedChanges && !readOnly) {
      autoSaveTimerRef.current = setTimeout(() => {
        handleAutoSave();
      }, 30000); // 30 seconds
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [latexCode, hasUnsavedChanges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S / Cmd+S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [latexCode]);

  const handleEditorChange = (value) => {
    setLatexCode(value || '');
    setHasUnsavedChanges(true);
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column
      });
    });
  };

  const handleSave = async () => {
    if (!onSave || readOnly) return;

    try {
      await onSave(latexCode, cursorPosition);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Save error:', error);
      alert('Greška pri spremanju dokumenta: ' + error.message);
    }
  };

  const handleAutoSave = async () => {
    if (!onAutoSave || readOnly || !hasUnsavedChanges) return;

    try {
      await onAutoSave(latexCode, cursorPosition);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  };

  const handleCompile = async () => {
    setIsCompiling(true);
    setCompilationError(null);

    try {
      const generator = new HtmlGenerator({ hyphenate: false });
      const doc = generator.parse(latexCode);
      
      const htmlContent = doc.outerHTML || doc.body.outerHTML;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '210mm';
      document.body.appendChild(tempDiv);

      await pdf.html(tempDiv, {
        callback: function(generatedPdf) {
          const filename = `document_${documentId || Date.now()}.pdf`;
          generatedPdf.save(filename);
          document.body.removeChild(tempDiv);
        },
        x: 10,
        y: 10,
        width: 190,
        windowWidth: 794
      });

      setIsCompiling(false);
    } catch (error) {
      console.error('Compilation error:', error);
      setCompilationError(error.message || 'Greška pri kompajliranju');
      setIsCompiling(false);
    }
  };

  const insertTemplate = (template) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    editor.executeEdits('', [{
      range: selection,
      text: template,
      forceMoveMarkers: true
    }]);
  };

  const templates = {
    section: '\\section{}\n',
    subsection: '\\subsection{}\n',
    equation: '\\begin{equation}\n  \n\\end{equation}\n',
    figure: '\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.8\\textwidth]{slika.png}\n  \\caption{Opis slike}\n  \\label{fig:label}\n\\end{figure}\n',
    table: '\\begin{table}[h]\n  \\centering\n  \\begin{tabular}{|c|c|}\n    \\hline\n    Zaglavlje 1 & Zaglavlje 2 \\\\\n    \\hline\n    Vrijednost 1 & Vrijednost 2 \\\\\n    \\hline\n  \\end{tabular}\n  \\caption{Opis tablice}\n  \\label{tab:label}\n\\end{table}\n',
    itemize: '\\begin{itemize}\n  \\item \n\\end{itemize}\n',
    enumerate: '\\begin{enumerate}\n  \\item \n\\end{enumerate}\n',
  };

  // Simple LaTeX to HTML preview (basic implementation)
  const renderPreview = () => {
    // For MVP, show raw LaTeX with syntax highlighting
    // TODO: Implement proper LaTeX → HTML conversion
    const lines = latexCode.split('\n');
    
    return (
      <div className="preview-content">
        <h3>📄 LaTeX Preview</h3>
        <p className="preview-notice">
          Puna renderizacija preview-a dolazi uskoro. Trenutno prikazuje osnovnu strukturu.
        </p>
        <div className="latex-preview">
          {lines.map((line, idx) => {
            const trimmed = line.trim();
            
            // Detect sections
            if (trimmed.startsWith('\\title{')) {
              const title = trimmed.match(/\\title\{(.+?)\}/)?.[1];
              return <h1 key={idx} className="preview-title">{title}</h1>;
            }
            if (trimmed.startsWith('\\author{')) {
              const author = trimmed.match(/\\author\{(.+?)\}/)?.[1];
              return <p key={idx} className="preview-author">{author}</p>;
            }
            if (trimmed.startsWith('\\section{')) {
              const section = trimmed.match(/\\section\{(.+?)\}/)?.[1];
              return <h2 key={idx} className="preview-section">{section}</h2>;
            }
            if (trimmed.startsWith('\\subsection{')) {
              const subsection = trimmed.match(/\\subsection\{(.+?)\}/)?.[1];
              return <h3 key={idx} className="preview-subsection">{subsection}</h3>;
            }
            
            // Regular text
            if (trimmed && !trimmed.startsWith('\\') && !trimmed.startsWith('%')) {
              return <p key={idx} className="preview-text">{line}</p>;
            }
            
            return null;
          })}
        </div>
      </div>
    );
  };

  const formatLastSaved = () => {
    if (!lastSaved) return 'Nikad';
    const now = new Date();
    const diff = Math.floor((now - lastSaved) / 1000);
    
    if (diff < 60) return `Prije ${diff}s`;
    if (diff < 3600) return `Prije ${Math.floor(diff / 60)}min`;
    return lastSaved.toLocaleTimeString('hr-HR');
  };

  return (
    <div className="latex-editor-container">
      {/* Toolbar */}
      <div className="latex-toolbar">
        <div className="toolbar-left">
          <button 
            className="btn-save" 
            onClick={handleSave}
            disabled={!hasUnsavedChanges || readOnly}
            title="Spremi (Ctrl+S)"
          >
            Spremi
          </button>
          <button 
            className="btn-compile" 
            onClick={handleCompile}
            disabled={readOnly || isCompiling}
            title="Generiraj PDF"
          >
            {isCompiling ? 'Kompajliranje...' : 'Generiraj PDF'}
          </button>
          {compilationError && (
            <span className="compilation-error" title={compilationError}>
              Greška kompajliranja
            </span>
          )}
          <span className="save-status">
            {hasUnsavedChanges ? (
              <span className="unsaved">Nespremljene promjene</span>
            ) : (
              <span className="saved">Spremljeno {formatLastSaved()}</span>
            )}
          </span>
        </div>
        
        <div className="toolbar-right">
          <span className="cursor-position">
            Linija {cursorPosition.line}, Stupac {cursorPosition.column}
          </span>
        </div>
      </div>

      {/* Insert Templates */}
      <div className="template-bar">
        <span className="template-label">Umetni:</span>
        <button onClick={() => insertTemplate(templates.section)}>Section</button>
        <button onClick={() => insertTemplate(templates.subsection)}>Subsection</button>
        <button onClick={() => insertTemplate(templates.equation)}>Jednadžba</button>
        <button onClick={() => insertTemplate(templates.figure)}>Slika</button>
        <button onClick={() => insertTemplate(templates.table)}>Tablica</button>
        <button onClick={() => insertTemplate(templates.itemize)}>Lista</button>
        <button onClick={() => insertTemplate(templates.enumerate)}>Numerirana lista</button>
      </div>

      {/* Split-screen: Editor + Preview */}
      <div className="split-view">
        {/* Left: Monaco Editor */}
        <div className="editor-pane">
          <Editor
            height="calc(100vh - 250px)"
            language="latex"
            theme="vs-dark"
            value={latexCode}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            options={{
              fontSize: 14,
              wordWrap: 'on',
              minimap: { enabled: true },
              lineNumbers: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              readOnly: readOnly,
              tabSize: 2,
              insertSpaces: true,
            }}
          />
        </div>

        {/* Right: Preview */}
        <div className="preview-pane">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

export default LatexEditor;

import React from 'react';
import LatexEditor from '../LatexEditor';
import './ScientificEditor.css';

const ScientificEditor = ({ 
    value, 
    onChange, 
    document,
    documentId,
    user,
    disabled = false,
    onSave,
    onAutoSave
}) => {
    
    const handleSave = async (latexContent, cursorPosition) => {
        if (onChange) {
            onChange(latexContent);
        }
        
        if (onSave) {
            await onSave({
                content: latexContent,
                cursorPosition,
                documentId
            });
        }
    };

    const handleAutoSave = async (latexContent, cursorPosition) => {
        if (onAutoSave) {
            await onAutoSave({
                content: latexContent,
                cursorPosition,
                documentId
            });
        }
    };

    return (
        <div className='scientific-editor-wrapper'>
            <LatexEditor
                documentId={documentId}
                initialContent={value}
                onSave={handleSave}
                onAutoSave={handleAutoSave}
                readOnly={disabled}
            />
        </div>
    );
};

export default ScientificEditor;

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableChapterItem = ({
    id,
    chapter,
    level,
    isSelected,
    isExpanded,
    hasChildren,
    onSelect,
    onToggleExpanded,
    onAddChild,
    onDelete,
    mode
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
        }
    };

    const getChapterNumber = (chapter, level) => {
        // Simple numbering - could be enhanced based on hierarchy
        return `${level + 1}.${chapter.order + 1}`;
    };

    const getWordCount = (content) => {
        if (!content) return 0;
        const text = content.replace(/<[^>]*>/g, ''); // Strip HTML
        return text.split(/\s+/).filter(word => word.length > 0).length;
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`chapter-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
            {...attributes}
        >
            <div 
                className="chapter-content"
                style={{ paddingLeft: `${level * 20}px` }}
                onClick={onSelect}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
            >
                {/* Drag handle - only in EDIT mode */}
                {mode === 'EDIT' && (
                    <div 
                        className="drag-handle"
                        {...listeners}
                        title="Povuci za pomicanje"
                    >
                        ⋮⋮
                    </div>
                )}

                {/* Expand/collapse button */}
                {hasChildren && (
                    <button
                        className={`expand-btn ${isExpanded ? 'expanded' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpanded();
                        }}
                        title={isExpanded ? 'Zatvori' : 'Otvori'}
                    >
                        ▶
                    </button>
                )}

                {/* Chapter number */}
                <span className="chapter-number">
                    {getChapterNumber(chapter, level)}
                </span>

                {/* Chapter title */}
                <span className="chapter-title">
                    {chapter.title || 'Naslov poglavlja'}
                </span>

                {/* Word count */}
                <span className="word-count">
                    {getWordCount(chapter.content)} riječi
                </span>

                {/* Action buttons - only in EDIT mode */}
                {mode === 'EDIT' && (
                    <div className="chapter-actions">
                        {onAddChild && (
                            <button
                                className="action-btn add-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddChild();
                                }}
                                title="Dodaj podpoglavlje"
                            >
                                +
                            </button>
                        )}
                        
                        {onDelete && (
                            <button
                                className="action-btn delete-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                title="Obriši poglavlje"
                            >
                                ×
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Chapter status indicators */}
            <div className="chapter-status">
                {chapter.updated && (
                    <span 
                        className="last-updated"
                        title={`Zadnje ažuriranje: ${new Date(chapter.updated).toLocaleString('hr-HR')}`}
                    >
                        {new Date(chapter.updated).toLocaleDateString('hr-HR')}
                    </span>
                )}
                
                {chapter.content && chapter.content.length > 0 && (
                    <span className="has-content" title="Poglavlje ima sadržaj">
                        ●
                    </span>
                )}
            </div>
        </div>
    );
};

export default SortableChapterItem;
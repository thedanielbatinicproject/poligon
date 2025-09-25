import React, { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableChapterItem from './SortableChapterItem';
import './ChapterTree.css';

const ChapterTree = ({ 
    chapters, 
    selectedChapter, 
    onChapterSelect, 
    onAddChapter, 
    onDeleteChapter,
    onMoveChapter,
    mode 
}) => {
    const [expandedChapters, setExpandedChapters] = useState(new Set());
    
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const toggleExpanded = (chapterId) => {
        const newExpanded = new Set(expandedChapters);
        if (newExpanded.has(chapterId)) {
            newExpanded.delete(chapterId);
        } else {
            newExpanded.add(chapterId);
        }
        setExpandedChapters(newExpanded);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            // Handle reordering logic
            if (onMoveChapter) {
                onMoveChapter(active.id, over.id);
            }
        }
    };

    const renderChapter = (chapter, level = 0) => {
        const isExpanded = expandedChapters.has(chapter.id);
        const hasChildren = chapter.children && chapter.children.length > 0;
        const isSelected = selectedChapter && selectedChapter.id === chapter.id;

        return (
            <div key={chapter.id} className="chapter-item-container">
                <SortableChapterItem
                    id={chapter.id}
                    chapter={chapter}
                    level={level}
                    isSelected={isSelected}
                    isExpanded={isExpanded}
                    hasChildren={hasChildren}
                    onSelect={() => onChapterSelect(chapter)}
                    onToggleExpanded={() => toggleExpanded(chapter.id)}
                    onAddChild={mode === 'EDIT' ? () => onAddChapter(chapter.id) : null}
                    onDelete={mode === 'EDIT' ? () => onDeleteChapter(chapter.id) : null}
                    mode={mode}
                />

                {hasChildren && isExpanded && (
                    <div className="chapter-children">
                        <SortableContext 
                            items={chapter.children}
                            strategy={verticalListSortingStrategy}
                        >
                            {chapter.children.map(child => 
                                renderChapter(child, level + 1)
                            )}
                        </SortableContext>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="chapter-tree">
            <div className="tree-header">
                <h3>Struktura dokumenta</h3>
                {mode === 'EDIT' && (
                    <button 
                        className="add-chapter-btn"
                        onClick={() => onAddChapter()}
                        title="Dodaj glavno poglavlje"
                    >
                        + Poglavlje
                    </button>
                )}
            </div>

            <div className="tree-content">
                {chapters.length === 0 ? (
                    <div className="empty-tree">
                        <p>Nema poglavlja</p>
                        {mode === 'EDIT' && (
                            <button 
                                className="primary-btn"
                                onClick={() => onAddChapter()}
                            >
                                Dodaj prvo poglavlje
                            </button>
                        )}
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext 
                            items={chapters}
                            strategy={verticalListSortingStrategy}
                        >
                            {chapters.map(chapter => renderChapter(chapter))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            <div className="tree-stats">
                <div className="stat-item">
                    <span className="stat-label">Ukupno poglavlja:</span>
                    <span className="stat-value">{chapters.length}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Dubina:</span>
                    <span className="stat-value">
                        {chapters.length > 0 ? getMaxDepth(chapters) : 0}
                    </span>
                </div>
            </div>
        </div>
    );
};

const getMaxDepth = (chapters, currentDepth = 1) => {
    let maxDepth = currentDepth;
    
    chapters.forEach(chapter => {
        if (chapter.children && chapter.children.length > 0) {
            const childDepth = getMaxDepth(chapter.children, currentDepth + 1);
            maxDepth = Math.max(maxDepth, childDepth);
        }
    });
    
    return maxDepth;
};

export default ChapterTree;
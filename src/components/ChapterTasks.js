import React, { useState, useEffect } from 'react';
import './ChapterTasks.css';

const ChapterTasks = ({ documentId, chapterId, chapterTitle, user, isAuthenticated }) => {
    const [tasks, setTasks] = useState([]);
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(null);

    useEffect(() => {
        if (documentId && chapterId) {
            loadChapterTasks();
        }
    }, [documentId, chapterId]);

    const loadChapterTasks = async () => {
        try {
            setLoading(true);
            
            
            const tasksResponse = await fetch('/api/tasks');
            if (tasksResponse.ok) {
                const tasksResult = await tasksResponse.json();
                
                const chapterTasks = tasksResult.filter(task => 
                    task.documentId === documentId && 
                    task.chapterId === chapterId &&
                    !task.isFinished
                );
                setTasks(chapterTasks);
            }

            
            const todosResponse = await fetch('/api/todos');
            if (todosResponse.ok) {
                const todosResult = await todosResponse.json();
                
                const chapterTodos = todosResult.filter(todo => 
                    todo.documentId === documentId && 
                    todo.chapterId === chapterId &&
                    !todo.isFinished
                );
                setTodos(chapterTodos);
            }
        } catch (error) {
            } finally {
            setLoading(false);
        }
    };

    const canToggleItem = (item) => {
        if (item.type === 'task') {
            
            return isAuthenticated && user;
        } else {
            
            
            if (isAuthenticated && user) {
                return true; 
            } else {
                
                return item.createdBy === 'Anonymous';
            }
        }
    };

    const showConfirmDialog = (item) => {
        setConfirmDialog({
            item: item,
            message: `Želite li označiti "${item.title}" kao završeno?`,
            onConfirm: () => performToggleFinished(item),
            onCancel: () => setConfirmDialog(null)
        });
    };

    const performToggleFinished = async (item) => {
        setConfirmDialog(null);
        
        try {
            const endpoint = item.type === 'task' 
                ? `/api/tasks/${item.id}/toggle-finished`
                : `/api/todos/${item.id}/toggle-finished`;
            
            const response = await fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    
                    if (item.type === 'task') {
                        setTasks(prevTasks => prevTasks.filter(task => task.id !== item.id));
                    } else {
                        setTodos(prevTodos => prevTodos.filter(todo => todo.id !== item.id));
                    }
                }
            }
        } catch (error) {
            }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString('hr-HR');
        } catch {
            return dateString;
        }
    };

    const allItems = [...tasks.map(t => ({...t, type: 'task'})), ...todos.map(t => ({...t, type: 'todo'}))];
    
    if (loading) {
        return (
            <div className="chapter-tasks loading">
                <div className="loading-text">Učitavaju se zadatci poglavlja...</div>
            </div>
        );
    }

    if (allItems.length === 0) {
        return null; 
    }

    return (
        <div className="chapter-tasks">
            <div className="chapter-tasks-header" onClick={() => setIsCollapsed(!isCollapsed)}>
                <h3>
                    <img src="/icons/task-list.png" alt="Task List" className="task-icon" />
                    Zadatci za poglavlje: {chapterTitle} ({allItems.length})
                </h3>
                <button className="collapse-toggle">
                    {isCollapsed ? '▼' : '▲'}
                </button>
            </div>
            
            {!isCollapsed && (
                <div className="chapter-tasks-content">
                    {allItems.map((item) => (
                        <div key={item.id} className={`task-item ${item.isFinished ? 'finished' : ''} ${item.type}`}>
                            <div className="task-info">
                                <div className="task-header">
                                    <span className="task-type-badge">{item.type === 'task' ? 'Task' : 'Todo'}</span>
                                    <span className="task-title">{item.title}</span>
                                </div>
                                {item.description && (
                                    <div className="task-description">{item.description}</div>
                                )}
                                {(item.dueDate || item.deadline) && (
                                    <div className="task-deadline">
                                        <span className="deadline-icon">📅</span>
                                        {formatDate(item.dueDate || item.deadline)}
                                    </div>
                                )}
                                <div className="task-meta">
                                    <span className="created-by">
                                        By: {
                                            item.createdBy || 
                                            (item.type === 'task' ? (user?.username || 'User') : 'Anonymous')
                                        }
                                    </span>
                                </div>
                            </div>
                            
                            <div className="task-actions">
                                {canToggleItem(item) ? (
                                    <button
                                        className="toggle-btn active"
                                        onClick={() => showConfirmDialog(item)}
                                        title="Označi kao završeno"
                                    >
                                        <img src="/icons/finish.png" alt="Finish" className="btn-icon" />
                                    </button>
                                ) : (
                                    <span className="no-permission" title="Nemate dozvolu za završavanje">🔒</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {confirmDialog && (
                <div className="confirm-dialog-overlay">
                    <div className="confirm-dialog">
                        <div className="confirm-dialog-header">
                            <h4>Potvrda završavanja</h4>
                        </div>
                        <div className="confirm-dialog-content">
                            <p>{confirmDialog.message}</p>
                        </div>
                        <div className="confirm-dialog-actions">
                            <button 
                                className="confirm-btn"
                                onClick={confirmDialog.onConfirm}
                            >
                                Da, završi
                            </button>
                            <button 
                                className="cancel-btn"
                                onClick={confirmDialog.onCancel}
                            >
                                Odustani
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChapterTasks;
import React, { useState, useEffect } from 'react';
import './DocumentTasks.css';

const DocumentTasks = ({ documentId, user, isAuthenticated }) => {
    const [tasks, setTasks] = useState([]);
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        if (documentId) {
            loadUsers();
            loadDocumentTasks();
        }
    }, [documentId]);

    const loadUsers = async () => {
        try {
            const response = await fetch('/api/users/public');
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setUsers(result.data);
                }
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    };

    const getUsernameById = (userId) => {
        if (!userId) return 'Unknown';
        if (userId === 'Anonymous') return 'Anonymous';
        
        const foundUser = users.find(u => u.id === userId);
        return foundUser ? foundUser.username : userId;
    };

    const loadDocumentTasks = async () => {
        try {
            setLoading(true);
            
            
            
            const tasksResponse = await fetch('/api/tasks');
            if (tasksResponse.ok) {
                const tasksResult = await tasksResponse.json();
                
                const documentTasks = tasksResult.filter(task => 
                    task.documentId === documentId && 
                    (!task.chapterId || task.chapterId === '') &&
                    !task.isFinished
                );
                setTasks(documentTasks);
            }

            
            
            const todosResponse = await fetch('/api/todos');
            if (todosResponse.ok) {
                const todosResult = await todosResponse.json();
                
                const documentTodos = todosResult.filter(todo => 
                    todo.documentId === documentId && 
                    (!todo.chapterId || todo.chapterId === '') &&
                    !todo.isFinished
                );
                setTodos(documentTodos);
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
            <div className="document-tasks loading">
                <div className="loading-text">Učitavaju se taskovi...</div>
            </div>
        );
    }

    if (allItems.length === 0) {
        return (
            <div className="document-tasks">
                <div className="document-tasks-header">
                    <h3>
                        <span className="task-icon">📋</span>
                        Document Tasks & Todos (0)
                    </h3>
                </div>
                <div className="document-tasks-content">
                    <div className="no-tasks">Nema zadataka za dokument</div>
                </div>
            </div>
        ); 
    }

    return (
        <div className="document-tasks">
            <div className="document-tasks-header" onClick={() => setIsCollapsed(!isCollapsed)}>
                <h3>
                    <img src="/icons/tasks.png" alt="Tasks" className="task-icon" />
                    Zadatci za dokument ({allItems.length})
                </h3>
                <button className="collapse-toggle">
                    {isCollapsed ? '▼' : '▲'}
                </button>
            </div>
            
            {!isCollapsed && (
                <div className="document-tasks-content">
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
                                        By: {getUsernameById(item.createdBy)}
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

export default DocumentTasks;
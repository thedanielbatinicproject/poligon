import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './TasksTodos.css';

// Postavka lokalizera za moment.js
const localizer = momentLocalizer(moment);

const TasksTodos = ({ user, isAuthenticated }) => {
    const [tasks, setTasks] = useState([]);
    const [todos, setTodos] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [selectedDocuments, setSelectedDocuments] = useState([]);
    const [documentSearch, setDocumentSearch] = useState('');
    const [availableChapters, setAvailableChapters] = useState([]);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [showTodoForm, setShowTodoForm] = useState(false);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [upcomingItems, setUpcomingItems] = useState([]);
    const [visibleItems, setVisibleItems] = useState(5);
    
    // Custom confirmation dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmItem, setConfirmItem] = useState(null);
    
    // Custom notification state
    const [notification, setNotification] = useState(null);

    // Form state za tasks
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        documentId: '',
        chapterId: '',
        dueDate: ''
    });

    // Form state za todos
    const [todoForm, setTodoForm] = useState({
        title: '',
        description: '',
        documentId: '',
        chapterId: '',
        dueDate: ''
    });

    useEffect(() => {
        loadTasks();
        loadTodos();
        loadDocuments();
    }, []);

    useEffect(() => {
        // Ažuriranje kalendar događaja i nadolazećih stavki kad se promijene tasks/todos ili filtri
        updateCalendarEvents();
        updateUpcomingItems();
    }, [tasks, todos, selectedDocuments]);



    const loadTasks = async () => {
        try {
            const response = await fetch('/api/tasks');
            if (response.ok) {
                const data = await response.json();
                setTasks(data);
            }
        } catch (error) {
            console.error('Greška pri učitavanju taskova:', error);
        }
    };

    const loadTodos = async () => {
        try {
            const response = await fetch('/api/todos');
            if (response.ok) {
                const data = await response.json();
                setTodos(data);
            }
        } catch (error) {
            console.error('Greška pri učitavanju todova:', error);
        }
    };

    const loadDocuments = async () => {
        try {
            const response = await fetch('/api/theses');
            if (response.ok) {
                const data = await response.json();
                // API vraća direktno array, ne objekt s data svojstvom
                const documentsArray = Array.isArray(data) ? data : (data.data || []);
                setDocuments(documentsArray);
            }
        } catch (error) {
            console.error('Greška pri učitavanju dokumenata:', error);
        }
    };

    const loadChapters = async (documentId) => {
        if (!documentId) {
            setAvailableChapters([]);
            return;
        }

        try {
            const response = await fetch(`/api/chapters/${documentId}`);
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setAvailableChapters(result.data);
                } else {
                    setAvailableChapters([]);
                }
            } else {
                setAvailableChapters([]);
            }
        } catch (error) {
            console.error('Greška pri učitavanju poglavlja:', error);
            setAvailableChapters([]);
        }
    };

    const updateCalendarEvents = () => {
        const allItems = [...tasks, ...todos];
        const filteredItems = selectedDocuments.length > 0 
            ? allItems.filter(item => 
                selectedDocuments.includes(item.documentId) || 
                (!item.documentId && selectedDocuments.includes('global'))
            )
            : allItems;

        const events = filteredItems
            .filter(item => item.dueDate)
            .map(item => ({
                id: `${item.type}-${item.id}`,
                title: `${item.type.toUpperCase()}: ${item.title}`,
                start: new Date(item.dueDate),
                end: new Date(item.dueDate),
                resource: item
            }));

        setCalendarEvents(events);
    };

    const updateUpcomingItems = () => {
        const allItems = [...tasks, ...todos];
        const filteredItems = selectedDocuments.length > 0 
            ? allItems.filter(item => 
                selectedDocuments.includes(item.documentId) || 
                (!item.documentId && selectedDocuments.includes('global'))
            )
            : allItems;

        // Sortiranje po due date, prvo oni bez datuma
        const sortedItems = filteredItems.sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });

        setUpcomingItems(sortedItems);
    };

    const handleDocumentToggle = (docId) => {
        setSelectedDocuments(prev => 
            prev.includes(docId) 
                ? prev.filter(id => id !== docId)
                : [...prev, docId]
        );
    };

    const filteredDocuments = documents.filter(doc => 
        doc.metadata?.title?.toLowerCase().includes(documentSearch.toLowerCase()) || false
    );

    const handleTaskSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskForm)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Dodaj novi task u state
                    setTasks(prev => [...prev, result.data]);
                    setShowTaskForm(false);
                    setTaskForm({ title: '', description: '', documentId: '', chapterId: '', dueDate: '' });
                    showNotification('Task je uspješno kreiran!', 'success');
                } else {
                    showNotification('Greška: ' + result.message, 'error');
                }
            } else {
                const error = await response.json();
                showNotification('Greška: ' + error.message, 'error');
            }
        } catch (error) {
            console.error('Greška pri kreiranju taska:', error);
            showNotification('Greška pri kreiranju taska', 'error');
        }
    };

    const handleTodoSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(todoForm)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Dodaj novi todo u state
                    setTodos(prev => [...prev, result.data]);
                    setShowTodoForm(false);
                    setTodoForm({ title: '', description: '', documentId: '', chapterId: '', dueDate: '' });
                    showNotification('Todo je uspješno kreiran!', 'success');
                } else {
                    showNotification('Greška: ' + result.message, 'error');
                }
            } else {
                const error = await response.json();
                showNotification('Greška: ' + error.message, 'error');
            }
        } catch (error) {
            console.error('Greška pri kreiranju todoa:', error);
            showNotification('Greška pri kreiranju todoa', 'error');
        }
    };

    const loadMoreItems = () => {
        setVisibleItems(prev => prev + 5);
    };

    const toggleFinished = async (item) => {
        try {
            // Ako je task/todo već završen, pokaži custom konfirmaciju
            if (item.isFinished) {
                setConfirmItem(item);
                setShowConfirmDialog(true);
                return;
            }

            // Direktno završi task/todo ako nije već završen
            await performToggle(item);
        } catch (error) {
            console.error('Greška pri mijenjanju statusa:', error);
            showNotification('Greška pri mijenjanju statusa. Molimo pokušajte ponovno.', 'error');
        }
    };

    const performToggle = async (item) => {
        try {
            const endpoint = item.type === 'task' ? 'tasks' : 'todos';
            const response = await fetch(`/api/${endpoint}/${item.id}/toggle-finished`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                // Refreshaj podatke
                loadTasks();
                loadTodos();
            } else {
                console.error('Greška pri mijenjanju statusa:', response.status);
                showNotification('Greška pri mijenjanju statusa. Molimo pokušajte ponovno.', 'error');
            }
        } catch (error) {
            console.error('Greška pri mijenjanju statusa:', error);
            showNotification('Greška pri mijenjanju statusa. Molimo pokušajte ponovno.', 'error');
        }
    };

    const handleConfirmReactivate = async () => {
        if (confirmItem) {
            await performToggle(confirmItem);
            setShowConfirmDialog(false);
            setConfirmItem(null);
        }
    };

    const handleCancelReactivate = () => {
        setShowConfirmDialog(false);
        setConfirmItem(null);
    };

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        // Auto-hide after 4 seconds
        setTimeout(() => {
            setNotification(null);
        }, 4000);
    };

    const getItemDisplayInfo = (item) => {
        if (!item.documentId) {
            return { document: 'GLOBAL', chapter: '' };
        }

        const document = documents.find(d => d.id === item.documentId);
        const documentTitle = document?.metadata?.title || 'Obrisani dokument';

        if (!item.chapterId) {
            return { document: documentTitle, chapter: '' };
        }

        // Za chapter info, trebamo dohvatiti poglavlje iz dokumenta
        const chapter = document?.chapters?.find(ch => ch.id === item.chapterId);
        if (chapter) {
            const chapterNumber = getChapterNumber(chapter, document.chapters);
            return { 
                document: documentTitle, 
                chapter: `${chapterNumber} ${chapter.title}` 
            };
        } else {
            return { 
                document: documentTitle, 
                chapter: 'Obrisano poglavlje' 
            };
        }
    };

    const getChapterNumber = (chapter, allChapters) => {
        const getNumber = (ch) => {
            if (!ch.parentId) {
                // Glavno poglavlje
                const mainChapters = allChapters
                    .filter(c => !c.parentId)
                    .sort((a, b) => a.order - b.order);
                return `${mainChapters.indexOf(ch) + 1}.`;
            } else {
                // Potpoglavlje
                const parent = allChapters.find(c => c.id === ch.parentId);
                if (parent) {
                    const parentNumber = getNumber(parent).slice(0, -1); // Ukloni zadnju točku
                    const siblings = allChapters
                        .filter(c => c.parentId === ch.parentId)
                        .sort((a, b) => a.order - b.order);
                    return `${parentNumber}.${siblings.indexOf(ch) + 1}.`;
                }
            }
            return '';
        };
        
        return getNumber(chapter);
    };

    return (
        <div className="tasks-todos-page">
            <div className="page-header">
                <h1>Task & Todos</h1>
                <p>Upravljajte zadacima i planovima za vaše dokumente</p>
            </div>

            {/* Kalendar sekcija */}
            <div className="calendar-section">
                <h2>Kalendar događaja</h2>
                <div className="calendar-container">
                    <Calendar
                        localizer={localizer}
                        events={calendarEvents}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: 500 }}
                        views={['month', 'week', 'day']}
                        defaultView='month'
                        popup
                        eventPropGetter={(event) => ({
                            style: {
                                backgroundColor: event.resource.isFinished 
                                    ? '#95a5a6'  // Siva za završene
                                    : event.resource.type === 'task' ? '#3498db' : '#27ae60',
                                borderRadius: '5px',
                                opacity: event.resource.isFinished ? 0.6 : 0.8,
                                color: 'white',
                                border: '0px',
                                display: 'block',
                                textDecoration: event.resource.isFinished ? 'line-through' : 'none'
                            }
                        })}
                    />
                </div>
            </div>

            {/* Search i filter sekcija */}
            <div className="filter-section">
                <div className="document-search">
                    <h3>Pretraži dokumente</h3>
                    <input
                        type="text"
                        placeholder="Pretražite dokumente po naslovu..."
                        value={documentSearch}
                        onChange={(e) => setDocumentSearch(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="document-toggles">
                    <h4>Odaberite dokumente za prikaz:</h4>
                    <div className="document-list">
                        <label className="document-toggle">
                            <input
                                type="checkbox"
                                checked={selectedDocuments.includes('global')}
                                onChange={() => handleDocumentToggle('global')}
                            />
                            <span>GLOBAL (bez dokumenta)</span>
                        </label>
                        {filteredDocuments.map(doc => (
                            <label key={doc.id} className="document-toggle">
                                <input
                                    type="checkbox"
                                    checked={selectedDocuments.includes(doc.id)}
                                    onChange={() => handleDocumentToggle(doc.id)}
                                />
                                <span>{doc.metadata?.title || 'Nepoznat dokument'}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Lista nadolazećih taskova i todova */}
            <div className="upcoming-section">
                <h3>Nadolazeći zadaci</h3>
                <div className="upcoming-table-container">
                    <table className="upcoming-table">
                        <thead>
                            <tr>
                                <th>TIP</th>
                                <th>NAZIV</th>
                                <th>DOKUMENT/POGLAVLJE</th>
                                <th>KRAJNJI ROK</th>
                                <th>AKCIJA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {upcomingItems.slice(0, visibleItems).map((item, index) => (
                                <tr 
                                    key={`${item.type}-${item.id}-${index}`}
                                    className={`task-row ${item.isFinished ? 'finished' : ''}`}
                                    onClick={() => toggleFinished(item)}
                                    style={{ cursor: 'pointer' }}
                                    title={item.isFinished ? 'Klikni za reaktivaciju' : 'Klikni za završavanje'}
                                >
                                    <td>
                                        <span className={`type-badge ${item.type} ${item.isFinished ? 'finished' : ''}`}>
                                            {item.type.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className={item.isFinished ? 'finished-text' : ''}>{item.title}</td>
                                    <td className={item.isFinished ? 'finished-text' : ''}>
                                        {(() => {
                                            const info = getItemDisplayInfo(item);
                                            return (
                                                <div>
                                                    <div>{info.document}</div>
                                                    {info.chapter && (
                                                        <div style={{fontSize: '0.8em', color: '#666', fontStyle: 'italic'}}>
                                                            {info.chapter}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className={item.isFinished ? 'finished-text' : ''}>
                                        {item.dueDate 
                                            ? moment(item.dueDate).format('DD.MM.YYYY')
                                            : 'Bez roka'
                                        }
                                    </td>
                                    <td className="action-cell">
                                        <span className={`action-text ${item.isFinished ? 'finished' : 'active'}`}>
                                            {item.isFinished ? '↻ Reaktiviraj' : '✓ Završi'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {upcomingItems.length > visibleItems && (
                        <button className="load-more-btn" onClick={loadMoreItems}>
                            Učitaj još 5
                        </button>
                    )}
                </div>
            </div>

            {/* Forme za kreiranje */}
            <div className="creation-section">
                <div className="form-buttons">
                    <button 
                        className="create-btn task-btn"
                        onClick={() => {
                            setShowTaskForm(!showTaskForm);
                            if (!showTaskForm) setShowTodoForm(false); // Sakrij todo formu kada prikazuješ task formu
                        }}
                    >
                        {showTaskForm ? 'Sakrij' : 'Kreiraj Task'}
                    </button>
                    <button 
                        className="create-btn todo-btn"
                        onClick={() => {
                            setShowTodoForm(!showTodoForm);
                            if (!showTodoForm) setShowTaskForm(false); // Sakrij task formu kada prikazuješ todo formu
                        }}
                    >
                        {showTodoForm ? 'Sakrij' : 'Kreiraj Todo'}
                    </button>
                </div>

                {/* Task forma */}
                {showTaskForm && (
                    <form className="task-form" onSubmit={handleTaskSubmit}>
                        <h4>Novi Task</h4>
                        <div className="form-group">
                            <label>Naziv *</label>
                            <input
                                type="text"
                                required
                                value={taskForm.title}
                                onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Opis *</label>
                            <textarea
                                required
                                value={taskForm.description}
                                onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Dokument</label>
                            <select
                                value={taskForm.documentId}
                                onChange={(e) => {
                                    const docId = e.target.value;
                                    setTaskForm({...taskForm, documentId: docId, chapterId: ''});
                                    loadChapters(docId);
                                }}
                            >
                                <option value="">GLOBAL (bez dokumenta)</option>
                                {documents.map(doc => (
                                    <option key={doc.id} value={doc.id}>{doc.metadata?.title || 'Nepoznat dokument'}</option>
                                ))}
                            </select>
                        </div>
                        {taskForm.documentId && (
                            <div className="form-group">
                                <label>Poglavlje</label>
                                <select
                                    value={taskForm.chapterId}
                                    onChange={(e) => setTaskForm({...taskForm, chapterId: e.target.value})}
                                >
                                    <option value="">Cijeli dokument (bez poglavlja)</option>
                                    {availableChapters.map(chapter => (
                                        <option key={chapter.id} value={chapter.id}>
                                            {chapter.displayTitle}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="form-group">
                            <label>Krajnji rok *</label>
                            <input
                                type="datetime-local"
                                required
                                value={taskForm.dueDate}
                                onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})}
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="submit-btn">Kreiraj Task</button>
                            <button type="button" className="cancel-btn" onClick={() => setShowTaskForm(false)}>
                                Odustani
                            </button>
                        </div>
                    </form>
                )}

                {/* Todo forma */}
                {showTodoForm && (
                    <form className="todo-form" onSubmit={handleTodoSubmit}>
                        <h4>Novi Todo</h4>
                        <div className="form-group">
                            <label>Naziv *</label>
                            <input
                                type="text"
                                required
                                value={todoForm.title}
                                onChange={(e) => setTodoForm({...todoForm, title: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Opis *</label>
                            <textarea
                                required
                                value={todoForm.description}
                                onChange={(e) => setTodoForm({...todoForm, description: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Dokument</label>
                            <select
                                value={todoForm.documentId}
                                onChange={(e) => {
                                    const docId = e.target.value;
                                    setTodoForm({...todoForm, documentId: docId, chapterId: ''});
                                    loadChapters(docId);
                                }}
                            >
                                <option value="">GLOBAL (bez dokumenta)</option>
                                {documents.map(doc => (
                                    <option key={doc.id} value={doc.id}>{doc.metadata?.title || 'Nepoznat dokument'}</option>
                                ))}
                            </select>
                        </div>
                        {todoForm.documentId && (
                            <div className="form-group">
                                <label>Poglavlje</label>
                                <select
                                    value={todoForm.chapterId}
                                    onChange={(e) => setTodoForm({...todoForm, chapterId: e.target.value})}
                                >
                                    <option value="">Cijeli dokument (bez poglavlja)</option>
                                    {availableChapters.map(chapter => (
                                        <option key={chapter.id} value={chapter.id}>
                                            {chapter.displayTitle}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="form-group">
                            <label>Krajnji rok (opcionalno)</label>
                            <input
                                type="datetime-local"
                                value={todoForm.dueDate}
                                onChange={(e) => setTodoForm({...todoForm, dueDate: e.target.value})}
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="submit-btn">Kreiraj Todo</button>
                            <button type="button" className="cancel-btn" onClick={() => setShowTodoForm(false)}>
                                Odustani
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Custom Confirmation Dialog */}
            {showConfirmDialog && confirmItem && (
                <div className="confirm-overlay">
                    <div className="confirm-dialog">
                        <div className="confirm-header">
                            <h3>Reaktivacija zadatka</h3>
                        </div>
                        <div className="confirm-body">
                            <p>
                                <strong>{confirmItem.type.toUpperCase()}</strong> "{confirmItem.title}" je već uspješno završen.
                            </p>
                            <p>Jeste li sigurni da ga želite ponovno aktivirati?</p>
                        </div>
                        <div className="confirm-actions">
                            <button 
                                className="btn-cancel" 
                                onClick={handleCancelReactivate}
                            >
                                Otkaži
                            </button>
                            <button 
                                className="btn-confirm" 
                                onClick={handleConfirmReactivate}
                            >
                                Reaktiviraj
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Notification */}
            {notification && (
                <div className={`notification-toast ${notification.type}`}>
                    <div className="notification-content">
                        <span className="notification-message">{notification.message}</span>
                        <button 
                            className="notification-close"
                            onClick={() => setNotification(null)}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksTodos;
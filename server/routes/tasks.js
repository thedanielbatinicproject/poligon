const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const ThesisModel = require('../models/ThesisModel');

const SESSIONS_FILE = path.join(__dirname, '../data/sessions.json');
const TASKS_FILE = path.join(__dirname, '../data/tasks.json');
const TODOS_FILE = path.join(__dirname, '../data/todos.json');

function loadActiveSessions() {
    try {
        if (fs.existsSync(SESSIONS_FILE)) {
            const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
            const sessionsArray = JSON.parse(data);
            return new Map(sessionsArray);
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
    return new Map();
}

// Middleware za autentifikaciju
const authenticateUser = (req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const sessionId = req.cookies.sessionId;
        
        if (!sessionId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Niste prijavljeni' 
            });
        }

        const activeSessions = loadActiveSessions();
        const session = activeSessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ 
                success: false, 
                message: 'Sesija je neispravna ili je istekla' 
            });
        }

        req.user = session;
    }
    next();
};

// Funkcija za provjeru admin dozvola
const isAdmin = (user) => {
    return user && user.role === 'admin';
};

// Funkcija za provjeru može li korisnik uređivati task
const canEditTask = (task, session) => {
    const user = session?.user || session;
    return isAdmin(user) || task.createdBy === user?.id;
};

// Funkcija za provjeru može li korisnik uređivati todo
const canEditTodo = (todo, session) => {
    // Izvlači user objekt iz sesije
    const user = session?.user || session;
    
    // Ako je admin, može sve
    if (user && isAdmin(user)) {
        return true;
    }
    
    // Ako je registriran korisnik, može svoje todoove
    if (user && user.id) {
        return todo.createdBy === user.id;
    }
    
    // Neregistrirani korisnici mogu samo "Anonymous" todoove  
    return todo.createdBy === 'Anonymous';
};


function loadTasks() {
    try {
        if (fs.existsSync(TASKS_FILE)) {
            const data = fs.readFileSync(TASKS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
    return [];
}

function saveTasks(tasks) {
    try {
        fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving tasks:', error);
        return false;
    }
}

function loadTodos() {
    try {
        if (fs.existsSync(TODOS_FILE)) {
            const data = fs.readFileSync(TODOS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading todos:', error);
    }
    return [];
}

function saveTodos(todos) {
    try {
        fs.writeFileSync(TODOS_FILE, JSON.stringify(todos, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving todos:', error);
        return false;
    }
}

function generateUniqueId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}




router.get('/tasks', (req, res) => {
    try {
        const tasks = loadTasks();
        const tasksWithType = tasks.map(task => ({
            ...task,
            type: 'task'
        }));
        res.json(tasksWithType);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Greška pri dohvaćanju taskova' 
        });
    }
});

// POST /api/tasks - Kreiraj novi task
router.post('/tasks', authenticateUser, (req, res) => {
    try {
        const { title, description, documentId, chapterId, dueDate } = req.body;

        
        if (!title || !description || !dueDate) {
            return res.status(400).json({
                success: false,
                message: 'Naziv, opis i krajnji rok su obavezni'
            });
        }

        const tasks = loadTasks();
        
        const newTask = {
            id: generateUniqueId(),
            title: title.trim(),
            description: description.trim(),
            documentId: documentId || null,
            chapterId: chapterId || null,
            dueDate: dueDate,
            createdAt: new Date().toISOString(),
            createdBy: req.user.id,
            isFinished: false
        };

        tasks.push(newTask);
        
        if (saveTasks(tasks)) {
            res.status(201).json({
                success: true,
                message: 'Task je uspješno kreiran',
                data: { ...newTask, type: 'task' }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Greška pri spremanju taska'
            });
        }
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri kreiranju taska'
        });
    }
});

// PUT /api/tasks/:id - Ažuriraj task
router.put('/tasks/:id', authenticateUser, (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, documentId, chapterId, dueDate, completed } = req.body;

        const tasks = loadTasks();
        const taskIndex = tasks.findIndex(task => task.id === id);

        if (taskIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Task nije pronađen'
            });
        }

        // Provjeri da li korisnik ima pravo urediti
        if (!canEditTask(tasks[taskIndex], req.user)) {
            return res.status(403).json({
                success: false,
                message: isAdmin(req.user) ? 'Admin greška' : 'Možete uređivati samo vlastite taskove'
            });
        }

        // Ažuriraj task
        tasks[taskIndex] = {
            ...tasks[taskIndex],
            title: title || tasks[taskIndex].title,
            description: description || tasks[taskIndex].description,
            documentId: documentId !== undefined ? documentId : tasks[taskIndex].documentId,
            chapterId: chapterId !== undefined ? chapterId : tasks[taskIndex].chapterId,
            dueDate: dueDate || tasks[taskIndex].dueDate,
            completed: completed !== undefined ? completed : tasks[taskIndex].completed,
            updatedAt: new Date().toISOString()
        };

        if (saveTasks(tasks)) {
            res.json({
                success: true,
                message: 'Task je uspješno ažuriran',
                data: { ...tasks[taskIndex], type: 'task' }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Greška pri spremanju taska'
            });
        }
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri ažuriranju taska'
        });
    }
});

// PATCH /api/tasks/:id/toggle-finished - Promijeni finished status
router.patch('/tasks/:id/toggle-finished', authenticateUser, (req, res) => {
    try {
        const { id } = req.params;
        const tasks = loadTasks();
        const taskIndex = tasks.findIndex(task => task.id === id);

        if (taskIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Task nije pronađen'
            });
        }

        // Provjeri da li korisnik ima pravo urediti
        if (!canEditTask(tasks[taskIndex], req.user)) {
            return res.status(403).json({
                success: false,
                message: isAdmin(req.user) ? 'Admin greška' : 'Možete mijenjati status samo vlastitim taskovima'
            });
        }

        // Toggle finished status
        tasks[taskIndex].isFinished = !tasks[taskIndex].isFinished;
        tasks[taskIndex].updatedAt = new Date().toISOString();
        if (tasks[taskIndex].isFinished) {
            tasks[taskIndex].finishedAt = new Date().toISOString();
        } else {
            delete tasks[taskIndex].finishedAt;
        }

        if (saveTasks(tasks)) {
            res.json({
                success: true,
                message: tasks[taskIndex].isFinished ? 'Task je označen kao završen' : 'Task je označen kao aktivan',
                data: { ...tasks[taskIndex], type: 'task' }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Greška pri spremanju taska'
            });
        }
    } catch (error) {
        console.error('Error toggling task status:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri mijenjanju statusa taska'
        });
    }
});

// DELETE /api/tasks/:id - Obriši task
router.delete('/tasks/:id', authenticateUser, (req, res) => {
    try {
        const { id } = req.params;
        const tasks = loadTasks();
        const taskIndex = tasks.findIndex(task => task.id === id);

        if (taskIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Task nije pronađen'
            });
        }

        // Provjeri da li korisnik ima pravo obrisati
        if (!canEditTask(tasks[taskIndex], req.user)) {
            return res.status(403).json({
                success: false,
                message: isAdmin(req.user) ? 'Admin greška' : 'Možete brisati samo vlastite taskove'
            });
        }

        tasks.splice(taskIndex, 1);

        if (saveTasks(tasks)) {
            res.json({
                success: true,
                message: 'Task je uspješno obrisan'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Greška pri brisanju taska'
            });
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri brisanju taska'
        });
    }
});

// TODOS ROUTES

// GET /api/todos - Dohvati sve todove
router.get('/todos', (req, res) => {
    try {
        const todos = loadTodos();
        const todosWithType = todos.map(todo => ({
            ...todo,
            type: 'todo'
        }));
        res.json(todosWithType);
    } catch (error) {
        console.error('Error fetching todos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Greška pri dohvaćanju todova' 
        });
    }
});

// POST /api/todos - Kreiraj novi todo (dostupno svima)
router.post('/todos', (req, res) => {
    try {
        const { title, description, documentId, chapterId, dueDate } = req.body;

        
        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Naziv i opis su obavezni'
            });
        }

        const todos = loadTodos();
        
        
        const sessionId = req.cookies.sessionId;
        let createdBy = 'Anonymous';
        
        if (sessionId) {
            const activeSessions = loadActiveSessions();
            const session = activeSessions.get(sessionId);
            if (session) {
                createdBy = session.user?.id || session.id;
            }
        }

        const newTodo = {
            id: generateUniqueId(),
            title: title.trim(),
            description: description.trim(),
            documentId: documentId || null,
            chapterId: chapterId || null,
            dueDate: dueDate || null,
            createdAt: new Date().toISOString(),
            createdBy: createdBy,
            isFinished: false
        };

        todos.push(newTodo);
        
        if (saveTodos(todos)) {
            res.status(201).json({
                success: true,
                message: 'Todo je uspješno kreiran',
                data: { ...newTodo, type: 'todo' }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Greška pri spremanju todoa'
            });
        }
    } catch (error) {
        console.error('Error creating todo:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri kreiranju todoa'
        });
    }
});

// PUT /api/todos/:id - Ažuriraj todo (dostupno svima)
router.put('/todos/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, documentId, chapterId, dueDate, completed } = req.body;

        const todos = loadTodos();
        const todoIndex = todos.findIndex(todo => todo.id === id);

        if (todoIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Todo nije pronađen'
            });
        }

        // Provjeri da li korisnik ima pravo urediti
        const sessionId = req.cookies.sessionId;
        let session = null;
        
        if (sessionId) {
            const activeSessions = loadActiveSessions();
            session = activeSessions.get(sessionId);
        }

        // Provjeri dozvole
        if (!canEditTodo(todos[todoIndex], session)) {
            return res.status(403).json({
                success: false,
                message: 'Možete uređivati samo vlastite todoove'
            });
        }

        // Ažuriraj todo
        todos[todoIndex] = {
            ...todos[todoIndex],
            title: title || todos[todoIndex].title,
            description: description || todos[todoIndex].description,
            documentId: documentId !== undefined ? documentId : todos[todoIndex].documentId,
            chapterId: chapterId !== undefined ? chapterId : todos[todoIndex].chapterId,
            dueDate: dueDate !== undefined ? dueDate : todos[todoIndex].dueDate,
            completed: completed !== undefined ? completed : todos[todoIndex].completed,
            updatedAt: new Date().toISOString()
        };

        if (saveTodos(todos)) {
            res.json({
                success: true,
                message: 'Todo je uspješno ažuriran',
                data: { ...todos[todoIndex], type: 'todo' }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Greška pri spremanju todoa'
            });
        }
    } catch (error) {
        console.error('Error updating todo:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri ažuriranju todoa'
        });
    }
});

// PATCH /api/todos/:id/toggle-finished - Promijeni finished status (dostupno svima)
router.patch('/todos/:id/toggle-finished', (req, res) => {
    try {
        const { id } = req.params;
        const todos = loadTodos();
        const todoIndex = todos.findIndex(todo => todo.id === id);

        if (todoIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Todo nije pronađen'
            });
        }

        // Provjeri da li korisnik ima pravo urediti
        const sessionId = req.cookies.sessionId;
        let session = null;
        
        if (sessionId) {
            const activeSessions = loadActiveSessions();
            session = activeSessions.get(sessionId);
        }

        // Provjeri dozvole
        if (!canEditTodo(todos[todoIndex], session)) {
            return res.status(403).json({
                success: false,
                message: 'Možete mijenjati status samo vlastitim todoovima'
            });
        }

        // Toggle finished status
        todos[todoIndex].isFinished = !todos[todoIndex].isFinished;
        todos[todoIndex].updatedAt = new Date().toISOString();
        if (todos[todoIndex].isFinished) {
            todos[todoIndex].finishedAt = new Date().toISOString();
        } else {
            delete todos[todoIndex].finishedAt;
        }

        if (saveTodos(todos)) {
            res.json({
                success: true,
                message: todos[todoIndex].isFinished ? 'Todo je označen kao završen' : 'Todo je označen kao aktivan',
                data: { ...todos[todoIndex], type: 'todo' }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Greška pri spremanju todoa'
            });
        }
    } catch (error) {
        console.error('Error toggling todo status:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri mijenjanju statusa todoa'
        });
    }
});

// DELETE /api/todos/:id - Obriši todo (dostupno svima)
router.delete('/todos/:id', (req, res) => {
    try {
        const { id } = req.params;
        const todos = loadTodos();
        const todoIndex = todos.findIndex(todo => todo.id === id);

        if (todoIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Todo nije pronađen'
            });
        }

        // Provjeri da li korisnik ima pravo obrisati
        const sessionId = req.cookies.sessionId;
        let session = null;
        
        if (sessionId) {
            const activeSessions = loadActiveSessions();
            session = activeSessions.get(sessionId);
        }

        // Provjeri dozvole
        if (!canEditTodo(todos[todoIndex], session)) {
            return res.status(403).json({
                success: false,
                message: 'Možete brisati samo vlastite todoove'
            });
        }

        todos.splice(todoIndex, 1);

        if (saveTodos(todos)) {
            res.json({
                success: true,
                message: 'Todo je uspješno obrisan'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Greška pri brisanju todoa'
            });
        }
    } catch (error) {
        console.error('Error deleting todo:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri brisanju todoa'
        });
    }
});

// POST /api/cleanup-tasks - Očisti taskove/todove kada se brišu dokumenti/poglavlja
router.post('/cleanup-tasks', async (req, res) => {
    try {
        const { documentId, chapterId } = req.body;
        
        
        const tasks = loadTasks();
        const todos = loadTodos();
        
        let tasksUpdated = false;
        let todosUpdated = false;

        if (documentId && !chapterId) {
            
            tasks.forEach(task => {
                if (task.documentId === documentId) {
                    task.documentId = '';
                    task.chapterId = '';
                    tasksUpdated = true;
                }
            });
            
            todos.forEach(todo => {
                if (todo.documentId === documentId) {
                    todo.documentId = '';
                    todo.chapterId = '';
                    todosUpdated = true;
                }
            });
        } else if (documentId && chapterId) {
            
            tasks.forEach(task => {
                if (task.documentId === documentId && task.chapterId === chapterId) {
                    task.chapterId = '';
                    tasksUpdated = true;
                }
            });
            
            todos.forEach(todo => {
                if (todo.documentId === documentId && todo.chapterId === chapterId) {
                    todo.chapterId = '';
                    todosUpdated = true;
                }
            });
        }

        
        if (tasksUpdated) {
            saveTasks(tasks);
        }
        if (todosUpdated) {
            saveTodos(todos);
        }

        res.json({ 
            success: true, 
            message: `Uspješno ažurirano ${tasksUpdated ? 'taskova' : '0'} i ${todosUpdated ? 'todova' : '0'}` 
        });
    } catch (error) {
        console.error('Greška pri čišćenju taskova:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Greška pri čišćenju taskova' 
        });
    }
});

// GET /api/chapters/:documentId - Dohvati poglavlja za dokument
router.get('/chapters/:documentId', async (req, res) => {
    try {
        const thesis = await ThesisModel.getById(req.params.documentId);
        
        if (!thesis) {
            return res.status(404).json({ 
                success: false, 
                message: 'Dokument nije pronađen' 
            });
        }

        // Funkcija za sortiranje poglavlja hijerarhijski
        const buildChapterHierarchy = (chapters) => {
            const result = [];
            
            const addChapterWithChildren = (chapter, indent = 0) => {
                const chapterNumber = getChapterNumber(chapter, chapters);
                const indentPrefix = '    '.repeat(indent); 
                
                result.push({
                    ...chapter,
                    indent,
                    displayTitle: `${indentPrefix}${chapterNumber} ${chapter.title}`
                });

                // Dodaj djecu sortirana po order-u
                const children = chapters
                    .filter(ch => ch.parentId === chapter.id)
                    .sort((a, b) => a.order - b.order);
                children.forEach(child => addChapterWithChildren(child, indent + 1));
            };

            
            const mainChapters = chapters
                .filter(ch => !ch.parentId)
                .sort((a, b) => a.order - b.order);
            mainChapters.forEach(chapter => addChapterWithChildren(chapter, 0));

            return result;
        };

        
        const getChapterNumber = (chapter, allChapters) => {
            const getNumber = (ch) => {
                if (!ch.parentId) {
                    
                    const mainChapters = allChapters
                        .filter(c => !c.parentId)
                        .sort((a, b) => a.order - b.order);
                    return `${mainChapters.indexOf(ch) + 1}.`;
                } else {
                    // Potpoglavlje
                    const parent = allChapters.find(c => c.id === ch.parentId);
                    if (parent) {
                        const parentNumber = getNumber(parent).slice(0, -1); 
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

        const hierarchyChapters = buildChapterHierarchy(thesis.chapters);

        res.json({ 
            success: true, 
            data: hierarchyChapters 
        });
    } catch (error) {
        console.error('Greška pri dohvaćanju poglavlja:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Greška pri dohvaćanju poglavlja' 
        });
    }
});

module.exports = router;
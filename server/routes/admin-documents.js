const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const ThesisModel = require('../models/ThesisModel');

const SESSIONS_FILE = path.join(__dirname, '../../data/sessions.json');
const USERS_FILE = path.join(__dirname, '../data/users.json');

// Helper funkcije
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

function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            const parsed = JSON.parse(data);
            return parsed.users || parsed;
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
    return [];
}

// Admin middleware
const requireAdmin = (req, res, next) => {
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

    const users = loadUsers();
    const user = users.find(u => u.username === session.user.username);
    
    if (!user || user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Nemate administratorske dozvole'
        });
    }

    req.user = user;
    req.session = session;
    next();
};

// GET /api/admin/documents - Dohvati sve dokumente s paginacijom i pretragom
router.get('/', requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const users = loadUsers();
        
        let documents = await ThesisModel.getAll();
        
        // Dodaj informacije o kreator-u
        documents = documents.map(doc => {
            // Koristi prvo authorId, zatim fallback na author username
            const authorId = doc.metadata?.authorId;
            let creator = null;
            
            if (authorId) {
                creator = users.find(u => u.id === authorId);
            } else if (doc.metadata?.author) {
                // Fallback za stare dokumente bez authorId
                creator = users.find(u => u.username === doc.metadata.author);
            }
            
            return {
                ...doc,
                creatorInfo: creator ? {
                    id: creator.id,
                    ime: creator.ime,
                    prezime: creator.prezime,
                    username: creator.username,
                    email: creator.email
                } : null
            };
        });

        // Filtriraj prema search termu
        if (search) {
            const searchLower = search.toLowerCase();
            documents = documents.filter(doc => 
                doc.metadata?.title?.toLowerCase().includes(searchLower) ||
                doc.metadata?.author?.toLowerCase().includes(searchLower) ||
                doc.creatorInfo?.ime?.toLowerCase().includes(searchLower) ||
                doc.creatorInfo?.prezime?.toLowerCase().includes(searchLower)
            );
        }

        // Sortiraj po updated datumu (najnoviji prvi)
        documents.sort((a, b) => new Date(b.updated) - new Date(a.updated));

        // Paginacija
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedDocuments = documents.slice(startIndex, endIndex);

        res.json({
            success: true,
            data: {
                documents: paginatedDocuments,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(documents.length / limit),
                    totalDocuments: documents.length,
                    hasNext: endIndex < documents.length,
                    hasPrev: startIndex > 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri dohvaćanju dokumenata'
        });
    }
});

// GET /api/admin/documents/:id - Dohvati specifični dokument s editorima
router.get('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const users = loadUsers();
        
        const document = await ThesisModel.getById(id);
        
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Dokument nije pronađen'
            });
        }

        // Dodaj informacije o kreator-u
        const authorId = document.metadata?.authorId;
        let creator = null;
        
        if (authorId) {
            creator = users.find(u => u.id === authorId);
        } else if (document.metadata?.author) {
            // Fallback za stare dokumente bez authorId
            creator = users.find(u => u.username === document.metadata.author);
        }
        
        // Dodaj informacije o editorima
        let editors = [];
        
        // Koristi prvo editorIds, zatim fallback na editors usernames
        if (document.editorIds && document.editorIds.length > 0) {
            editors = document.editorIds.map(editorId => {
                const editor = users.find(u => u.id === editorId);
                return editor ? {
                    id: editor.id,
                    ime: editor.ime,
                    prezime: editor.prezime,
                    username: editor.username,
                    email: editor.email
                } : null;
            }).filter(Boolean);
        } else if (document.editors && document.editors.length > 0) {
            // Fallback za stare dokumente bez editorIds
            editors = document.editors.map(editorUsername => {
                const editor = users.find(u => u.username === editorUsername);
                return editor ? {
                    id: editor.id,
                    ime: editor.ime,
                    prezime: editor.prezime,
                    username: editor.username,
                    email: editor.email
                } : null;
            }).filter(Boolean);
        }

        res.json({
            success: true,
            data: {
                ...document,
                creatorInfo: creator ? {
                    id: creator.id,
                    ime: creator.ime,
                    prezime: creator.prezime,
                    username: creator.username,
                    email: creator.email
                } : null,
                editorsInfo: editors
            }
        });
    } catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri dohvaćanju dokumenta'
        });
    }
});

// GET /api/admin/documents/users/available - Dohvati korisnike koji mogu biti editori (bez admin)
router.get('/users/available', requireAdmin, async (req, res) => {
    try {
        const users = loadUsers();
        
        // Filtriraj samo ne-admin korisnike koji su aktivni
        const availableUsers = users.filter(user => 
            user.role !== 'admin' && 
            user.isActive !== false
        ).map(user => ({
            id: user.id,
            ime: user.ime,
            prezime: user.prezime,
            username: user.username,
            email: user.email
        }));

        res.json({
            success: true,
            data: availableUsers
        });
    } catch (error) {
        console.error('Error fetching available users:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri dohvaćanju korisnika'
        });
    }
});

// POST /api/admin/documents/:id/editors - Dodaj editor-a u dokument
router.post('/:id/editors', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username je obavezan'
            });
        }

        const users = loadUsers();
        
        const document = await ThesisModel.getById(id);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Dokument nije pronađen'
            });
        }

        // Provjeri postoji li korisnik i nije li admin
        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Korisnik nije pronađen'
            });
        }

        // Provjeri nije li admin
        if (user.role === 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Admin korisnik ne može biti editor (ima automatski pristup svim dokumentima)'
            });
        }

        // Provjeri je li već kreator
        const authorId = document.metadata?.authorId;
        if (authorId === user.id || document.metadata?.author === username) {
            return res.status(400).json({
                success: false,
                message: 'Korisnik je već kreator dokumenta'
            });
        }

        // Provjeri je li već editor
        const currentEditorIds = document.editorIds || [];
        const currentEditors = document.editors || [];
        
        if (currentEditorIds.includes(user.id) || currentEditors.includes(username)) {
            return res.status(400).json({
                success: false,
                message: 'Korisnik je već editor dokumenta'
            });
        }

        // Dodaj editor-a pomoću ID-ja
        const updatedEditorIds = [...currentEditorIds, user.id];
        const updatedEditors = [...currentEditors, username]; // Zadržaj i usernames za backward compatibility
        
        await ThesisModel.update(id, { 
            editorIds: updatedEditorIds,
            editors: updatedEditors
        });

        res.json({
            success: true,
            message: 'Editor uspješno dodan',
            data: {
                userId: user.id,
                username: user.username,
                ime: user.ime,
                prezime: user.prezime
            }
        });
    } catch (error) {
        console.error('Error adding editor:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri dodavanju editora'
        });
    }
});

// DELETE /api/admin/documents/:id/editors/:username - Ukloni editor-a iz dokumenta
router.delete('/:id/editors/:username', requireAdmin, async (req, res) => {
    try {
        const { id, username } = req.params;
        
        const document = await ThesisModel.getById(id);
        
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Dokument nije pronađen'
            });
        }

        // Ne dozvoli uklanjanje kreator-a
        const users = loadUsers();
        const userToRemove = users.find(u => u.username === username);
        const authorId = document.metadata?.authorId;
        
        if (!userToRemove) {
            return res.status(404).json({
                success: false,
                message: 'Korisnik nije pronađen'
            });
        }
        
        if (authorId === userToRemove.id || document.metadata?.author === username) {
            return res.status(400).json({
                success: false,
                message: 'Ne možete ukloniti kreator-a dokumenta'
            });
        }

        // Ukloni editor-a iz oba polja
        const currentEditorIds = document.editorIds || [];
        const currentEditors = document.editors || [];
        
        const updatedEditorIds = currentEditorIds.filter(id => id !== userToRemove.id);
        const updatedEditors = currentEditors.filter(e => e !== username);
        
        await ThesisModel.update(id, { 
            editorIds: updatedEditorIds,
            editors: updatedEditors
        });

        res.json({
            success: true,
            message: 'Editor uspješno uklonjen'
        });
    } catch (error) {
        console.error('Error removing editor:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri uklanjanju editora'
        });
    }
});

// DELETE /api/admin/documents/:id - Obriši dokument
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const document = await ThesisModel.getById(id);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Dokument nije pronađen'
            });
        }

        // Obriši dokument iz baze
        const allDocuments = await ThesisModel.getAll();
        const updatedDocuments = allDocuments.filter(doc => doc.id !== id);
        await ThesisModel.db.push("/theses", updatedDocuments);

        res.json({
            success: true,
            message: 'Dokument uspješno obrisan',
            data: {
                id: document.id,
                title: document.metadata?.title
            }
        });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri brisanju dokumenta'
        });
    }
});

module.exports = router;
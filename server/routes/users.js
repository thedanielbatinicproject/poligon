const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db/index');
const { requireAuth, requireRole } = require('../middleware/auth');

const USERS_FILE = path.join(__dirname, '../data/users.json');
const THESES_FILE = path.join(__dirname, '../data/theses.json');

// Helper funkcije
function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            const parsed = JSON.parse(data);
            // Podrška za postojeći format i novi format
            return parsed.users || parsed;
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
    return [];
}

function saveUsers(users) {
    try {
        // Spremi u novom formatu
        const data = Array.isArray(users) ? users : users.users || [];
        fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving users:', error);
        return false;
    }
}

// Funkcija za ažuriranje korisničkih podataka u svim dokumentima
function updateUserDataInTheses(userId, newUserData) {
    try {
        if (!fs.existsSync(THESES_FILE)) {
            return true;
        }

        const thesesData = JSON.parse(fs.readFileSync(THESES_FILE, 'utf8'));
        let updatedCount = 0;

        if (thesesData && thesesData.theses) {
            const newFullName = `${newUserData.ime} ${newUserData.prezime}`.trim();
            
            thesesData.theses.forEach(thesis => {
                let updated = false;

                // Provjeri authorId u metadata ili direktno u thesis
                const authorId = thesis.metadata?.authorId || thesis.authorId;
                
                // Ažuriraj author name ako je authorId isti kao userId
                if (authorId === userId) {
                    if (thesis.metadata) {
                        thesis.metadata.author = newFullName;
                    } else {
                        thesis.author = newFullName;
                    }
                    updated = true;
                }

                // Ažuriraj editorIds i editors arrays ako sadrže userId
                if (thesis.editorIds && Array.isArray(thesis.editorIds)) {
                    const editorIndex = thesis.editorIds.indexOf(userId);
                    if (editorIndex !== -1) {
                        // Ažuriraj i editors array sa novim imenom
                        if (thesis.editors && Array.isArray(thesis.editors)) {
                            thesis.editors[editorIndex] = newFullName;
                            updated = true;
                        }
                    }
                }

                if (updated) {
                    updatedCount++;
                    // Ažuriraj version i updated timestamp
                    thesis.version = (thesis.version || 1) + 1;
                    thesis.updated = new Date().toISOString();
                }
            });

            if (updatedCount > 0) {
                fs.writeFileSync(THESES_FILE, JSON.stringify(thesesData, null, 2));
            }
        }

        return true;
    } catch (error) {
        console.error('Error updating user data in theses:', error);
        return false;
    }
}

function generateUniqueId() {
    return 'user_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
}

// ROUTES
// GET /api/users - Dohvati sve korisnike (samo admin)
router.get('/', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const users = loadUsers();
        // Admin panel treba vidjeti lozinke za upravljanje korisnicima
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri dohvaćanju korisnika'
        });
    }
});

// GET /api/users/public - Dohvati javne podatke o korisnicima (bez lozinki)
router.get('/public', (req, res) => {
    try {
        const users = loadUsers();
        // Filtriramo osjetljive podatke
        const publicUsers = users.map(user => ({
            id: user.id,
            username: user.username,
            ime: user.ime,
            prezime: user.prezime,
            role: user.role
        }));
        
        res.json({
            success: true,
            data: publicUsers
        });
    } catch (error) {
        console.error('Error fetching public users:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri dohvaćanju korisnika'
        });
    }
});

// POST /api/users - Dodaj novog korisnika (samo admin)
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { 
            ime, prezime, username, password, email,
            brojTelefona, sveuciliste, fakultet, smjer, opis 
        } = req.body;

        // Validacija obaveznih polja
        if (!ime || !prezime || !username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Ime, prezime, korisničko ime i lozinka su obavezni'
            });
        }

        const users = loadUsers();

        // Provjeri jedinstvenost korisničkog imena
        if (users.find(u => u.username === username)) {
            return res.status(400).json({
                success: false,
                message: 'Korisničko ime već postoji'
            });
        }

        // Kreiraj novog korisnika
        const newUser = {
            id: generateUniqueId(),
            ime: ime.trim(),
            prezime: prezime.trim(),
            username: username.trim(),
            password: password, // U produkciji bi trebalo hash-irati
            email: email ? email.trim() : '',
            brojTelefona: brojTelefona || '',
            sveuciliste: sveuciliste || '',
            fakultet: fakultet || '',
            smjer: smjer || '',
            opis: opis || '',
            role: 'user', // Novi korisnici su uvijek obični korisnici
            createdAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true,
            createdBy: req.user.username
        };

        users.push(newUser);

        if (saveUsers(users)) {
            // Ukloni lozinku iz odgovora
            const { password: _, ...safeUser } = newUser;
            res.status(201).json({
                success: true,
                message: 'Korisnik je uspješno kreiran',
                data: safeUser
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Greška pri spremanju korisnika'
            });
        }
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri kreiranju korisnika'
        });
    }
});

// PUT /api/users/:id - Ažuriraj korisnika (samo admin)
router.put('/:id', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { id } = req.params;
        const { 
            ime, prezime, username, password, email,
            brojTelefona, sveuciliste, fakultet, smjer, opis 
        } = req.body;

        const users = loadUsers();
        const userIndex = users.findIndex(u => u.id === id);

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Korisnik nije pronađen'
            });
        }

        // Provjeri jedinstvenost korisničkog imena (izuzev trenutnog korisnika)
        const oldUsername = users[userIndex].username;
        const oldIme = users[userIndex].ime;
        const oldPrezime = users[userIndex].prezime;
        
        const usernameChanged = username && username !== oldUsername;
        const imeChanged = ime && ime !== oldIme;
        const prezimeChanged = prezime && prezime !== oldPrezime;
        const userDataChanged = usernameChanged || imeChanged || prezimeChanged;
        
        if (usernameChanged) {
            if (users.find(u => u.username === username && u.id !== id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Korisničko ime već postoji'
                });
            }
        }

        // Ažuriraj korisnika
        users[userIndex] = {
            ...users[userIndex],
            ime: ime || users[userIndex].ime,
            prezime: prezime || users[userIndex].prezime,
            username: username || users[userIndex].username,
            password: password || users[userIndex].password,
            email: email !== undefined ? email : users[userIndex].email,
            brojTelefona: brojTelefona !== undefined ? brojTelefona : users[userIndex].brojTelefona,
            sveuciliste: sveuciliste !== undefined ? sveuciliste : users[userIndex].sveuciliste,
            fakultet: fakultet !== undefined ? fakultet : users[userIndex].fakultet,
            smjer: smjer !== undefined ? smjer : users[userIndex].smjer,
            opis: opis !== undefined ? opis : users[userIndex].opis,
            updatedAt: new Date().toISOString(),
            updatedBy: req.user.username
        };

        if (saveUsers(users)) {
            // UVIJEK ažuriraj theses.json kada se korisnik promijeni (bez obzira što se promijenilo)
            const updateSuccess = updateUserDataInTheses(id, users[userIndex]);
            if (!updateSuccess) {
                console.warn('Failed to update user data in theses, but user was saved successfully');
            }

            // Ukloni lozinku iz odgovora
            const { password: _, ...safeUser } = users[userIndex];
            res.json({
                success: true,
                message: 'Korisnik je uspješno ažuriran i dokumenti su ažurirani',
                data: safeUser
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Greška pri spremanju korisnika'
            });
        }
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri ažuriranju korisnika'
        });
    }
});

// DELETE /api/users/:id - Obriši korisnika (samo admin)
router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { id } = req.params;
        const users = loadUsers();
        const userIndex = users.findIndex(u => u.id === id);

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Korisnik nije pronađen'
            });
        }

        // Ne dozvoli brisanje samog sebe
        if (users[userIndex].username === req.user.username) {
            return res.status(400).json({
                success: false,
                message: 'Ne možete obrisati sebe'
            });
        }

        // Obriši korisnika
        const deletedUser = users.splice(userIndex, 1)[0];

        if (saveUsers(users)) {
            res.json({
                success: true,
                message: 'Korisnik je uspješno obrisan',
                data: { id: deletedUser.id, username: deletedUser.username }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Greška pri brisanju korisnika'
            });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri brisanju korisnika'
        });
    }
});

// POST /api/users/change-admin-password - Promijeni admin lozinku (samo admin)
router.post('/change-admin-password', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 4) {
            return res.status(400).json({
                success: false,
                message: 'Nova lozinka mora imati najmanje 4 znakova'
            });
        }

        const users = loadUsers();
        const adminIndex = users.findIndex(u => u.username === req.user.username && u.role === 'admin');

        if (adminIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Admin korisnik nije pronađen'
            });
        }

        // Promijeni lozinku
        users[adminIndex].password = newPassword;
        users[adminIndex].updatedAt = new Date().toISOString();

        if (saveUsers(users)) {
            res.json({
                success: true,
                message: 'Admin lozinka je uspješno promijenjena'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Greška pri spremanju nove lozinke'
            });
        }
    } catch (error) {
        console.error('Error changing admin password:', error);
        res.status(500).json({
            success: false,
            message: 'Greška pri promjeni lozinke'
        });
    }
});

module.exports = router;

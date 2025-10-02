const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const NOTES_FILE = path.join(__dirname, '..', 'data', 'notes.json');

// Pomoćna funkcija za čitanje bilješki
const readNotes = () => {
    try {
        const data = fs.readFileSync(NOTES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading notes:', error);
        return { notes: [] };
    }
};

// Pomoćna funkcija za pisanje bilješki
const writeNotes = (data) => {
    try {
        fs.writeFileSync(NOTES_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing notes:', error);
        return false;
    }
};

// GET /api/notes - Dohvaćanje svih bilješki ili filtriranih po thesisId/chapterId
router.get('/', (req, res) => {
    try {
        const data = readNotes();
        let notes = data.notes || [];

        // Filtriranje po thesisId
        if (req.query.thesisId) {
            notes = notes.filter(note => note.thesisId === req.query.thesisId);
        }

        // Filtriranje po chapterId
        if (req.query.chapterId) {
            notes = notes.filter(note => note.chapterId === req.query.chapterId);
        }

        // Sortiranje po datumu kreiranja (najnoviji prvo)
        notes.sort((a, b) => new Date(b.created) - new Date(a.created));

        res.json({ notes });
    } catch (error) {
        console.error('Error getting notes:', error);
        res.status(500).json({ error: 'Greška pri dohvaćanju bilješki' });
    }
});

// POST /api/notes - Kreiranje nove bilješke
router.post('/', (req, res) => {
    try {
        const { thesisId, chapterId, lineNumber, selectedText, description, author } = req.body;

        // Validacija obaveznih polja
        if (!thesisId || !chapterId || !description) {
            return res.status(400).json({ error: 'Nedostaju obavezna polja (thesisId, chapterId, description)' });
        }

        const data = readNotes();
        
        // Kreiranje nove bilješke
        const newNote = {
            id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            thesisId,
            chapterId,
            lineNumber: lineNumber || null,
            selectedText: selectedText || null,
            description,
            author: author || 'Visitor',
            created: new Date().toISOString(),
            approved: false
        };

        data.notes.push(newNote);

        if (writeNotes(data)) {
            res.status(201).json(newNote);
        } else {
            res.status(500).json({ error: 'Greška pri spremanju bilješke' });
        }
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Greška pri kreiranju bilješke' });
    }
});

// PUT /api/notes/:id - Ažuriranje bilješke
router.put('/:id', (req, res) => {
    try {
        const noteId = req.params.id;
        const { description, author } = req.body;

        const data = readNotes();
        const noteIndex = data.notes.findIndex(note => note.id === noteId);

        if (noteIndex === -1) {
            return res.status(404).json({ error: 'Bilješka nije pronađena' });
        }

        // Ažuriraj bilješku
        if (description !== undefined) data.notes[noteIndex].description = description;
        if (author !== undefined) data.notes[noteIndex].author = author;

        if (writeNotes(data)) {
            res.json(data.notes[noteIndex]);
        } else {
            res.status(500).json({ error: 'Greška pri ažuriranju bilješke' });
        }
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Greška pri ažuriranju bilješke' });
    }
});

// PATCH /api/notes/:id/approve - Prihvaćanje/odbacivanje bilješke
router.patch('/:id/approve', (req, res) => {
    try {
        const noteId = req.params.id;
        const { approved } = req.body;

        const data = readNotes();
        const noteIndex = data.notes.findIndex(note => note.id === noteId);

        if (noteIndex === -1) {
            return res.status(404).json({ error: 'Bilješka nije pronađena' });
        }

        data.notes[noteIndex].approved = approved === true;

        if (writeNotes(data)) {
            res.json(data.notes[noteIndex]);
        } else {
            res.status(500).json({ error: 'Greška pri ažuriranju statusa bilješke' });
        }
    } catch (error) {
        console.error('Error approving note:', error);
        res.status(500).json({ error: 'Greška pri ažuriranju statusa bilješke' });
    }
});

// DELETE /api/notes/:id - Brisanje bilješke
router.delete('/:id', (req, res) => {
    try {
        const noteId = req.params.id;

        const data = readNotes();
        const noteIndex = data.notes.findIndex(note => note.id === noteId);

        if (noteIndex === -1) {
            return res.status(404).json({ error: 'Bilješka nije pronađena' });
        }

        data.notes.splice(noteIndex, 1);

        if (writeNotes(data)) {
            res.json({ message: 'Bilješka je uspješno obrisana' });
        } else {
            res.status(500).json({ error: 'Greška pri brisanju bilješke' });
        }
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Greška pri brisanju bilješke' });
    }
});

module.exports = router;
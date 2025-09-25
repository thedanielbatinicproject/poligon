const express = require('express');
const JsonDB = require('../utils/JsonDB');
const { Thesis, Chapter } = require('../models/Thesis');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const thesesDB = new JsonDB('server/data/theses.json');
const chaptersDB = new JsonDB('server/data/chapters.json');

// Get all theses for user
router.get('/', verifyToken, async (req, res) => {
    try {
        const allTheses = await thesesDB.read();
        const userTheses = allTheses.filter(thesis => thesis.metadata.author.email === req.user.email);
        res.json(userTheses.map(thesis => ({
            id: thesis.id,
            title: thesis.metadata.title,
            updated: thesis.updated,
            stats: thesis.stats
        })));
    } catch (error) {
        console.error('Error fetching theses:', error);
        res.status(500).json({ error: 'Failed to fetch theses' });
    }
});

// Get specific thesis
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const allTheses = await thesesDB.read();
        const thesis = allTheses.find(t => t.id === req.params.id);
        
        if (!thesis) {
            return res.status(404).json({ error: 'Thesis not found' });
        }
        
        // Check ownership
        if (thesis.metadata.author.email !== req.user.email) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        res.json(thesis);
    } catch (error) {
        console.error('Error fetching thesis:', error);
        res.status(500).json({ error: 'Failed to fetch thesis' });
    }
});

// Create new thesis
router.post('/', verifyToken, async (req, res) => {
    try {
        const thesisData = {
            ...req.body,
            metadata: {
                ...req.body.metadata,
                author: {
                    ...req.body.metadata?.author,
                    email: req.user.email
                }
            }
        };
        
        const thesis = new Thesis(thesisData);
        
        const allTheses = await thesesDB.read();
        allTheses.push(thesis.toJSON());
        await thesesDB.write(allTheses);
        
        res.status(201).json(thesis.toJSON());
    } catch (error) {
        console.error('Error creating thesis:', error);
        res.status(500).json({ error: 'Failed to create thesis' });
    }
});

// Update thesis metadata
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const allTheses = await thesesDB.read();
        const thesisIndex = allTheses.findIndex(t => t.id === req.params.id);
        
        if (thesisIndex === -1) {
            return res.status(404).json({ error: 'Thesis not found' });
        }
        
        const thesis = allTheses[thesisIndex];
        
        // Check ownership
        if (thesis.metadata.author.email !== req.user.email) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Update thesis
        const updatedThesis = new Thesis({
            ...thesis,
            ...req.body,
            updated: new Date().toISOString(),
            version: thesis.version + 1
        });
        
        allTheses[thesisIndex] = updatedThesis.toJSON();
        await thesesDB.write(allTheses);
        
        res.json(updatedThesis.toJSON());
    } catch (error) {
        console.error('Error updating thesis:', error);
        res.status(500).json({ error: 'Failed to update thesis' });
    }
});

// Delete thesis
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const allTheses = await thesesDB.read();
        const thesisIndex = allTheses.findIndex(t => t.id === req.params.id);
        
        if (thesisIndex === -1) {
            return res.status(404).json({ error: 'Thesis not found' });
        }
        
        const thesis = allTheses[thesisIndex];
        
        // Check ownership
        if (thesis.metadata.author.email !== req.user.email) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        allTheses.splice(thesisIndex, 1);
        await thesesDB.write(allTheses);
        
        res.json({ message: 'Thesis deleted successfully' });
    } catch (error) {
        console.error('Error deleting thesis:', error);
        res.status(500).json({ error: 'Failed to delete thesis' });
    }
});

// Chapter Management

// Add chapter
router.post('/:id/chapters', verifyToken, async (req, res) => {
    try {
        const allTheses = await thesesDB.read();
        const thesisIndex = allTheses.findIndex(t => t.id === req.params.id);
        
        if (thesisIndex === -1) {
            return res.status(404).json({ error: 'Thesis not found' });
        }
        
        const thesis = allTheses[thesisIndex];
        
        // Check ownership
        if (thesis.metadata.author.email !== req.user.email) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const thesisInstance = new Thesis(thesis);
        const newChapter = thesisInstance.addChapter(req.body, req.body.parent_id);
        
        allTheses[thesisIndex] = thesisInstance.toJSON();
        await thesesDB.write(allTheses);
        
        res.status(201).json(newChapter);
    } catch (error) {
        console.error('Error adding chapter:', error);
        res.status(500).json({ error: 'Failed to add chapter' });
    }
});

// Update chapter
router.put('/:id/chapters/:chapterId', verifyToken, async (req, res) => {
    try {
        const allTheses = await thesesDB.read();
        const thesisIndex = allTheses.findIndex(t => t.id === req.params.id);
        
        if (thesisIndex === -1) {
            return res.status(404).json({ error: 'Thesis not found' });
        }
        
        const thesis = allTheses[thesisIndex];
        
        // Check ownership
        if (thesis.metadata.author.email !== req.user.email) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const thesisInstance = new Thesis(thesis);
        const chapter = thesisInstance.findChapter(req.params.chapterId);
        
        if (!chapter) {
            return res.status(404).json({ error: 'Chapter not found' });
        }
        
        // Update chapter
        Object.assign(chapter, req.body, {
            updated: new Date().toISOString()
        });
        
        thesisInstance.updateStats();
        
        allTheses[thesisIndex] = thesisInstance.toJSON();
        await thesesDB.write(allTheses);
        
        res.json(chapter);
    } catch (error) {
        console.error('Error updating chapter:', error);
        res.status(500).json({ error: 'Failed to update chapter' });
    }
});

// Delete chapter
router.delete('/:id/chapters/:chapterId', verifyToken, async (req, res) => {
    try {
        const allTheses = await thesesDB.read();
        const thesisIndex = allTheses.findIndex(t => t.id === req.params.id);
        
        if (thesisIndex === -1) {
            return res.status(404).json({ error: 'Thesis not found' });
        }
        
        const thesis = allTheses[thesisIndex];
        
        // Check ownership
        if (thesis.metadata.author.email !== req.user.email) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const thesisInstance = new Thesis(thesis);
        const removed = thesisInstance.removeChapter(req.params.chapterId);
        
        if (!removed) {
            return res.status(404).json({ error: 'Chapter not found' });
        }
        
        allTheses[thesisIndex] = thesisInstance.toJSON();
        await thesesDB.write(allTheses);
        
        res.json({ message: 'Chapter deleted successfully' });
    } catch (error) {
        console.error('Error deleting chapter:', error);
        res.status(500).json({ error: 'Failed to delete chapter' });
    }
});

// Reorder chapters
router.put('/:id/chapters/:chapterId/move', verifyToken, async (req, res) => {
    try {
        const { newParentId, newOrder } = req.body;
        
        const allTheses = await thesesDB.read();
        const thesisIndex = allTheses.findIndex(t => t.id === req.params.id);
        
        if (thesisIndex === -1) {
            return res.status(404).json({ error: 'Thesis not found' });
        }
        
        const thesis = allTheses[thesisIndex];
        
        // Check ownership
        if (thesis.metadata.author.email !== req.user.email) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const thesisInstance = new Thesis(thesis);
        const moved = thesisInstance.moveChapter(req.params.chapterId, newParentId, newOrder);
        
        if (!moved) {
            return res.status(404).json({ error: 'Chapter not found' });
        }
        
        allTheses[thesisIndex] = thesisInstance.toJSON();
        await thesesDB.write(allTheses);
        
        res.json({ message: 'Chapter moved successfully' });
    } catch (error) {
        console.error('Error moving chapter:', error);
        res.status(500).json({ error: 'Failed to move chapter' });
    }
});

// Auto-save chapter content
router.patch('/:id/chapters/:chapterId/autosave', verifyToken, async (req, res) => {
    try {
        const { content } = req.body;
        
        const allTheses = await thesesDB.read();
        const thesisIndex = allTheses.findIndex(t => t.id === req.params.id);
        
        if (thesisIndex === -1) {
            return res.status(404).json({ error: 'Thesis not found' });
        }
        
        const thesis = allTheses[thesisIndex];
        
        // Check ownership
        if (thesis.metadata.author.email !== req.user.email) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const thesisInstance = new Thesis(thesis);
        const chapter = thesisInstance.findChapter(req.params.chapterId);
        
        if (!chapter) {
            return res.status(404).json({ error: 'Chapter not found' });
        }
        
        // Update only content and timestamp
        chapter.content = content;
        chapter.updated = new Date().toISOString();
        
        thesisInstance.updateStats();
        
        allTheses[thesisIndex] = thesisInstance.toJSON();
        await thesesDB.write(allTheses);
        
        res.json({ 
            message: 'Auto-saved successfully',
            wordCount: chapter.getWordCount(),
            updated: chapter.updated
        });
    } catch (error) {
        console.error('Error auto-saving chapter:', error);
        res.status(500).json({ error: 'Failed to auto-save chapter' });
    }
});

module.exports = router;
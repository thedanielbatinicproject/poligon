const express = require('express');
const router = express.Router();
const ThesisModel = require('../models/ThesisModel');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

router.get('/', async (req, res) => {
    try {
        const theses = await ThesisModel.getAll();
        res.json(theses);
    } catch (error) {
        console.error('Error fetching theses:', error);
        res.status(500).json({ error: 'Error fetching theses' });
    }
});


router.get('/:id', async (req, res) => {
    try {
        const thesis = await ThesisModel.getById(req.params.id);
        if (!thesis) {
            return res.status(404).json({ error: 'Thesis not found' });
        }
        res.json(thesis);
    } catch (error) {
        console.error('Error fetching thesis:', error);
        res.status(500).json({ error: 'Error fetching thesis' });
    }
});


router.post('/', requireAuth, async (req, res) => {
    try {
        const thesis = await ThesisModel.create(req.body);
        res.status(201).json(thesis);
    } catch (error) {
        console.error('Error creating thesis:', error);
        res.status(500).json({ error: 'Error creating thesis' });
    }
});


router.put('/:id', requireAuth, async (req, res) => {
    try {
        const thesis = await ThesisModel.update(req.params.id, req.body);
        res.json(thesis);
    } catch (error) {
        console.error('Error updating thesis:', error);
        res.status(500).json({ error: 'Error updating thesis' });
    }
});


router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await ThesisModel.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting thesis:', error);
        res.status(500).json({ error: 'Error deleting thesis' });
    }
});


router.post('/:id/chapters', requireAuth, async (req, res) => {
    try {
        const thesis = await ThesisModel.addChapter(req.params.id, req.body);
        res.json(thesis);
    } catch (error) {
        console.error('Error adding chapter:', error);
        res.status(500).json({ error: 'Error adding chapter' });
    }
});


router.put('/:id/chapters/:chapterId', requireAuth, async (req, res) => {
    try {
        const thesis = await ThesisModel.updateChapter(req.params.id, req.params.chapterId, req.body);
        res.json(thesis);
    } catch (error) {
        console.error('Error updating chapter:', error);
        res.status(500).json({ error: 'Error updating chapter' });
    }
});


router.delete('/:id/chapters/:chapterId', requireAuth, async (req, res) => {
    try {
        const thesis = await ThesisModel.deleteChapter(req.params.id, req.params.chapterId);
        res.json(thesis);
    } catch (error) {
        console.error('Error deleting chapter:', error);
        res.status(500).json({ error: 'Error deleting chapter' });
    }
});

module.exports = router;

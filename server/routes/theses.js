const express = require('express');
const router = express.Router();
const ThesisModel = require('../models/ThesisModel');
const { requireAuth, optionalAuth, requireMentor, requireDocumentEditor } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

router.get('/', async (req, res) => {
    try {
        const theses = await ThesisModel.getAll();
        res.json(theses);
    } catch (error) {
        res.set('X-Auth-Error', 'fetch-theses');
        return res.sendStatus(500);
    }
});

router.get('/:id', async (req, res) => {
    try {
        const thesis = await ThesisModel.getById(req.params.id);
        if (!thesis) {
            res.set('X-Auth-Error', 'thesis-not-found');
            return res.sendStatus(404);
        }
        res.json(thesis);
    } catch (error) {
        res.set('X-Auth-Error', 'fetch-thesis');
        return res.sendStatus(500);
    }
});

router.post('/', requireMentor, async (req, res) => {
    try {
        const thesis = await ThesisModel.create(req.body);
        res.status(201).json(thesis);
    } catch (error) {
        res.set('X-Auth-Error', 'create-thesis');
        return res.sendStatus(500);
    }
});

router.put('/:id', requireDocumentEditor, async (req, res) => {
    try {
        const thesis = await ThesisModel.update(req.params.id, req.body);
        res.json(thesis);
    } catch (error) {
        res.set('X-Auth-Error', 'update-thesis');
        return res.sendStatus(500);
    }
});

router.delete('/:id', requireMentor, async (req, res) => {
    try {
        await ThesisModel.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.set('X-Auth-Error', 'delete-thesis');
        return res.sendStatus(500);
    }
});

router.post('/:id/chapters', requireDocumentEditor, async (req, res) => {
    try {
        const thesis = await ThesisModel.addChapter(req.params.id, req.body);
        res.json(thesis);
    } catch (error) {
        res.set('X-Auth-Error', 'add-chapter');
        return res.sendStatus(500);
    }
});

router.put('/:id/chapters/:chapterId', requireDocumentEditor, async (req, res) => {
    try {
        const thesis = await ThesisModel.updateChapter(req.params.id, req.params.chapterId, req.body);
        res.json(thesis);
    } catch (error) {
        res.set('X-Auth-Error', 'update-chapter');
        return res.sendStatus(500);
    }
});

router.delete('/:id/chapters/:chapterId', requireMentor, async (req, res) => {
    try {
        const thesis = await ThesisModel.deleteChapter(req.params.id, req.params.chapterId);
        res.json(thesis);
    } catch (error) {
        res.set('X-Auth-Error', 'delete-chapter');
        return res.sendStatus(500);
    }
});

module.exports = router;
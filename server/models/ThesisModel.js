const { JsonDB, Config } = require('node-json-db');

class ThesisModel {
    constructor() {
        this.db = new JsonDB(new Config("server/data/theses", true, false, '/'));
    }

    async getAll() {
        try {
            return await this.db.getData("/theses");
        } catch (error) {
            if (error.name === 'DataError') {
                await this.db.push("/theses", []);
                return [];
            }
            throw error;
        }
    }

    async getById(id) {
        try {
            const theses = await this.getAll();
            return theses.find(thesis => thesis.id === id);
        } catch (error) {
            throw error;
        }
    }

    async create(thesisData) {
        const id = `thesis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const thesis = {
            id,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            version: 1,
            metadata: thesisData.metadata || {},
            structure: thesisData.structure || {},
            chapters: [],
            bibliography: [],
            settings: {
                theme: 'default',
                language: 'hr'
            },
            stats: {
                totalWords: 0,
                totalCharacters: 0,
                totalPages: 0
            }
        };

        try {
            const theses = await this.getAll();
            theses.push(thesis);
            await this.db.push("/theses", theses);
            return thesis;
        } catch (error) {
            throw error;
        }
    }

    async update(id, updates) {
        try {
            const theses = await this.getAll();
            const index = theses.findIndex(thesis => thesis.id === id);
            
            if (index === -1) {
                throw new Error('Thesis not found');
            }

            theses[index] = {
                ...theses[index],
                ...updates,
                updated: new Date().toISOString(),
                version: theses[index].version + 1
            };

            await this.db.push("/theses", theses);
            return theses[index];
        } catch (error) {
            throw error;
        }
    }

    async delete(id) {
        try {
            const theses = await this.getAll();
            const filteredTheses = theses.filter(thesis => thesis.id !== id);
            await this.db.push("/theses", filteredTheses);
            return true;
        } catch (error) {
            throw error;
        }
    }

    async addChapter(thesisId, chapterData) {
        try {
            const thesis = await this.getById(thesisId);
            if (!thesis) {
                throw new Error('Thesis not found');
            }

            const chapterId = `chapter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const chapter = {
                id: chapterId,
                title: chapterData.title || 'Untitled Chapter',
                content: chapterData.content || '',
                order: thesis.chapters.length,
                created: new Date().toISOString(),
                updated: new Date().toISOString()
            };

            thesis.chapters.push(chapter);
            return await this.update(thesisId, { chapters: thesis.chapters });
        } catch (error) {
            throw error;
        }
    }

    async updateChapter(thesisId, chapterId, chapterData) {
        try {
            const thesis = await this.getById(thesisId);
            if (!thesis) {
                throw new Error('Thesis not found');
            }

            const chapterIndex = thesis.chapters.findIndex(ch => ch.id === chapterId);
            if (chapterIndex === -1) {
                throw new Error('Chapter not found');
            }

            thesis.chapters[chapterIndex] = {
                ...thesis.chapters[chapterIndex],
                ...chapterData,
                updated: new Date().toISOString()
            };

            return await this.update(thesisId, { chapters: thesis.chapters });
        } catch (error) {
            throw error;
        }
    }

    async deleteChapter(thesisId, chapterId) {
        try {
            const thesis = await this.getById(thesisId);
            if (!thesis) {
                throw new Error('Thesis not found');
            }

            thesis.chapters = thesis.chapters.filter(ch => ch.id !== chapterId);
            return await this.update(thesisId, { chapters: thesis.chapters });
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new ThesisModel();
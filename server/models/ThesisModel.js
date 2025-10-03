const { JsonDB, Config } = require('node-json-db');
const fs = require('fs');
const path = require('path');

class ThesisModel {
    constructor() {
        // Apsolutna putanja bez .json ekstenzije (node-json-db će je dodati)
        const path = require('path');
        const dbPath = path.join(__dirname, '../data/theses');
        this.db = new JsonDB(new Config(dbPath, true, false, '/'));
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

            const updatedThesis = {
                ...theses[index],
                ...updates,
                updated: new Date().toISOString(),
                version: theses[index].version + 1
            };

            // Automatski izračunaj statistike
            updatedThesis.stats = this.calculateStats(updatedThesis.chapters || []);

            theses[index] = updatedThesis;
            await this.db.push("/theses", theses);
            return theses[index];
        } catch (error) {
            throw error;
        }
    }

    // Funkcija za računanje statistika
    calculateStats(chapters) {
        let totalWords = 0;
        let totalCharacters = 0;

        chapters.forEach(chapter => {
            const content = chapter.content || '';
            // Uklanjamo HTML tagove za čisto brojanje
            const textContent = content.replace(/<[^>]*>/g, '').trim();
            
            if (textContent) {
                const words = textContent.split(/\s+/).length;
                totalWords += words;
                totalCharacters += textContent.length;
            }
        });

        return {
            totalWords,
            totalCharacters,
            totalPages: Math.ceil(totalWords / 250) // Procjena: ~250 riječi po stranici
        };
    }

    async delete(id) {
        try {
            const theses = await this.getAll();
            const filteredTheses = theses.filter(thesis => thesis.id !== id);
            
            // Prije brisanja thesis-a, obriši sve povezane bilješke
            try {
                this.deleteNotesForThesis(id);
            } catch (notesError) {
                console.error('Error deleting notes for thesis:', notesError.message);
                // Nastavi s brisanjem thesis-a čak i ako brisanje bilješki ne uspije
            }
            
            await this.db.push("/theses", filteredTheses);
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Funkcija za brisanje bilješki povezanih s thesis-om
    deleteNotesForThesis(thesisId) {
        try {
            const notesPath = path.join(__dirname, '../data/notes.json');
            
            if (fs.existsSync(notesPath)) {
                const notesData = JSON.parse(fs.readFileSync(notesPath, 'utf8'));
                const initialCount = notesData.notes.length;
                
                // Filtriraj bilješke - ukloni sve koje pripadaju ovom thesis-u
                notesData.notes = notesData.notes.filter(note => note.thesisId !== thesisId);
                
                const deletedCount = initialCount - notesData.notes.length;
                
                fs.writeFileSync(notesPath, JSON.stringify(notesData, null, 2));
                
                console.log(`Deleted ${deletedCount} notes for thesis ${thesisId}`);
            }
        } catch (error) {
            console.error('Error deleting notes for thesis:', error);
            throw error;
        }
    }

    async addChapter(thesisId, chapterData) {
        try {
            const thesis = await this.getById(thesisId);
            if (!thesis) {
                throw new Error('Thesis not found');
            }

            // Ograniči dubinu poglavlja na maksimalno 3 razine (0, 1, 2)
            const level = chapterData.level || 0;
            if (level > 2) {
                throw new Error('Maximum chapter depth is 3 levels (cannot create level ' + level + ')');
            }

            const chapterId = `chapter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Izračunaj redni broj na osnovu hijerarhije
            let order = 0;
            if (chapterData.parentId) {
                // Za potpoglavlje, nađi maksimalni order među children
                const siblings = thesis.chapters.filter(ch => ch.parentId === chapterData.parentId);
                order = siblings.length;
            } else {
                // Za glavno poglavlje, nađi maksimalni order među glavnim poglavljima
                const mainChapters = thesis.chapters.filter(ch => !ch.parentId);
                order = mainChapters.length;
            }
            
            // Definiši default word goals na osnovu level-a
            let defaultWordGoal;
            switch(level) {
                case 0: // Glavno poglavlje
                    defaultWordGoal = 2000;
                    break;
                case 1: // Sub-poglavlje
                    defaultWordGoal = 800;
                    break;
                case 2: // Sub-sub-poglavlje
                    defaultWordGoal = 400;
                    break;
                default:
                    defaultWordGoal = 200;
            }

            const chapter = {
                id: chapterId,
                title: chapterData.title || 'Untitled Chapter',
                content: chapterData.content || '',
                order: order,
                parentId: chapterData.parentId || null,
                level: level,
                wordGoal: chapterData.wordGoal || defaultWordGoal,
                wordCount: 0, // Počinje s 0, bit će ažurirano kada se doda sadržaj
                created: new Date().toISOString(),
                updated: new Date().toISOString()
            };

            thesis.chapters.push(chapter);
            const result = await this.update(thesisId, { chapters: thesis.chapters });
            
            // Stvori clean kopiju bez ciklričnih referenci
            return {
                ...result,
                chapters: result.chapters ? [...result.chapters] : []
            };
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

            // Ako se ažurira content, izračunaj novi word count
            let updatedChapterData = { ...chapterData, updated: new Date().toISOString() };
            if (chapterData.content !== undefined) {
                updatedChapterData.wordCount = this.calculateChapterWordCount(chapterData.content);
            }

            thesis.chapters[chapterIndex] = {
                ...thesis.chapters[chapterIndex],
                ...updatedChapterData
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

            // Rekurzivno briši poglavlje i svu njegovu djecu
            const deleteRecursively = (id) => {
                const children = thesis.chapters.filter(ch => ch.parentId === id);
                children.forEach(child => deleteRecursively(child.id));
                thesis.chapters = thesis.chapters.filter(ch => ch.id !== id);
            };
            
            deleteRecursively(chapterId);
            return await this.update(thesisId, { chapters: thesis.chapters });
        } catch (error) {
            throw error;
        }
    }

    // Izračunava broj riječi u HTML sadržaju
    calculateChapterWordCount(htmlContent) {
        if (!htmlContent) return 0;
        
        // Ukloni HTML tagove i entitije
        const textContent = htmlContent
            .replace(/<[^>]*>/g, '') // Ukloni HTML tagove
            .replace(/&[^;]+;/g, ' ') // Ukloni HTML entitije
            .replace(/\s+/g, ' ') // Zamijeni višestruke razmake jednim
            .trim();
        
        // Podijeli po riječima i filtriraj prazne stringove
        const words = textContent.split(/\s+/).filter(word => word.length > 0);
        
        return words.length;
    }
}

module.exports = new ThesisModel();
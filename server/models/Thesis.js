/**
 * Thesis Model - Defines structure for thesis documents
 */

class Thesis {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.created = data.created || new Date().toISOString();
        this.updated = data.updated || new Date().toISOString();
        this.version = data.version || 1;
        
        // Thesis Metadata
        this.metadata = {
            title: data.metadata?.title || '',
            subtitle: data.metadata?.subtitle || '',
            author: {
                name: data.metadata?.author?.name || '',
                email: data.metadata?.author?.email || '',
                studentId: data.metadata?.author?.studentId || ''
            },
            mentor: {
                name: data.metadata?.mentor?.name || '',
                title: data.metadata?.mentor?.title || '',
                department: data.metadata?.mentor?.department || ''
            },
            institution: {
                name: data.metadata?.institution?.name || '',
                department: data.metadata?.institution?.department || '',
                faculty: data.metadata?.institution?.faculty || '',
                logo: data.metadata?.institution?.logo || ''
            },
            academic: {
                degree: data.metadata?.academic?.degree || '', // Bachelor, Master, PhD
                field: data.metadata?.academic?.field || '',
                year: data.metadata?.academic?.year || new Date().getFullYear(),
                defense_date: data.metadata?.academic?.defense_date || null
            },
            language: data.metadata?.language || 'hr', // hr, en
            keywords: data.metadata?.keywords || [],
            abstract: {
                hr: data.metadata?.abstract?.hr || '',
                en: data.metadata?.abstract?.en || ''
            },
            lay_summary: {
                hr: data.metadata?.lay_summary?.hr || '',
                en: data.metadata?.lay_summary?.en || ''
            }
        };
        
        // Document Structure
        this.structure = data.structure || {
            // Front Matter
            title_page: { enabled: true, order: 1 },
            committee_page: { enabled: true, order: 2 },
            abstract: { enabled: true, order: 3 },
            lay_summary: { enabled: true, order: 4 },
            preface: { enabled: false, order: 5 },
            acknowledgements: { enabled: false, order: 6 },
            table_of_contents: { enabled: true, order: 7 },
            list_of_tables: { enabled: false, order: 8 },
            list_of_figures: { enabled: false, order: 9 },
            
            // Main Content
            chapters: [], // Will contain chapter hierarchy
            
            // Back Matter
            bibliography: { enabled: true, order: 100 },
            appendices: { enabled: false, order: 101 }
        };
        
        // Chapters - Hierarchical structure
        this.chapters = data.chapters || [];
        
        // Bibliography
        this.bibliography = data.bibliography || [];
        
        // Settings
        this.settings = {
            auto_save: data.settings?.auto_save !== false, // Default true
            auto_save_interval: data.settings?.auto_save_interval || 30000, // 30 seconds
            word_count_target: data.settings?.word_count_target || 0,
            citation_style: data.settings?.citation_style || 'apa',
            page_format: data.settings?.page_format || 'a4',
            font_size: data.settings?.font_size || 12,
            line_spacing: data.settings?.line_spacing || 1.5
        };
        
        // Statistics
        this.stats = {
            word_count: data.stats?.word_count || 0,
            page_count: data.stats?.page_count || 0,
            chapter_count: data.stats?.chapter_count || 0,
            last_session_duration: data.stats?.last_session_duration || 0,
            total_time_spent: data.stats?.total_time_spent || 0
        };
    }
    
    generateId() {
        return 'thesis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Chapter Management
    addChapter(chapterData, parentId = null) {
        const chapter = new Chapter({
            ...chapterData,
            thesis_id: this.id,
            parent_id: parentId,
            order: this.getNextChapterOrder(parentId)
        });
        
        if (parentId) {
            const parent = this.findChapter(parentId);
            if (parent) {
                if (!parent.children) parent.children = [];
                parent.children.push(chapter);
            }
        } else {
            this.chapters.push(chapter);
        }
        
        this.updateStats();
        return chapter;
    }
    
    findChapter(chapterId) {
        const searchInChapters = (chapters) => {
            for (const chapter of chapters) {
                if (chapter.id === chapterId) return chapter;
                if (chapter.children) {
                    const found = searchInChapters(chapter.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return searchInChapters(this.chapters);
    }
    
    removeChapter(chapterId) {
        const removeFromChapters = (chapters) => {
            for (let i = 0; i < chapters.length; i++) {
                if (chapters[i].id === chapterId) {
                    chapters.splice(i, 1);
                    return true;
                }
                if (chapters[i].children && removeFromChapters(chapters[i].children)) {
                    return true;
                }
            }
            return false;
        };
        
        const removed = removeFromChapters(this.chapters);
        if (removed) this.updateStats();
        return removed;
    }
    
    moveChapter(chapterId, newParentId, newOrder) {
        const chapter = this.findChapter(chapterId);
        if (!chapter) return false;
        
        // Remove from current location
        this.removeChapter(chapterId);
        
        // Add to new location
        chapter.parent_id = newParentId;
        chapter.order = newOrder;
        
        if (newParentId) {
            const newParent = this.findChapter(newParentId);
            if (newParent) {
                if (!newParent.children) newParent.children = [];
                newParent.children.splice(newOrder, 0, chapter);
            }
        } else {
            this.chapters.splice(newOrder, 0, chapter);
        }
        
        this.reorderChapters();
        return true;
    }
    
    reorderChapters() {
        const reorder = (chapters) => {
            chapters.forEach((chapter, index) => {
                chapter.order = index;
                if (chapter.children) {
                    reorder(chapter.children);
                }
            });
        };
        reorder(this.chapters);
    }
    
    getNextChapterOrder(parentId = null) {
        if (parentId) {
            const parent = this.findChapter(parentId);
            return parent && parent.children ? parent.children.length : 0;
        }
        return this.chapters.length;
    }
    
    // Statistics
    updateStats() {
        const countWords = (chapters) => {
            let count = 0;
            chapters.forEach(chapter => {
                count += chapter.getWordCount();
                if (chapter.children) {
                    count += countWords(chapter.children);
                }
            });
            return count;
        };
        
        const countChapters = (chapters) => {
            let count = chapters.length;
            chapters.forEach(chapter => {
                if (chapter.children) {
                    count += countChapters(chapter.children);
                }
            });
            return count;
        };
        
        this.stats.word_count = countWords(this.chapters);
        this.stats.chapter_count = countChapters(this.chapters);
        this.stats.page_count = Math.ceil(this.stats.word_count / 250); // Approx 250 words per page
        this.updated = new Date().toISOString();
    }
    
    // Export methods
    toJSON() {
        return {
            id: this.id,
            created: this.created,
            updated: this.updated,
            version: this.version,
            metadata: this.metadata,
            structure: this.structure,
            chapters: this.chapters,
            bibliography: this.bibliography,
            settings: this.settings,
            stats: this.stats
        };
    }
}

class Chapter {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.thesis_id = data.thesis_id;
        this.parent_id = data.parent_id || null;
        this.order = data.order || 0;
        this.level = data.level || (data.parent_id ? 1 : 0);
        
        this.title = data.title || '';
        this.content = data.content || '';
        this.notes = data.notes || '';
        
        this.created = data.created || new Date().toISOString();
        this.updated = data.updated || new Date().toISOString();
        
        this.children = data.children || [];
        
        // Chapter settings
        this.settings = {
            show_in_toc: data.settings?.show_in_toc !== false,
            page_break_before: data.settings?.page_break_before || false,
            numbering_style: data.settings?.numbering_style || 'decimal'
        };
    }
    
    generateId() {
        return 'chapter_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    getWordCount() {
        // Simple word count - can be enhanced
        const text = this.content.replace(/<[^>]*>/g, ''); // Strip HTML
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }
    
    getChapterNumber() {
        // Generate chapter number based on hierarchy
        // This would be calculated by the parent thesis
        return '';
    }
    
    toJSON() {
        return {
            id: this.id,
            thesis_id: this.thesis_id,
            parent_id: this.parent_id,
            order: this.order,
            level: this.level,
            title: this.title,
            content: this.content,
            notes: this.notes,
            created: this.created,
            updated: this.updated,
            children: this.children,
            settings: this.settings
        };
    }
}

module.exports = { Thesis, Chapter };
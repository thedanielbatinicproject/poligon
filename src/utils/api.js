
export const apiCall = async (url, options = {}) => {
    
    const safeStringify = (obj) => {
        const seen = new Set();
        return JSON.stringify(obj, (key, val) => {
            if (val != null && typeof val === "object") {
                if (seen.has(val)) {
                    return {}; 
                }
                seen.add(val);
            }
            return val;
        });
    };

    
    let processedOptions = { ...options };
    if (processedOptions.body && typeof processedOptions.body !== 'string') {
        processedOptions.body = safeStringify(processedOptions.body);
    }

    const defaultOptions = {
        credentials: 'include', 
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...processedOptions
    };

    try {
        const response = await fetch(url, defaultOptions);
        
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            
            
            if (response.status === 401) {

                
            }
            
            return { success: response.ok, data, status: response.status };
        } else {
            return { success: response.ok, data: null, status: response.status };
        }
    } catch (error) {
        console.error('❌ API call error:', error);
        return { success: false, error: error.message, status: 0 };
    }
};


export const authAPI = {
    login: (credentials) => apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
    }),
    
    logout: () => apiCall('/api/auth/logout', {
        method: 'POST'
    }),
    
    status: () => apiCall('/api/auth/status', {
        method: 'GET'
    })
};

// Helper funkcije za theses API
export const thesesAPI = {
    getAll: () => apiCall('/api/theses'),
    
    getById: (id) => apiCall(`/api/theses/${id}`),
    
    create: (thesisData) => apiCall('/api/theses', {
        method: 'POST',
        body: JSON.stringify(thesisData)
    }),
    
    update: (id, thesisData) => apiCall(`/api/theses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(thesisData)
    }),
    
    delete: (id) => apiCall(`/api/theses/${id}`, {
        method: 'DELETE'
    }),
    
    // Chapter operations
    getChapters: (thesisId) => apiCall(`/api/theses/${thesisId}/chapters`),
    
    addChapter: (thesisId, chapterData) => apiCall(`/api/theses/${thesisId}/chapters`, {
        method: 'POST',
        body: JSON.stringify(chapterData)
    }),
    
    updateChapter: (thesisId, chapterId, chapterData) => apiCall(`/api/theses/${thesisId}/chapters/${chapterId}`, {
        method: 'PUT',
        body: JSON.stringify(chapterData)
    }),
    
    deleteChapter: (thesisId, chapterId) => apiCall(`/api/theses/${thesisId}/chapters/${chapterId}`, {
        method: 'DELETE'
    })
};

// Notes API
export const notesAPI = {
    
    getNotes: (thesisId, chapterId) => {
        let url = '/api/notes';
        const params = new URLSearchParams();
        
        if (thesisId) params.append('thesisId', thesisId);
        if (chapterId) params.append('chapterId', chapterId);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        return apiCall(url);
    },
    
    
    createNote: (noteData) => apiCall('/api/notes', {
        method: 'POST',
        body: JSON.stringify(noteData)
    }),
    
    
    updateNote: (noteId, noteData) => apiCall(`/api/notes/${noteId}`, {
        method: 'PUT',
        body: JSON.stringify(noteData)
    }),
    
    
    approveNote: (noteId, approved) => apiCall(`/api/notes/${noteId}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ approved })
    }),
    
    
    deleteNote: (noteId) => apiCall(`/api/notes/${noteId}`, {
        method: 'DELETE'
    })
};

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
        const authErr = response.headers.get('X-Auth-Error');
        if (!response.ok) {
            const msgMap = {
                'unauthorized': 'Niste prijavljeni.',
                'missing-id': 'Nedostaje ID dokumenta.',
                'forbidden': 'Nemate dozvolu za ovu akciju.',
                'server-error': 'Greška na serveru.',
                'fetch-theses': 'Greška kod dohvaćanja popisa dokumenata.',
                'thesis-not-found': 'Dokument nije pronađen.',
                'create-thesis': 'Greška kod kreiranja dokumenta.',
                'update-thesis': 'Greška kod ažuriranja dokumenta.',
                'delete-thesis': 'Greška kod brisanja dokumenta.',
                'add-chapter': 'Greška kod dodavanja poglavlja.',
                'update-chapter': 'Greška kod ažuriranja poglavlja.',
                'delete-chapter': 'Greška kod brisanja poglavlja.'
            };
            const msg = authErr ? (msgMap[authErr] || authErr) : (response.statusText || `HTTP ${response.status}`);
            if (window.showNotification) window.showNotification(msg, 'error', 6000);
            return { success: false, error: msg, status: response.status };
        }
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            return { success: response.ok, data, status: response.status };
        } else {
            return { success: response.ok, data: null, status: response.status };
        }
    } catch (error) {
        if (window.showNotification) window.showNotification(error.message, 'error', 6000);
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

export const thesesAPI = {
    getAll: () => apiCall(`/api/theses?_t=${Date.now()}`),
    
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
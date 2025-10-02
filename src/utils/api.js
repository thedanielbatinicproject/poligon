// Helper funkcija za API pozive sa cookie podrške
export const apiCall = async (url, options = {}) => {
    // Sigurno serijaliziranje da izbjegnemo ciklične reference
    const safeStringify = (obj) => {
        const seen = new Set();
        return JSON.stringify(obj, (key, val) => {
            if (val != null && typeof val === "object") {
                if (seen.has(val)) {
                    return {}; // Ukloni ciklične reference
                }
                seen.add(val);
            }
            return val;
        });
    };

    // Ako je body string, koristi ga direktno, inače sigurno serializiraj
    let processedOptions = { ...options };
    if (processedOptions.body && typeof processedOptions.body !== 'string') {
        processedOptions.body = safeStringify(processedOptions.body);
    }

    const defaultOptions = {
        credentials: 'include', // Uvek uključi cookies
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...processedOptions
    };

    try {
        const response = await fetch(url, defaultOptions);
        
        // Proveri da li je response JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            
            // Ako je auth error, možemo ovde da rukujemo
            if (response.status === 401) {
                console.log('🔒 Unauthorized - redirecting to login');
                // Ovde možemo da redirectujemo na login ili emitujemo event
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

// Specifične helper funkcije za auth
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
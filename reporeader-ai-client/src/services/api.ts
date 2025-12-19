import axios from 'axios';

// 1. Base Configuration
// We point to localhost:5555 for now. In Phase 6 (Deployment), we will change this.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5555';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 2. Interceptor to add JWT Token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 3. Auth API
export const authApi = {
    login: async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        return res.data; // Returns { token, user }
    },
    register: async (email: string, password: string, name: string) => {
        const res = await api.post('/auth/register', { email, password, name });
        return res.data; // Returns { token, user }
    },
    getMe: async () => {
        // We use the interceptor or manually attach token. 
        // Assuming api.get handles headers via interceptor if set:
        const response = await api.get('/auth/me');
        return response.data;
    }
};

// 4. Repo API
export const repoApi = {
    // Start ingestion
    ingestRepo: async (repoUrl: string, repoName: string) => {
        const res = await api.post('/api/ingest', { repoUrl, repoName });
        return res.data; // Returns { message, id, status }
    },

    // Get all user repos
    getUserRepos: async () => {
        const res = await api.get('/api/repos');
        return res.data;
    },

    // Get a specific repo (for the graph)
    getRepo: async (repoId: string) => {
        // --- FIX: Added /status to match backend route ---
        const res = await api.get(`/api/repos/${repoId}/status`);
        return res.data;
    },

    // Delete a repo
    deleteRepo: async (repoId: string) => {
        const res = await api.delete(`/api/repos/${repoId}`);
        return res.data;
    },

    getRepoGraph: async (repoId: string) => {
        const res = await api.get(`/api/repos/${repoId}/graph`);
        return res.data;
    },
    getFileContent: async (fileId: string) => {
        const res = await api.get(`/api/repos/files/${fileId}`);
        return res.data;
    }
};

// 5. Chat API
export const chatApi = {
    sendMessage: async (repoId: string, question: string) => {
        const res = await api.post(`/api/chat/${repoId}`, { question });
        return res.data; // Returns { answer, targetNode, highlight }
    }
};

export const systemApi = {
    checkHealth: async () => {
        const res = await api.get('/api/health');
        return res.data;
    }
};


export default api;
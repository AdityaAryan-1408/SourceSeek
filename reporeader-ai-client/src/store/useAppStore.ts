import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, repoApi, chatApi } from '../services/api';


interface User { id: string; email: string; name: string; }
interface Repository { id: string; name: string; url: string; status: 'PENDING' | 'INGESTING' | 'COMPLETED' | 'FAILED'; }
interface ChatMessage { sender: 'user' | 'ai'; message: string; sources?: { filePath: string; startLine: number; endLine: number }[]; }
interface Highlight { startLine: number; endLine: number; }

interface AppState {
    currentUser: User | null;
    savedRepos: Repository[];
    chatHistory: ChatMessage[];

    isLoading: boolean;
    error: string | null;
    selectedNodeId: string | null;
    currentHighlight: Highlight | null;
    reactFlowInstance: any;

    analyzingRepoId: string | null;
    analysisCurrentStep: number;

    // Auth
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => void;
    verifySession: () => Promise<void>;

    // Repos
    fetchRepos: () => Promise<void>;
    addRepo: (url: string, name: string) => Promise<void>;
    deleteRepo: (id: string) => Promise<void>;

    // Chat
    askQuestion: (repoId: string, question: string) => Promise<void>;
    clearChat: () => void;

    // UI Setters
    setSelectedNodeId: (nodeId: string | null) => void;
    setReactFlowInstance: (instance: any) => void;
    setCurrentHighlight: (highlight: Highlight | null) => void;
    setError: (error: string | null) => void;

    setAnalyzingRepoId: (id: string | null) => void;
    setAnalysisCurrentStep: (step: number) => void; 
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            
            currentUser: null,
            savedRepos: [],
            chatHistory: [],
            isLoading: false,
            error: null,
            selectedNodeId: null,
            currentHighlight: null,
            reactFlowInstance: null,
            analyzingRepoId: null,
            analysisCurrentStep: 0,

            setAnalyzingRepoId: (id) => set({ analyzingRepoId: id }),
            setAnalysisCurrentStep: (step) => set({ analysisCurrentStep: step }), 

            verifySession: async () => {
                const token = localStorage.getItem('token');
                if (!token) return;
                try {
                    const user = await authApi.getMe();
                    set({ currentUser: user });
                } catch (err) {
                    console.error("Session verification failed", err);
                    localStorage.removeItem('token');
                    set({ currentUser: null });
                }
            },

            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const data = await authApi.login(email, password);
                    localStorage.setItem('token', data.token);
                    set({ currentUser: data.user, isLoading: false });
                } catch (err: any) {
                    set({ error: err.response?.data?.error || 'Login failed', isLoading: false });
                }
            },

            register: async (email, password, name) => {
                set({ isLoading: true, error: null });
                try {
                    const data = await authApi.register(email, password, name);
                    localStorage.setItem('token', data.token);
                    set({ currentUser: data.user, isLoading: false });
                } catch (err: any) {
                    set({ error: err.response?.data?.error || 'Registration failed', isLoading: false });
                }
            },

            logout: () => {
                localStorage.removeItem('token');
                set({ currentUser: null, savedRepos: [], chatHistory: [], analyzingRepoId: null, analysisCurrentStep: 0 });
            },

            checkAuth: () => {
                const token = localStorage.getItem('token');
                if (!token) {
                    set({ currentUser: null });
                }
            },

            fetchRepos: async () => {
                set({ isLoading: true, error: null });
                try {
                    const repos = await repoApi.getUserRepos();
                    set({ savedRepos: repos, isLoading: false });
                } catch (err: any) {
                    console.error(err);
                    set({ error: 'Failed to fetch repositories', isLoading: false });
                }
            },

            addRepo: async (url, name) => {
                set({ isLoading: true, error: null });
                try {
                    await repoApi.ingestRepo(url, name);
                    await get().fetchRepos();
                    set({ isLoading: false });
                } catch (err: any) {
                    set({ error: err.response?.data?.message || 'Failed to add repository', isLoading: false });
                }
            },

            deleteRepo: async (id) => {
                try {
                    await repoApi.deleteRepo(id);
                    set((state) => ({
                        savedRepos: state.savedRepos.filter((r) => r.id !== id)
                    }));
                } catch (err: any) {
                    set({ error: 'Failed to delete repository' });
                }
            },

            askQuestion: async (repoId, question) => {
                set((state) => ({
                    chatHistory: [...state.chatHistory, { sender: 'user', message: question }],
                    isLoading: true,
                    error: null
                }));

                try {
                    const response = await chatApi.sendMessage(repoId, question);
                    const sources = response.targetNode ? [{
                        filePath: response.targetNode,
                        startLine: response.highlight.startLine,
                        endLine: response.highlight.endLine
                    }] : [];

                    set((state) => ({
                        chatHistory: [...state.chatHistory, {
                            sender: 'ai',
                            message: response.answer,
                            sources: sources
                        }],
                        isLoading: false
                    }));

                    if (response.targetNode) {
                        const targetId = response.targetNode;
                        set({
                            selectedNodeId: targetId,
                            currentHighlight: response.highlight
                        });
                        const { reactFlowInstance } = get();
                        if (reactFlowInstance) {
                            const node = reactFlowInstance.getNode(targetId);
                            if (node) {
                                reactFlowInstance.fitView({ nodes: [node], duration: 1000, padding: 0.2 });
                            }
                        }
                    }

                } catch (err: any) {
                    set((state) => ({
                        chatHistory: [...state.chatHistory, { sender: 'ai', message: "Sorry, I encountered an error answering that." }],
                        isLoading: false
                    }));
                }
            },

            clearChat: () => set({ chatHistory: [], currentHighlight: null, selectedNodeId: null }),

      
            setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
            setCurrentHighlight: (highlight: Highlight | null) => set({ currentHighlight: highlight }),
            setReactFlowInstance: (instance) => set({ reactFlowInstance: instance }),
            setError: (error) => set({ error }),
        }),
        {
            name: 'reporeader-storage',
            partialize: (state) => ({
                currentUser: state.currentUser,
                savedRepos: state.savedRepos,
                analyzingRepoId: state.analyzingRepoId,
                analysisCurrentStep: state.analysisCurrentStep 
            }),
        }
    )
);
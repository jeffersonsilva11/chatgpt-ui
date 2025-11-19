import { create } from 'zustand';
import { UserProfile, LoginRequest, WorkflowSummary } from '@/lib/types';

interface AuthStore {
  // State
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  selectedWorkflow: WorkflowSummary | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setSelectedWorkflow: (workflow: WorkflowSummary | null) => void;
  clearError: () => void;
  checkAuth: () => Promise<boolean>;
}

const TOKEN_KEY = 'auth_token';

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  selectedWorkflow: null,

  // Login
  login: async (credentials: LoginRequest) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao fazer login');
      }

      // Salvar token
      localStorage.setItem(TOKEN_KEY, data.token);

      // Selecionar primeiro workflow automaticamente
      const firstWorkflow = data.user.workflows[0] || null;

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        selectedWorkflow: firstWorkflow,
        isLoading: false,
        error: null,
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao fazer login';
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: message,
      });
      throw error;
    }
  },

  // Logout
  logout: async () => {
    const { token } = get();

    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      // Limpar estado mesmo se houver erro
      localStorage.removeItem(TOKEN_KEY);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        selectedWorkflow: null,
        error: null,
      });
    }
  },

  // Carregar dados do usuário
  loadUser: async () => {
    const { token } = get();

    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    set({ isLoading: true });

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token inválido ou expirado');
      }

      const user: UserProfile = await response.json();

      // Selecionar primeiro workflow se ainda não tiver selecionado
      const currentWorkflow = get().selectedWorkflow;
      const selectedWorkflow = currentWorkflow || user.workflows[0] || null;

      set({
        user,
        isAuthenticated: true,
        selectedWorkflow,
        isLoading: false,
        error: null,
      });

    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      // Token inválido, fazer logout
      localStorage.removeItem(TOKEN_KEY);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  // Verificar autenticação
  checkAuth: async (): Promise<boolean> => {
    const { token, user } = get();

    if (!token) {
      return false;
    }

    if (user) {
      return true;
    }

    // Tentar carregar usuário
    await get().loadUser();
    return get().isAuthenticated;
  },

  // Selecionar workflow
  setSelectedWorkflow: (workflow: WorkflowSummary | null) => {
    set({ selectedWorkflow: workflow });
  },

  // Limpar erro
  clearError: () => {
    set({ error: null });
  },
}));

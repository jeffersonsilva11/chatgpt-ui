import { create } from 'zustand';
import { Conversation, Message, AppSettings } from '@/lib/types';
import {
  getConversations,
  saveConversation,
  deleteConversation as deleteConversationStorage,
  getCurrentConversationId,
  setCurrentConversationId,
  getSettings,
  saveSettings as saveSettingsStorage,
  clearAllConversations as clearAllConversationsStorage,
} from '@/lib/utils/storage';

interface ChatStore {
  // State
  conversations: Conversation[];
  currentConversationId: string | null;
  settings: AppSettings;
  sidebarOpen: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  createConversation: (workflowId?: string) => Promise<string>;
  setCurrentConversation: (id: string | null) => void;
  getCurrentConversation: () => Conversation | null;
  addMessage: (conversationId: string, message: Message) => Promise<void>;
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  clearAllConversations: () => void;
  loadSettings: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  conversations: [],
  currentConversationId: null,
  settings: getSettings(),
  sidebarOpen: true,
  isLoading: false,
  error: null,

  // Actions
  loadConversations: async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

      if (!token) {
        // Fallback to localStorage if not authenticated
        const conversations = getConversations();
        const currentId = getCurrentConversationId();
        set({ conversations, currentConversationId: currentId });
        return;
      }

      const response = await fetch('/api/conversations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load conversations');
      }

      const data = await response.json();

      // Convert API format to store format
      const conversations: Conversation[] = await Promise.all(
        data.conversations.map(async (conv: any) => {
          // Fetch messages for each conversation
          const messagesResponse = await fetch(`/api/conversations/${conv.id}/messages`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const messagesData = await messagesResponse.json();

          return {
            id: conv.id,
            title: conv.title,
            workflowId: conv.workflowId,
            messages: messagesData.messages || [],
            createdAt: new Date(conv.createdAt).getTime(),
            updatedAt: new Date(conv.updatedAt).getTime(),
          };
        })
      );

      set({ conversations });
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Fallback to localStorage on error
      const conversations = getConversations();
      const currentId = getCurrentConversationId();
      set({ conversations, currentConversationId: currentId });
    }
  },

  createConversation: async (workflowId?: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    if (!token) {
      // Fallback to localStorage if not authenticated
      const newConversation: Conversation = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: 'New Conversation',
        messages: [],
        workflowId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      saveConversation(newConversation);
      setCurrentConversationId(newConversation.id);

      set((state) => ({
        conversations: [newConversation, ...state.conversations],
        currentConversationId: newConversation.id,
      }));

      return newConversation.id;
    }

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'New Conversation',
          workflowId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();
      const newConversation: Conversation = {
        id: data.conversation.id,
        title: data.conversation.title,
        messages: [],
        workflowId: data.conversation.workflowId,
        createdAt: new Date(data.conversation.createdAt).getTime(),
        updatedAt: new Date(data.conversation.updatedAt).getTime(),
      };

      set((state) => ({
        conversations: [newConversation, ...state.conversations],
        currentConversationId: newConversation.id,
      }));

      return newConversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      // Fallback to localStorage
      const newConversation: Conversation = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: 'New Conversation',
        messages: [],
        workflowId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      saveConversation(newConversation);
      setCurrentConversationId(newConversation.id);

      set((state) => ({
        conversations: [newConversation, ...state.conversations],
        currentConversationId: newConversation.id,
      }));

      return newConversation.id;
    }
  },

  setCurrentConversation: (id: string | null) => {
    setCurrentConversationId(id);
    set({ currentConversationId: id });
  },

  getCurrentConversation: () => {
    const { conversations, currentConversationId } = get();
    return conversations.find((c) => c.id === currentConversationId) || null;
  },

  addMessage: async (conversationId: string, message: Message) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    const { conversations } = get();
    const conversation = conversations.find((c) => c.id === conversationId);

    if (!conversation) return;

    // Update locally immediately for responsiveness
    const updatedMessages = [...conversation.messages, message];
    const updatedConversation: Conversation = {
      ...conversation,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? updatedConversation : c
      ),
    }));

    if (!token) {
      // Fallback to localStorage if not authenticated
      // Auto-generate title from first user message
      if (
        updatedMessages.length === 1 &&
        message.role === 'user' &&
        conversation.title === 'New Conversation'
      ) {
        const firstMessage = message.content.text || 'Conversation';
        const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
        updatedConversation.title = title;
      }

      saveConversation(updatedConversation);
      return;
    }

    try {
      // Save to database
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: message.role,
          content: message.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add message');
      }

      // Title is auto-updated on backend, no need to do it here
    } catch (error) {
      console.error('Error adding message:', error);
      // Already updated locally, continue working
      // Fallback to localStorage
      saveConversation(updatedConversation);
    }
  },

  updateConversationTitle: async (conversationId: string, title: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    const { conversations } = get();
    const conversation = conversations.find((c) => c.id === conversationId);

    if (!conversation) return;

    const updatedConversation: Conversation = {
      ...conversation,
      title,
      updatedAt: Date.now(),
    };

    // Update locally immediately
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? updatedConversation : c
      ),
    }));

    if (!token) {
      // Fallback to localStorage
      saveConversation(updatedConversation);
      return;
    }

    try {
      // Update in database
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error('Failed to update conversation title');
      }
    } catch (error) {
      console.error('Error updating conversation title:', error);
      // Already updated locally
      saveConversation(updatedConversation);
    }
  },

  deleteConversation: async (id: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    // Delete locally immediately
    const { currentConversationId } = get();
    const updates: Partial<ChatStore> = {
      conversations: get().conversations.filter((c) => c.id !== id),
    };

    if (currentConversationId === id) {
      updates.currentConversationId = null;
      setCurrentConversationId(null);
    }

    set(updates);

    if (!token) {
      // Fallback to localStorage
      deleteConversationStorage(id);
      return;
    }

    try {
      // Delete from database
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      // Already deleted locally
      deleteConversationStorage(id);
    }
  },

  clearAllConversations: () => {
    clearAllConversationsStorage();
    set({
      conversations: [],
      currentConversationId: null,
    });
  },

  loadSettings: () => {
    const settings = getSettings();
    set({ settings });

    // Apply theme
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    }
  },

  updateSettings: (newSettings: Partial<AppSettings>) => {
    const { settings } = get();
    const updatedSettings = { ...settings, ...newSettings };

    saveSettingsStorage(updatedSettings);
    set({ settings: updatedSettings });

    // Apply theme
    if (typeof window !== 'undefined' && newSettings.theme) {
      document.documentElement.classList.toggle('dark', newSettings.theme === 'dark');
    }

    // Apply branding colors
    if (typeof window !== 'undefined' && newSettings.branding) {
      const root = document.documentElement;
      const branding = updatedSettings.branding;

      // Convert hex to HSL for CSS variables
      if (branding.primaryColor) {
        const hsl = hexToHSL(branding.primaryColor);
        root.style.setProperty('--primary', hsl);
      }
    }
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setError: (error: string | null) => set({ error }),
}));

// Helper function to convert hex to HSL
function hexToHSL(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lightness = Math.round(l * 100);

  return `${h} ${s}% ${lightness}%`;
}

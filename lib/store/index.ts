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
  loadConversations: () => void;
  createConversation: () => string;
  setCurrentConversation: (id: string | null) => void;
  getCurrentConversation: () => Conversation | null;
  addMessage: (conversationId: string, message: Message) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;
  deleteConversation: (id: string) => void;
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
  loadConversations: () => {
    const conversations = getConversations();
    const currentId = getCurrentConversationId();
    set({ conversations, currentConversationId: currentId });
  },

  createConversation: () => {
    const newConversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: 'New Conversation',
      messages: [],
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
  },

  setCurrentConversation: (id: string | null) => {
    setCurrentConversationId(id);
    set({ currentConversationId: id });
  },

  getCurrentConversation: () => {
    const { conversations, currentConversationId } = get();
    return conversations.find((c) => c.id === currentConversationId) || null;
  },

  addMessage: (conversationId: string, message: Message) => {
    const { conversations } = get();
    const conversation = conversations.find((c) => c.id === conversationId);

    if (!conversation) return;

    const updatedMessages = [...conversation.messages, message];
    const updatedConversation: Conversation = {
      ...conversation,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };

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

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? updatedConversation : c
      ),
    }));
  },

  updateConversationTitle: (conversationId: string, title: string) => {
    const { conversations } = get();
    const conversation = conversations.find((c) => c.id === conversationId);

    if (!conversation) return;

    const updatedConversation: Conversation = {
      ...conversation,
      title,
      updatedAt: Date.now(),
    };

    saveConversation(updatedConversation);

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? updatedConversation : c
      ),
    }));
  },

  deleteConversation: (id: string) => {
    deleteConversationStorage(id);

    const { currentConversationId } = get();
    const updates: Partial<ChatStore> = {
      conversations: get().conversations.filter((c) => c.id !== id),
    };

    if (currentConversationId === id) {
      updates.currentConversationId = null;
      setCurrentConversationId(null);
    }

    set(updates);
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

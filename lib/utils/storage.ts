import { Conversation, AppSettings, BrandingConfig, ProviderConfig } from '@/lib/types';

const STORAGE_KEYS = {
  CONVERSATIONS: 'ai-chat-conversations',
  CURRENT_CONVERSATION: 'ai-chat-current-conversation',
  SETTINGS: 'ai-chat-settings',
} as const;

// Default settings
export const DEFAULT_BRANDING: BrandingConfig = {
  companyName: 'AI Chat',
  primaryColor: '#3b82f6',
  secondaryColor: '#60a5fa',
  backgroundColor: '#ffffff',
  textColor: '#000000',
};

export const DEFAULT_PROVIDER: ProviderConfig = {
  type: 'n8n',
  n8n: {
    webhookUrl: '',
    headers: {},
    timeout: 30000,
  },
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  branding: DEFAULT_BRANDING,
  provider: DEFAULT_PROVIDER,
  fontSize: 'medium',
};

// Conversations
export const getConversations = (): Conversation[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
  return data ? JSON.parse(data) : [];
};

export const saveConversations = (conversations: Conversation[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
};

export const getConversation = (id: string): Conversation | null => {
  const conversations = getConversations();
  return conversations.find((c) => c.id === id) || null;
};

export const saveConversation = (conversation: Conversation): void => {
  const conversations = getConversations();
  const index = conversations.findIndex((c) => c.id === conversation.id);

  if (index >= 0) {
    conversations[index] = conversation;
  } else {
    conversations.push(conversation);
  }

  saveConversations(conversations);
};

export const deleteConversation = (id: string): void => {
  const conversations = getConversations();
  const filtered = conversations.filter((c) => c.id !== id);
  saveConversations(filtered);
};

export const clearAllConversations = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_CONVERSATION);
};

// Current conversation
export const getCurrentConversationId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.CURRENT_CONVERSATION);
};

export const setCurrentConversationId = (id: string | null): void => {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_CONVERSATION, id);
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_CONVERSATION);
  }
};

// Settings
export const getSettings = (): AppSettings => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AppSettings): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

// Export conversation
export const exportConversationAsText = (conversation: Conversation): string => {
  let text = `${conversation.title}\n`;
  text += `Created: ${new Date(conversation.createdAt).toLocaleString()}\n`;
  text += `Updated: ${new Date(conversation.updatedAt).toLocaleString()}\n\n`;
  text += '='.repeat(50) + '\n\n';

  conversation.messages.forEach((message) => {
    const role = message.role === 'user' ? 'You' : 'Assistant';
    text += `${role} (${new Date(message.timestamp).toLocaleString()}):\n`;
    text += `${message.content.text || '[Media content]'}\n\n`;
  });

  return text;
};

export const exportConversationAsJSON = (conversation: Conversation): string => {
  return JSON.stringify(conversation, null, 2);
};

export const downloadFile = (content: string, filename: string, type: string): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

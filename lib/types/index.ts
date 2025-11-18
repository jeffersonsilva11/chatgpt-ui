// Message types
export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageContentType = 'text' | 'image' | 'audio' | 'mixed';

export interface MessageContent {
  type: MessageContentType;
  text?: string;
  imageUrl?: string;
  imageBase64?: string;
  audioUrl?: string;
  audioBase64?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: MessageContent;
  timestamp: number;
}

// Conversation types
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// AI Provider types
export type AIProvider = 'n8n' | 'openai' | 'gemini' | 'grok';

export interface N8NConfig {
  webhookUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export interface GrokConfig {
  apiKey: string;
  model?: string;
}

export interface ProviderConfig {
  type: AIProvider;
  n8n?: N8NConfig;
  openai?: OpenAIConfig;
  gemini?: GeminiConfig;
  grok?: GrokConfig;
}

// Branding types
export interface BrandingConfig {
  logo?: string; // base64 or URL
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
}

// Settings types
export interface AppSettings {
  theme: 'light' | 'dark';
  branding: BrandingConfig;
  provider: ProviderConfig;
  fontSize: 'small' | 'medium' | 'large';
}

// N8N Request/Response types
export interface N8NRequest {
  mensagem: string;
  tipo: MessageContentType;
  arquivo?: string; // base64 or URL
  historico: Array<{
    role: MessageRole;
    content: string;
  }>;
  metadata: {
    conversaId: string;
    timestamp: string;
  };
}

export interface N8NResponse {
  resposta: string;
  tipo: MessageContentType;
  imagem?: string;
  dados?: Record<string, unknown>;
}

// Audio recording types
export interface AudioRecording {
  blob: Blob;
  url: string;
  duration: number;
}

// Export types
export type ExportFormat = 'txt' | 'json' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  conversationId: string;
  includeMetadata?: boolean;
}

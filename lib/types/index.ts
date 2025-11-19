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
  workflowId?: string; // ID do workflow associado (RH, TI, etc)
  createdAt: number;
  updatedAt: number;
}

// AI Provider types
export type AIProvider = 'n8n' | 'openai' | 'gemini' | 'grok';

export interface N8NConfig {
  webhookUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  useProxy?: boolean; // Use Next.js API route proxy to avoid CORS (default: true)
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
    workflowId?: string; // ID do workflow selecionado
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

// ========================================
// Auth & User types
// ========================================

export type AuthProvider = 'local' | 'google' | 'microsoft' | 'ad';
export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'pending' | 'inactive';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string; // null para SSO
  authProvider: AuthProvider;
  role: UserRole;
  status: UserStatus;
  providerUserId?: string; // ID do usuário no provider (Google, Microsoft)
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface Workflow {
  id: string; // 'master', 'rh', 'ti', 'financeiro', 'geral'
  name: string; // 'Master', 'RH', 'TI'
  webhookUrl: string; // URL do N8N workflow
  description?: string;
  icon?: string; // Emoji ou nome do ícone
  isMaster: boolean; // Se true, tem acesso a tudo
  allowedDepartments: string[]; // ['RH'] ou ['*'] para master
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWorkflow {
  userId: string;
  workflowId: string;
  grantedAt: Date;
  grantedBy?: string; // ID do admin que deu permissão
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface PendingUser {
  id: string;
  email: string;
  name: string;
  authProvider: Exclude<AuthProvider, 'local'>; // Não pode ser local
  providerUserId?: string;
  avatarUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string; // ID do admin que aprovou/rejeitou
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string; // 'login', 'logout', 'create_user', 'grant_permission', etc
  resourceType?: string; // 'user', 'workflow', 'conversation', etc
  resourceId?: string; // ID do recurso afetado
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ========================================
// Auth Request/Response types
// ========================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: UserProfile;
  error?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  workflows: WorkflowSummary[]; // Workflows que o usuário tem acesso
}

export interface WorkflowSummary {
  id: string;
  name: string;
  webhookUrl: string; // URL do webhook N8N para este workflow
  icon?: string;
  description?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number; // issued at
  exp?: number; // expiration
}

// ========================================
// Database query result types
// ========================================

export interface DbConversation {
  id: string;
  user_id: string;
  workflow_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: MessageContent; // JSONB
  created_at: Date;
}

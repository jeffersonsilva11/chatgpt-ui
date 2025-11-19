-- ========================================
-- ChatApp Database Schema
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- Table: workflows
-- Armazena os workflows/contextos disponíveis (RH, TI, Financeiro, Master, etc)
-- ========================================
CREATE TABLE IF NOT EXISTS workflows (
  id VARCHAR(50) PRIMARY KEY,           -- 'master', 'rh', 'ti', 'financeiro'
  name VARCHAR(100) NOT NULL,           -- 'Master', 'RH', 'TI'
  webhook_url VARCHAR(500) NOT NULL,    -- URL do N8N workflow
  description TEXT,                      -- Descrição do workflow
  icon VARCHAR(50),                      -- Ícone para UI (emoji ou nome do ícone)
  is_master BOOLEAN DEFAULT false,       -- Se true, tem acesso a tudo
  allowed_departments VARCHAR[] DEFAULT '{}', -- Departamentos permitidos
  is_active BOOLEAN DEFAULT true,        -- Se o workflow está ativo
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- Table: users
-- Armazena os usuários do sistema
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),                -- null se SSO
  auth_provider VARCHAR(20) DEFAULT 'local', -- 'local', 'google', 'microsoft', 'ad'
  role VARCHAR(20) DEFAULT 'user',           -- 'admin', 'user'
  status VARCHAR(20) DEFAULT 'active',       -- 'active', 'pending', 'inactive'

  -- SSO metadata
  provider_user_id VARCHAR(255),             -- ID do usuário no provider (Google, Microsoft)
  avatar_url VARCHAR(500),                   -- URL do avatar

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,

  -- Índices
  CONSTRAINT chk_auth_provider CHECK (auth_provider IN ('local', 'google', 'microsoft', 'ad')),
  CONSTRAINT chk_role CHECK (role IN ('admin', 'user')),
  CONSTRAINT chk_status CHECK (status IN ('active', 'pending', 'inactive'))
);

-- ========================================
-- Table: user_workflows
-- Relação muitos-para-muitos entre usuários e workflows (permissões)
-- ========================================
CREATE TABLE IF NOT EXISTS user_workflows (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workflow_id VARCHAR(50) REFERENCES workflows(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES users(id),      -- Qual admin deu a permissão
  PRIMARY KEY (user_id, workflow_id)
);

-- ========================================
-- Table: conversations
-- Armazena as conversas dos usuários
-- ========================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workflow_id VARCHAR(50) REFERENCES workflows(id),
  title VARCHAR(500) DEFAULT 'New Conversation',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- Table: messages
-- Armazena as mensagens de cada conversa
-- ========================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,                 -- 'user', 'assistant'
  content JSONB NOT NULL,                    -- {type, text, imageUrl, audioUrl, etc}
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT chk_role CHECK (role IN ('user', 'assistant', 'system'))
);

-- ========================================
-- Table: sessions
-- Armazena as sessões ativas dos usuários (JWT tokens)
-- ========================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),                    -- IPv4 ou IPv6
  user_agent TEXT
);

-- ========================================
-- Table: pending_users
-- Armazena usuários que fizeram login via SSO mas ainda não foram aprovados
-- ========================================
CREATE TABLE IF NOT EXISTS pending_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  auth_provider VARCHAR(20) NOT NULL,
  provider_user_id VARCHAR(255),
  avatar_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending',      -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),

  CONSTRAINT chk_auth_provider_pending CHECK (auth_provider IN ('google', 'microsoft', 'ad')),
  CONSTRAINT chk_status_pending CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- ========================================
-- Table: audit_logs
-- Logs de auditoria (quem fez o quê, quando)
-- ========================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,              -- 'login', 'logout', 'create_user', 'grant_permission', etc
  resource_type VARCHAR(50),                 -- 'user', 'workflow', 'conversation', etc
  resource_id VARCHAR(255),                  -- ID do recurso afetado
  details JSONB,                             -- Detalhes adicionais
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- Índices para performance
-- ========================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

CREATE INDEX IF NOT EXISTS idx_user_workflows_user ON user_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workflows_workflow ON user_workflows(workflow_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_workflow ON conversations(workflow_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_pending_users_status ON pending_users(status);
CREATE INDEX IF NOT EXISTS idx_pending_users_email ON pending_users(email);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ========================================
-- Triggers para atualizar updated_at automaticamente
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Dados iniciais (seed data)
-- ========================================

-- Inserir workflow "Geral" padrão
INSERT INTO workflows (id, name, webhook_url, description, icon, is_master, is_active)
VALUES ('geral', 'Geral', 'http://n8n:5678/webhook/geral', 'Chat geral para todos os usuários', '🌐', false, true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- Comentários nas tabelas
-- ========================================
COMMENT ON TABLE workflows IS 'Workflows/contextos disponíveis (RH, TI, Financeiro, Master, etc)';
COMMENT ON TABLE users IS 'Usuários do sistema';
COMMENT ON TABLE user_workflows IS 'Permissões: relação entre usuários e workflows';
COMMENT ON TABLE conversations IS 'Conversas dos usuários com a IA';
COMMENT ON TABLE messages IS 'Mensagens de cada conversa';
COMMENT ON TABLE sessions IS 'Sessões ativas (JWT tokens)';
COMMENT ON TABLE pending_users IS 'Usuários SSO aguardando aprovação do admin';
COMMENT ON TABLE audit_logs IS 'Logs de auditoria do sistema';

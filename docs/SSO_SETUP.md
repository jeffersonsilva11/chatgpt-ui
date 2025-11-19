# SSO Setup Guide

Este guia explica como configurar Single Sign-On (SSO) com Google e Microsoft no ChatApp IA.

## Índice

1. [Google OAuth Setup](#google-oauth-setup)
2. [Microsoft OAuth Setup](#microsoft-oauth-setup)
3. [Configuração da Aplicação](#configuração-da-aplicação)
4. [Testando SSO](#testando-sso)
5. [Fluxo de Aprovação](#fluxo-de-aprovação)

---

## Google OAuth Setup

### 1. Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. No menu lateral, vá em **APIs & Services** → **Credentials**

### 2. Configurar OAuth Consent Screen

1. Clique em **OAuth consent screen**
2. Selecione **External** (para uso público) ou **Internal** (apenas para domínio Google Workspace)
3. Preencha as informações:
   - **App name**: ChatApp IA
   - **User support email**: seu email
   - **Developer contact**: seu email
4. Adicione **Scopes**:
   - `openid`
   - `email`
   - `profile`
5. Salve e continue

### 3. Criar Credenciais OAuth

1. Vá em **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
2. Tipo de aplicação: **Web application**
3. Nome: **ChatApp IA - Web**
4. **Authorized redirect URIs**:
   - Desenvolvimento: `http://localhost:3000/api/auth/google/callback`
   - Produção: `https://seu-dominio.com/api/auth/google/callback`
5. Clique em **Create**
6. Copie o **Client ID** e **Client Secret**

### 4. Configurar no .env

```bash
# Google OAuth
GOOGLE_CLIENT_ID=sua-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=sua-client-id.apps.googleusercontent.com
```

---

## Microsoft OAuth Setup

### 1. Criar App Registration no Azure Portal

1. Acesse [Azure Portal](https://portal.azure.com/)
2. Navegue para **Azure Active Directory** → **App registrations**
3. Clique em **New registration**

### 2. Configurar Aplicação

1. **Name**: ChatApp IA
2. **Supported account types**:
   - **Accounts in any organizational directory (Any Azure AD directory - Multitenant)**
   - OU **Accounts in this organizational directory only** (single tenant)
3. **Redirect URI**:
   - Platform: **Web**
   - URI: `http://localhost:3000/api/auth/microsoft/callback` (dev)
   - URI: `https://seu-dominio.com/api/auth/microsoft/callback` (prod)
4. Clique em **Register**

### 3. Criar Client Secret

1. No menu lateral, vá em **Certificates & secrets**
2. Clique em **New client secret**
3. Adicione uma descrição: **ChatApp IA Production**
4. Selecione validade: **24 months**
5. Clique em **Add**
6. **IMPORTANTE**: Copie o **Value** imediatamente (só é mostrado uma vez)

### 4. Configurar Permissões API

1. No menu lateral, vá em **API permissions**
2. Clique em **Add a permission**
3. Selecione **Microsoft Graph**
4. Selecione **Delegated permissions**
5. Adicione as permissões:
   - `openid`
   - `email`
   - `profile`
   - `User.Read`
6. Clique em **Grant admin consent** (se for administrador)

### 5. Configurar no .env

Copie o **Application (client) ID** da página Overview:

```bash
# Microsoft OAuth
MICROSOFT_CLIENT_ID=seu-application-client-id
MICROSOFT_CLIENT_SECRET=seu-client-secret-value
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=seu-application-client-id
```

---

## Configuração da Aplicação

### 1. Atualizar .env

Copie `.env.example` para `.env` e preencha as variáveis:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```bash
# URL da aplicação (IMPORTANTE!)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # DEV
# NEXT_PUBLIC_APP_URL=https://seu-dominio.com  # PROD

# Google OAuth
GOOGLE_CLIENT_ID=sua-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=sua-client-id.apps.googleusercontent.com

# Microsoft OAuth
MICROSOFT_CLIENT_ID=seu-application-client-id
MICROSOFT_CLIENT_SECRET=seu-client-secret-value
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=seu-application-client-id
```

### 2. Reiniciar Aplicação

Após atualizar o `.env`, reinicie o servidor:

```bash
npm run dev
```

---

## Testando SSO

### Google OAuth

1. Acesse `http://localhost:3000/login`
2. Clique no botão **Google**
3. Será redirecionado para o login do Google
4. Escolha uma conta Google
5. Autorize o acesso às permissões solicitadas
6. Será redirecionado de volta para a aplicação

**Primeira vez (novo usuário):**
- Você será criado como **pending user**
- Redirecionado para `/pending` (aguardando aprovação)
- Admin deve aprovar no Admin Panel

**Usuário já aprovado:**
- Login automático
- Redirecionado para `/` (painel principal)

### Microsoft OAuth

1. Acesse `http://localhost:3000/login`
2. Clique no botão **Microsoft**
3. Será redirecionado para o login da Microsoft
4. Insira email e senha da conta Microsoft/Azure AD
5. Autorize o acesso às permissões solicitadas
6. Será redirecionado de volta para a aplicação

**Fluxo é idêntico ao Google** (pending → aprovação → acesso)

---

## Fluxo de Aprovação

### Como Admin

1. **Ver Usuários Pendentes:**
   - Acesse `/admin`
   - Vá na aba **Pending Users**
   - Você verá lista de usuários aguardando aprovação

2. **Aprovar Usuário:**
   - Selecione os **workflows** que o usuário terá acesso
   - Clique em **Approve User**
   - Usuário recebe acesso imediatamente

3. **Rejeitar Usuário:**
   - Clique em **Reject**
   - Usuário NÃO terá acesso ao sistema

### Como Usuário SSO

1. **Primeira vez:**
   - Fazer login com Google/Microsoft
   - Será redirecionado para `/pending`
   - Página faz polling a cada 10 segundos
   - Quando admin aprovar, redirecionamento automático para `/`

2. **Login subsequente:**
   - Clique no botão SSO
   - Login automático (se já aprovado)
   - Redirecionado para painel principal

---

## Troubleshooting

### Erro: "Google OAuth não está configurado"

**Causa:** Variáveis de ambiente não estão definidas ou incorretas

**Solução:**
1. Verifique se `GOOGLE_CLIENT_ID` e `NEXT_PUBLIC_GOOGLE_CLIENT_ID` estão no `.env`
2. Reinicie o servidor após editar `.env`

### Erro: "redirect_uri_mismatch"

**Causa:** URL de callback não está cadastrada no Google/Microsoft

**Solução:**
1. **Google**: Adicione a URL em **Authorized redirect URIs**
2. **Microsoft**: Adicione a URL em **Redirect URIs**
3. URLs devem ser EXATAMENTE iguais (incluindo http/https e porta)

### Erro: "email_not_verified" (Google)

**Causa:** Email da conta Google não está verificado

**Solução:**
1. Acesse sua conta Google
2. Verifique seu email
3. Tente fazer login novamente

### Erro: "no_email" (Microsoft)

**Causa:** Conta Microsoft não tem email associado ou permissão `email` não foi concedida

**Solução:**
1. Verifique se a conta tem email
2. Verifique se a permissão `email` está no Azure AD
3. Conceda admin consent se necessário

### Usuário fica em "Pending" para sempre

**Causa:** Admin ainda não aprovou

**Solução:**
1. Admin deve acessar `/admin`
2. Aba **Pending Users**
3. Aprovar o usuário selecionando workflows
4. Usuário será redirecionado automaticamente

---

## Segurança

### CSRF Protection

O sistema implementa proteção CSRF usando **state parameter**:
- State aleatório gerado no cliente
- Armazenado em `sessionStorage`
- Verificado no callback OAuth

### Token Storage

- **JWT token** armazenado no `localStorage`
- Token enviado em todas requisições via header `Authorization`
- Backend valida token em rotas protegidas

### Session Management

- Sessões armazenadas no PostgreSQL e Redis
- IP e User Agent registrados
- Logout invalida sessão em ambos os stores

### Audit Logging

Todas ações SSO são auditadas:
- `sso_signup_pending` - Novo usuário SSO criado
- `login` - Login bem-sucedido
- `approve_pending_user` - Admin aprovou usuário
- `reject_pending_user` - Admin rejeitou usuário

---

## Produção

### Checklist antes de ir para produção

- [ ] Atualizar `NEXT_PUBLIC_APP_URL` para domínio real
- [ ] Atualizar redirect URIs no Google Cloud Console
- [ ] Atualizar redirect URIs no Azure Portal
- [ ] Usar HTTPS (obrigatório para OAuth)
- [ ] Gerar novo `JWT_SECRET` forte
- [ ] Configurar variáveis de ambiente no servidor
- [ ] Testar fluxo completo de SSO
- [ ] Testar aprovação de pending users
- [ ] Verificar logs de auditoria

### URLs de Callback em Produção

```
Google: https://seu-dominio.com/api/auth/google/callback
Microsoft: https://seu-dominio.com/api/auth/microsoft/callback
```

Certifique-se de adicionar essas URLs exatas nos respectivos consoles.

---

## Recursos Adicionais

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft Identity Platform Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

**Fim do Guia** 🎉

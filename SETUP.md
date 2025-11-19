# 🚀 Setup e Instalação - ChatApp IA

Guia completo para configurar e rodar a aplicação ChatApp IA com autenticação, múltiplos workflows e integração N8N.

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Docker e Docker Compose instalados
- Git

## 🏗️ Instalação

### 1. Clone o repositório

```bash
git clone <repository-url>
cd chatgpt-ui
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
# Copiar o arquivo de exemplo
cp .env.example .env

# Editar o arquivo .env e configurar:
# - POSTGRES_PASSWORD: senha do PostgreSQL
# - JWT_SECRET: chave secreta para JWT (gere uma segura!)
# - Outras configurações conforme necessário
```

**⚠️ IMPORTANTE:** Gere um JWT_SECRET seguro:

```bash
# Opção 1: OpenSSL
openssl rand -base64 64

# Opção 2: Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### 4. Suba os serviços Docker

```bash
# Subir PostgreSQL, Redis e N8N
npm run docker:up

# Ou manualmente:
docker-compose up -d postgres redis n8n
```

Aguarde alguns segundos para os serviços iniciarem.

### 5. Execute as migrations do banco

```bash
# Rodar migrations
npm run db:migrate
```

Você verá uma lista de tabelas criadas:
- audit_logs
- conversations
- messages
- pending_users
- sessions
- user_workflows
- users
- workflows

### 6. Crie o usuário administrador inicial

```bash
# Criar admin
npm run db:seed
```

Você será solicitado a fornecer:
- Nome do administrador
- Email
- Senha

Exemplo:
```
Nome do administrador: Admin Empresa
Email: admin@empresa.com
Senha: SenhaForte123!
```

### 7. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em: http://localhost:3000

## 🐳 Serviços Docker

Após rodar `npm run docker:up`, você terá:

- **PostgreSQL**: http://localhost:5432
  - Databases: `n8n`, `chatapp`
  - User/Password: conforme `.env`

- **Redis**: http://localhost:6379
  - Usado para cache e sessões

- **N8N**: http://localhost:5678
  - Interface visual para workflows
  - Login: conforme `.env` (N8N_BASIC_AUTH_USER/PASSWORD)

## 🧪 Testando a Autenticação

### 1. Teste o login via API

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@empresa.com",
    "password": "SenhaForte123!"
  }'
```

Resposta esperada:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@empresa.com",
    "name": "Admin Empresa",
    "role": "admin",
    "status": "active",
    "workflows": [
      {
        "id": "geral",
        "name": "Geral",
        "icon": "🌐"
      }
    ]
  }
}
```

Copie o `token` retornado.

### 2. Teste o endpoint /me

```bash
# Substitua <TOKEN> pelo token retornado no login
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

### 3. Teste o logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <TOKEN>"
```

## 📊 Acessando os Bancos de Dados

### PostgreSQL

```bash
# Via Docker
docker exec -it chatapp-postgres psql -U admin -d chatapp

# Ou via cliente local
psql -h localhost -U admin -d chatapp
```

Comandos úteis:
```sql
-- Listar tabelas
\dt

-- Ver usuários
SELECT id, email, name, role, status FROM users;

-- Ver workflows
SELECT id, name, webhook_url, is_active FROM workflows;

-- Ver permissões
SELECT u.email, w.name as workflow
FROM user_workflows uw
JOIN users u ON u.id = uw.user_id
JOIN workflows w ON w.id = uw.workflow_id;

-- Ver sessões ativas
SELECT u.email, s.created_at, s.expires_at, s.ip_address
FROM sessions s
JOIN users u ON u.id = s.user_id
WHERE s.expires_at > NOW();
```

### Redis

```bash
# Via Docker
docker exec -it chatapp-redis redis-cli

# Comandos
KEYS session:*  # Listar sessões
GET session:<token>  # Ver sessão
```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor dev (turbopack)

# Build
npm run build            # Build para produção
npm run start            # Inicia servidor produção

# Docker
npm run docker:up        # Sobe Postgres, Redis e N8N
npm run docker:down      # Para todos os serviços
npm run docker:logs      # Ver logs dos serviços

# Banco de Dados
npm run db:migrate       # Roda migrations
npm run db:seed          # Cria usuário admin
npm run db:setup         # Roda migrate + seed
```

## 🗂️ Estrutura do Projeto

```
chatgpt-ui/
├── app/
│   ├── api/
│   │   ├── auth/           # API de autenticação
│   │   │   ├── login/
│   │   │   ├── logout/
│   │   │   └── me/
│   │   └── n8n/            # Proxy para N8N
│   └── page.tsx            # Página principal
├── lib/
│   ├── auth/               # Helpers de autenticação
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   └── session.ts
│   ├── db/                 # Database
│   │   ├── postgres.ts
│   │   ├── redis.ts
│   │   └── schema.sql
│   ├── middleware/         # Middlewares
│   │   └── auth.ts
│   ├── providers/          # Providers IA (N8N, OpenAI, etc)
│   └── types/              # Tipos TypeScript
├── docker/
│   └── init-db.sh          # Script init PostgreSQL
├── scripts/
│   ├── migrate.js          # Migrations
│   └── seed.js             # Seed admin
├── docker-compose.yml
├── Dockerfile
└── .env
```

## ❓ Troubleshooting

### Erro: "Failed to connect to PostgreSQL"

1. Verifique se o Docker está rodando
2. Verifique se o PostgreSQL subiu: `docker ps | grep postgres`
3. Veja os logs: `docker logs chatapp-postgres`
4. Tente reiniciar: `docker-compose restart postgres`

### Erro: "Redis connection error"

1. Verifique se o Redis subiu: `docker ps | grep redis`
2. Teste a conexão: `docker exec -it chatapp-redis redis-cli ping`
3. Deve retornar: `PONG`

### Erro: "JWT_SECRET is not defined"

1. Certifique-se que o arquivo `.env` existe
2. Adicione: `JWT_SECRET=<sua-chave-segura>`
3. Reinicie o servidor: `npm run dev`

### Banco de dados não foi criado

1. Rode manualmente: `npm run db:migrate`
2. Verifique se os databases existem:
   ```bash
   docker exec -it chatapp-postgres psql -U admin -c "\l"
   ```

### N8N não está acessível

1. Aguarde ~30 segundos após o `docker-compose up`
2. Verifique logs: `docker logs chatapp-n8n`
3. Acesse: http://localhost:5678

## 🔐 Segurança

**Para produção:**

1. Mude todas as senhas padrão:
   - `POSTGRES_PASSWORD`
   - `N8N_BASIC_AUTH_PASSWORD`
   - `JWT_SECRET`

2. Configure HTTPS

3. Use variáveis de ambiente fortes

4. Restrinja acesso ao PostgreSQL e Redis (não exponha portas em produção)

5. Configure rate limiting nas API routes

## 📞 Suporte

- Documentação N8N: https://docs.n8n.io/
- Documentação Next.js: https://nextjs.org/docs
- Issues: Abra uma issue no repositório

---

**Desenvolvido com ❤️**

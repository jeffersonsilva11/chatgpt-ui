# AI Chat App

Um aplicativo web de chat IA moderno e personalizável com suporte a múltiplos provedores de IA, branding customizável e interface responsiva.

## ✨ Características

### 🎨 Interface & Design
- Layout estilo ChatGPT/Claude com sidebar lateral
- Dark mode e Light mode
- Interface totalmente responsiva (mobile + desktop)
- Animações suaves de transição
- Syntax highlighting para código
- Renderização de markdown completa

### 🎭 Branding Customizável
- Upload de logo personalizado
- Nome da empresa editável
- Esquema de cores personalizável:
  - Cor primária (botões, links)
  - Cor secundária (hover, selected)
- Todas as configurações salvas em localStorage

### 🤖 Múltiplos Provedores de IA
- **N8N Webhook** (padrão) - Integração via webhook
- **OpenAI** - GPT-4, GPT-3.5-turbo, etc.
- **Google Gemini** - Gemini Pro
- **Grok** - xAI Grok

### 💬 Recursos de Chat
- Histórico de conversas persistente
- Criação de novas conversas
- Exclusão de conversas
- Busca no histórico
- Export de conversas (TXT, JSON)
- Títulos automáticos baseados na primeira mensagem
- Streaming de texto em tempo real

### 📤 Entrada Multimodal
- **Texto** - Campo expansível com contador de caracteres
- **Imagens** - Upload com preview (PNG, JPG, WEBP, até 10MB)
- **Áudio** - Gravação via navegador com visualização de duração

### ⚡ Funcionalidades Avançadas
- Streaming de respostas palavra por palavra
- Retry automático em caso de erro
- Atalhos de teclado (⌘/Ctrl + K para nova conversa)
- Cópia de código com um clique
- Links clicáveis nas respostas
- Renderização de imagens nas respostas

## 🚀 Começando

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd chatgpt-ui
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

4. Abra [http://localhost:3000](http://localhost:3000) no seu navegador

## 📁 Estrutura do Projeto

```
chatgpt-ui/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # API route para proxy
│   ├── page.tsx                  # Página principal
│   ├── layout.tsx                # Layout raiz
│   └── globals.css               # Estilos globais
├── components/
│   ├── ui/                       # Componentes UI base
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── dialog.tsx
│   │   └── loading.tsx
│   └── chat/                     # Componentes do chat
│       ├── ChatMessage.tsx       # Mensagem individual
│       ├── ChatInput.tsx         # Input multimodal
│       ├── Sidebar.tsx           # Barra lateral
│       ├── Header.tsx            # Cabeçalho
│       ├── SettingsModal.tsx     # Modal de configurações
│       └── StreamingText.tsx     # Texto com streaming
├── lib/
│   ├── providers/                # Provedores de IA
│   │   ├── n8n.ts
│   │   ├── openai.ts
│   │   ├── gemini.ts
│   │   └── grok.ts
│   ├── utils/                    # Utilitários
│   │   ├── storage.ts           # localStorage helpers
│   │   ├── audio.ts             # Gravação de áudio
│   │   ├── file.ts              # Manipulação de arquivos
│   │   └── cn.ts                # Class name utility
│   ├── types/                    # Tipos TypeScript
│   │   └── index.ts
│   └── store/                    # Estado global (Zustand)
│       └── index.ts
└── README.md
```

## ⚙️ Configuração

### 1. Configurações de Branding

Acesse as configurações clicando no botão "Settings" na sidebar:

- **Logo**: Faça upload de uma imagem (máx. 2MB)
- **Nome da Empresa**: Digite o nome desejado
- **Cores**: Use os seletores de cor para personalizar

### 2. Configuração do Provedor de IA

#### N8N Webhook (Padrão)
1. Vá em Settings → AI Provider
2. Selecione "N8N"
3. Configure:
   - **Webhook URL**: URL do seu webhook N8N
   - **Headers**: Headers customizados em JSON (opcional)

**Formato esperado de resposta do N8N:**
```json
{
  "resposta": "Texto da resposta em markdown",
  "tipo": "text|image|mixed",
  "imagem": "url_ou_base64",
  "dados": {}
}
```

#### OpenAI
1. Vá em Settings → AI Provider
2. Selecione "OPENAI"
3. Configure:
   - **API Key**: Sua chave da API OpenAI (sk-...)
   - **Model**: Nome do modelo (ex: gpt-4-turbo-preview)

#### Google Gemini
1. Vá em Settings → AI Provider
2. Selecione "GEMINI"
3. Configure:
   - **API Key**: Sua chave da API Gemini
   - **Model**: Nome do modelo (ex: gemini-pro)

#### Grok
1. Vá em Settings → AI Provider
2. Selecione "GROK"
3. Configure:
   - **API Key**: Sua chave da API Grok (xai-...)

### 3. Variáveis de Ambiente (Opcional)

Para usar a API route como proxy e esconder as chaves da API:

Crie um arquivo `.env.local`:

```env
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
GROK_API_KEY=xai-...
```

## 🎯 Como Usar

### Criando uma Nova Conversa
- Clique em "New Conversation" na sidebar
- Ou pressione `⌘/Ctrl + K`

### Enviando Mensagens
- **Texto**: Digite e pressione Enter (Shift+Enter para nova linha)
- **Imagem**: Clique no ícone de imagem e selecione um arquivo
- **Áudio**: Clique no ícone de microfone para gravar

### Gerenciando Conversas
- **Buscar**: Use o campo de busca na sidebar
- **Deletar**: Hover sobre uma conversa e clique no ícone de lixeira
- **Export**: Hover sobre uma conversa e clique no ícone de download

### Atalhos de Teclado
- `⌘/Ctrl + K` - Nova conversa
- `Enter` - Enviar mensagem
- `Shift + Enter` - Nova linha

## 🔌 Integração N8N

### Formato de Requisição

```json
{
  "mensagem": "texto da mensagem",
  "tipo": "text|image|audio",
  "arquivo": "base64_ou_url",
  "historico": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "metadata": {
    "conversaId": "uuid",
    "timestamp": "ISO8601"
  }
}
```

### Formato de Resposta Esperado

```json
{
  "resposta": "texto markdown",
  "tipo": "text|image|mixed",
  "imagem": "url_ou_base64",
  "dados": {}
}
```

### Exemplo de Workflow N8N

1. **Webhook Node** - Receber a requisição
2. **Function Node** - Processar os dados
3. **HTTP Request Node** - Chamar a IA (OpenAI, etc)
4. **Respond to Webhook** - Retornar a resposta

## 🛠️ Stack Técnica

- **Framework**: Next.js 15 (App Router)
- **UI**: Tailwind CSS + componentes customizados
- **Gerenciamento de Estado**: Zustand
- **Markdown**: react-markdown + remark-gfm
- **Syntax Highlighting**: react-syntax-highlighter
- **Ícones**: Lucide React
- **TypeScript**: Para type safety completo

## 📱 Responsividade

- **Mobile** (< 1024px): Sidebar colapsável
- **Tablet** (≥ 1024px): Sidebar persistente
- **Desktop**: Layout completo

## 🎨 Temas

O aplicativo suporta dois temas:
- **Light Mode**: Tema claro (padrão)
- **Dark Mode**: Tema escuro

Alterne entre os temas clicando no ícone de sol/lua no header.

## 🔒 Segurança

- Todas as configurações são armazenadas localmente no navegador
- API keys são armazenadas apenas no localStorage do usuário
- Use a API route como proxy para esconder keys do cliente (recomendado para produção)

## 🚀 Deploy

### Vercel (Recomendado)

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente (se usar API route)
3. Deploy!

### Outras Plataformas

O app pode ser deployado em qualquer plataforma que suporte Next.js:
- Netlify
- AWS Amplify
- Railway
- Render

## 📝 Notas de Desenvolvimento

### Build para Produção

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

## 📄 Licença

Este projeto é de código aberto e está disponível sob a licença MIT.

## 🙏 Agradecimentos

- shadcn/ui pelos componentes base
- Vercel pelo Next.js
- Todos os mantenedores das bibliotecas open source usadas

---

**Desenvolvido com ❤️ usando Next.js 15**

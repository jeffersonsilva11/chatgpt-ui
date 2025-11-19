# Configuração do Webhook N8N

Este documento explica como configurar corretamente um webhook N8N para funcionar com esta aplicação de chat.

## Estrutura da Requisição

A aplicação envia requisições POST para o webhook com o seguinte formato JSON:

```json
{
  "mensagem": "Texto da mensagem do usuário",
  "tipo": "text",
  "arquivo": "base64_encoded_file_data_opcional",
  "historico": [
    {
      "role": "user",
      "content": "Mensagem anterior do usuário"
    },
    {
      "role": "assistant",
      "content": "Resposta anterior do assistente"
    }
  ],
  "metadata": {
    "conversaId": "conv_1234567890_abc123",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Campos:

- **mensagem** (string): O texto da mensagem enviada pelo usuário
- **tipo** (string): Tipo da mensagem - pode ser "text", "image" ou "audio"
- **arquivo** (string, opcional): Dados do arquivo em base64 (para imagens ou áudio)
- **historico** (array): Histórico das mensagens anteriores da conversa
- **metadata** (object): Metadados da requisição incluindo ID da conversa e timestamp

## Estrutura da Resposta Esperada

O webhook N8N **DEVE** retornar uma resposta JSON com o seguinte formato:

```json
{
  "resposta": "Texto da resposta do assistente IA",
  "tipo": "text",
  "imagem": "url_ou_base64_opcional",
  "dados": {
    "campo_personalizado": "valor_opcional"
  }
}
```

### Campos Obrigatórios:

- **resposta** (string): O texto da resposta que será exibido para o usuário

### Campos Opcionais:

- **tipo** (string): Tipo da resposta (padrão: "text")
- **imagem** (string): URL ou base64 de uma imagem (se aplicável)
- **dados** (object): Dados adicionais personalizados

## Exemplo de Workflow N8N

### Configuração Básica:

1. **Webhook Node** (Trigger)
   - Method: POST
   - Path: `/webhook/seu-id-unico/chat`
   - Response Mode: "Last Node"

2. **Function Node** (Processar Requisição)
   ```javascript
   // Extrair dados da requisição
   const mensagem = $input.item.json.mensagem;
   const tipo = $input.item.json.tipo;
   const historico = $input.item.json.historico;

   // Processar mensagem (exemplo simples)
   const resposta = `Você disse: ${mensagem}`;

   return {
     json: {
       resposta: resposta,
       tipo: 'text'
     }
   };
   ```

3. **HTTP Request Node** (Chamar API de IA - Opcional)
   - Conecte-se à sua API de IA preferida (OpenAI, Anthropic, etc.)
   - Use o histórico de mensagens para contexto
   - Processe a resposta

4. **Set Node** (Formatar Resposta)
   ```javascript
   // Garantir formato correto da resposta
   return {
     json: {
       resposta: $input.item.json.ai_response || 'Resposta padrão',
       tipo: 'text',
       dados: {
         model: 'gpt-4',
         tokens: 150
       }
     }
   };
   ```

### Workflow Avançado com OpenAI:

```javascript
// Function Node - Preparar chamada OpenAI
const messages = [
  {
    role: 'system',
    content: 'Você é um assistente útil e amigável.'
  },
  ...($input.item.json.historico || []),
  {
    role: 'user',
    content: $input.item.json.mensagem
  }
];

return {
  json: {
    messages: messages
  }
};
```

## Testando o Webhook

### Teste com cURL:

```bash
curl -X POST https://seu-n8n.com/webhook/seu-id/chat \
  -H "Content-Type: application/json" \
  -d '{
    "mensagem": "Olá!",
    "tipo": "text",
    "historico": [],
    "metadata": {
      "conversaId": "test_conv",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  }'
```

### Resposta Esperada:

```json
{
  "resposta": "Olá! Como posso ajudar você hoje?",
  "tipo": "text"
}
```

## Configuração na Aplicação

1. Abra o painel de chat
2. Clique no ícone de **Settings** (Configurações)
3. Na seção **Provider**, selecione **N8N**
4. Insira a URL do webhook no campo **Webhook URL**
5. (Opcional) Adicione headers personalizados se necessário
6. (Opcional) Ajuste o timeout (padrão: 30 segundos)
7. Salve as configurações

## Solução de Problemas CORS

### O que é CORS?

CORS (Cross-Origin Resource Sharing) é uma política de segurança do navegador que impede que aplicações web façam requisições para domínios diferentes do domínio de origem.

### Erro CORS Típico:

```
Access to fetch at 'http://localhost:5678/webhook/...' from origin 'http://localhost:3001'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on
the requested resource.
```

### ✅ Solução Recomendada: Usar o Proxy (Padrão)

**Esta aplicação usa automaticamente um proxy Next.js** para contornar problemas de CORS. Você **não precisa fazer nada** - o proxy está ativado por padrão!

Como funciona:
1. O frontend envia requisições para `/api/n8n` (mesma origem)
2. O servidor Next.js encaminha a requisição para o N8N
3. O servidor Next.js retorna a resposta para o frontend
4. ✅ Sem problemas de CORS!

### Desabilitar o Proxy (Não Recomendado)

Se por algum motivo você quiser fazer requisições diretas ao N8N (não recomendado), você pode:

1. **Configurar CORS no N8N:**

   Adicione as seguintes variáveis de ambiente no seu arquivo `.env` do N8N:

   ```env
   N8N_CORS_ALLOW_ORIGIN=http://localhost:3001
   # Para desenvolvimento, você pode usar:
   # N8N_CORS_ALLOW_ORIGIN=*
   ```

   Reinicie o N8N após adicionar essas variáveis.

2. **Desabilitar o proxy na aplicação:**

   Nas configurações do provider N8N, adicione manualmente no localStorage:
   ```javascript
   // No console do navegador
   const settings = JSON.parse(localStorage.getItem('ai-chat-settings'));
   settings.provider.n8n.useProxy = false;
   localStorage.setItem('ai-chat-settings', JSON.stringify(settings));
   ```

   **Nota:** Isso só funciona se você configurou CORS no N8N!

### Configuração de Produção

Em produção, configure o CORS do N8N para aceitar apenas o domínio do seu aplicativo:

```env
N8N_CORS_ALLOW_ORIGIN=https://seu-dominio.com
```

Ou continue usando o proxy (recomendado) sem precisar configurar CORS no N8N.

## Troubleshooting

### Erro: "N8N webhook URL not configured"
- **Causa**: URL do webhook não foi configurada nas configurações
- **Solução**: Configure a URL do webhook nas configurações da aplicação

### Erro: "Webhook not found" (404)
- **Causa**: URL do webhook incorreta ou workflow não ativo no N8N
- **Solução**:
  - Verifique se a URL está correta
  - Ative o workflow no N8N
  - Certifique-se que o webhook está configurado como "Production URL"

### Erro: "N8N server error" (500)
- **Causa**: Erro no processamento do workflow N8N
- **Solução**:
  - Verifique os logs do workflow no N8N
  - Teste o workflow manualmente no N8N
  - Verifique se todos os nodes estão configurados corretamente
  - Certifique-se que a resposta está no formato JSON correto

### Erro: "N8N webhook returned non-JSON response"
- **Causa**: O webhook está retornando HTML ou outro formato não-JSON
- **Solução**:
  - Configure o Webhook Node para "Response Mode: Last Node"
  - Certifique-se que o último node retorna JSON
  - Verifique se não há redirecionamentos ou proxies modificando a resposta

### Erro: "Invalid N8N response format"
- **Causa**: A resposta JSON não contém o campo obrigatório "resposta"
- **Solução**:
  - Adicione um Set Node no final do workflow
  - Garanta que a resposta tenha pelo menos: `{ "resposta": "texto aqui" }`

## Headers Personalizados

Se seu webhook N8N requer autenticação, você pode adicionar headers personalizados:

```json
{
  "Authorization": "Bearer seu-token-aqui",
  "X-Custom-Header": "valor"
}
```

Configure isso no campo "Custom Headers" nas configurações da aplicação.

## Timeout

O timeout padrão é de 30 segundos. Se seu workflow N8N demora mais para processar:

1. Aumente o valor do timeout nas configurações
2. Otimize seu workflow N8N para responder mais rápido
3. Use processamento assíncrono se possível

## Exemplo Completo de Workflow N8N JSON

```json
{
  "name": "Chat AI Webhook",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "chat",
        "responseMode": "lastNode",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Process Message",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "const mensagem = $input.item.json.mensagem;\nreturn { json: { resposta: `Você disse: ${mensagem}`, tipo: 'text' } };"
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "Process Message", "type": "main", "index": 0 }]]
    }
  }
}
```

## Recursos Adicionais

- [Documentação do N8N Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [N8N Community](https://community.n8n.io/)

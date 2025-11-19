import { Message, N8NRequest, N8NResponse, N8NConfig } from '@/lib/types';

export class N8NProvider {
  private config: N8NConfig;

  constructor(config: N8NConfig) {
    this.config = config;
  }

  async sendMessage(
    message: string,
    messageType: 'text' | 'image' | 'audio',
    file: string | undefined,
    conversationId: string,
    history: Message[],
    workflowId?: string
  ): Promise<N8NResponse> {
    const request: N8NRequest = {
      mensagem: message,
      tipo: messageType,
      arquivo: file,
      historico: history.map((msg) => ({
        role: msg.role,
        content: msg.content.text || '',
      })),
      metadata: {
        conversaId: conversationId,
        workflowId,
        timestamp: new Date().toISOString(),
      },
    };

    // Use proxy by default to avoid CORS issues
    const useProxy = this.config.useProxy !== false; // default true

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, this.config.timeout || 30000);

      let response: Response;

      if (useProxy) {
        // Use Next.js API route proxy
        response = await fetch('/api/n8n', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhookUrl: this.config.webhookUrl,
            headers: this.config.headers,
            timeout: this.config.timeout,
            ...request,
          }),
          signal: controller.signal,
        });
      } else {
        // Direct call to N8N webhook (may have CORS issues)
        response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers,
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
      }

      clearTimeout(timeout);

      if (!response.ok) {
        // Try to get error message from response
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        } catch (parseError) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const data = await response.json();

      // If using proxy, error is returned in response body
      if (useProxy && data.error) {
        throw new Error(data.error);
      }

      // Validate response structure
      if (!data.resposta) {
        throw new Error(
          'Invalid N8N response format. The response must include a "resposta" field.'
        );
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout. Please try again or check your N8N server.');
        }
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw new Error('Network error. Please check if the N8N webhook URL is accessible.');
        }
        throw new Error(`Failed to send message: ${error.message}`);
      }
      throw new Error('Failed to send message: Unknown error');
    }
  }

  async sendMessageWithRetry(
    message: string,
    messageType: 'text' | 'image' | 'audio',
    file: string | undefined,
    conversationId: string,
    history: Message[],
    workflowId?: string,
    maxRetries: number = 3
  ): Promise<N8NResponse> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.sendMessage(
          message,
          messageType,
          file,
          conversationId,
          history,
          workflowId
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        if (i < maxRetries - 1) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError || new Error('Failed to send message after retries');
  }
}

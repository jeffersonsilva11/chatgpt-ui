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
    history: Message[]
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
        timestamp: new Date().toISOString(),
      },
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, this.config.timeout || 30000);

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: N8NResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout. Please try again.');
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
    maxRetries: number = 3
  ): Promise<N8NResponse> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.sendMessage(message, messageType, file, conversationId, history);
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

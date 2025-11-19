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
        // Try to get error details from response
        let errorDetail = '';
        try {
          const errorData = await response.text();
          // Check if it's JSON
          try {
            const jsonError = JSON.parse(errorData);
            errorDetail = jsonError.message || jsonError.error || '';
          } catch {
            // If not JSON, check if it's HTML (common for 404/500 errors)
            if (errorData.includes('<!DOCTYPE') || errorData.includes('<html')) {
              errorDetail = 'Server returned HTML instead of JSON. Check if the webhook URL is correct.';
            } else {
              errorDetail = errorData.substring(0, 100);
            }
          }
        } catch {
          errorDetail = 'Unable to get error details';
        }

        const statusMessages: Record<number, string> = {
          404: 'Webhook not found. Please check if the N8N webhook URL is correct.',
          500: 'N8N server error. Please check your N8N workflow configuration.',
          401: 'Unauthorized. Please check your N8N authentication headers.',
          403: 'Forbidden. Please check your N8N permissions.',
          503: 'N8N service unavailable. Please check if N8N is running.',
        };

        const statusMessage = statusMessages[response.status] || `HTTP error! status: ${response.status}`;
        const fullMessage = errorDetail ? `${statusMessage}\n\nDetails: ${errorDetail}` : statusMessage;

        throw new Error(fullMessage);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(
          'N8N webhook returned non-JSON response. Please check your N8N workflow is configured to return JSON.'
        );
      }

      const data: N8NResponse = await response.json();

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

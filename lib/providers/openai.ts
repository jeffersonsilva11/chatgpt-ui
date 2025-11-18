import { Message, OpenAIConfig } from '@/lib/types';

export class OpenAIProvider {
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = config;
  }

  async sendMessage(
    message: string,
    history: Message[],
    onChunk?: (text: string) => void
  ): Promise<string> {
    const messages = [
      ...history.map((msg) => ({
        role: msg.role,
        content: msg.content.text || '',
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    try {
      const response = await fetch(
        `${this.config.baseUrl || 'https://api.openai.com/v1'}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            messages,
            stream: !!onChunk,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
      }

      if (onChunk && response.body) {
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter((line) => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content;
                if (content) {
                  fullText += content;
                  onChunk(content);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }

        return fullText;
      } else {
        // Handle non-streaming response
        const data = await response.json();
        return data.choices[0]?.message?.content || '';
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw new Error('OpenAI API error: Unknown error');
    }
  }
}

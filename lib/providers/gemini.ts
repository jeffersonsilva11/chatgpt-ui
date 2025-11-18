import { Message, GeminiConfig } from '@/lib/types';

export class GeminiProvider {
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = config;
  }

  async sendMessage(message: string, history: Message[]): Promise<string> {
    const contents = [
      ...history.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content.text || '' }],
      })),
      {
        role: 'user' as const,
        parts: [{ text: message }],
      },
    ];

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || '';
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gemini API error: ${error.message}`);
      }
      throw new Error('Gemini API error: Unknown error');
    }
  }

  async sendMessageStream(
    message: string,
    history: Message[],
    onChunk: (text: string) => void
  ): Promise<string> {
    const contents = [
      ...history.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content.text || '' }],
      })),
      {
        role: 'user' as const,
        parts: [{ text: message }],
      },
    ];

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:streamGenerateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter((line) => line.trim() !== '');

          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullText += text;
                onChunk(text);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }

        return fullText;
      }

      return '';
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gemini API error: ${error.message}`);
      }
      throw new Error('Gemini API error: Unknown error');
    }
  }
}

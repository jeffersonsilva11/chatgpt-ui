import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, message, history, config } = body;

    // This route can be used as a proxy to hide API keys from the client
    // Currently, providers are called directly from the client
    // But you can implement server-side logic here if needed

    // Example for OpenAI:
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY || config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4-turbo-preview',
          messages: [
            ...history.map((msg: any) => ({
              role: msg.role,
              content: msg.content.text,
            })),
            { role: 'user', content: message },
          ],
          stream: false,
        }),
      });

      const data = await response.json();
      return NextResponse.json({
        response: data.choices[0]?.message?.content || '',
      });
    }

    // Example for N8N:
    if (provider === 'n8n') {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify({
          mensagem: message,
          tipo: 'text',
          historico: history.map((msg: any) => ({
            role: msg.role,
            content: msg.content.text || '',
          })),
          metadata: {
            conversaId: body.conversationId,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json();
      return NextResponse.json({
        response: data.resposta,
      });
    }

    return NextResponse.json(
      { error: 'Provider not supported' },
      { status: 400 }
    );
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

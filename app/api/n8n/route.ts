import { NextRequest, NextResponse } from 'next/server';

// API route to proxy N8N webhook requests and avoid CORS issues
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookUrl, headers = {}, timeout = 30000, ...requestData } = body;

    // Validate webhook URL
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return NextResponse.json(
        { error: 'N8N webhook URL is required' },
        { status: 400 }
      );
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Forward request to N8N webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(requestData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Get response data
      const responseText = await response.text();

      // Check if response is OK
      if (!response.ok) {
        let errorDetail = '';

        // Try to parse error as JSON
        try {
          const jsonError = JSON.parse(responseText);
          errorDetail = jsonError.message || jsonError.error || '';
        } catch {
          // If not JSON, check if it's HTML
          if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
            errorDetail = 'Server returned HTML instead of JSON. Check if the webhook URL is correct.';
          } else {
            errorDetail = responseText.substring(0, 100);
          }
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

        return NextResponse.json(
          { error: fullMessage },
          { status: response.status }
        );
      }

      // Validate content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return NextResponse.json(
          { error: 'N8N webhook returned non-JSON response. Please check your N8N workflow is configured to return JSON.' },
          { status: 500 }
        );
      }

      // Parse and validate response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid JSON response from N8N webhook' },
          { status: 500 }
        );
      }

      // Validate response structure
      if (!data.resposta) {
        return NextResponse.json(
          { error: 'Invalid N8N response format. The response must include a "resposta" field.' },
          { status: 500 }
        );
      }

      // Return successful response
      return NextResponse.json(data);

    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          return NextResponse.json(
            { error: 'Request timeout. Please try again or check your N8N server.' },
            { status: 408 }
          );
        }
        if (fetchError.message.includes('fetch')) {
          return NextResponse.json(
            { error: 'Network error. Please check if the N8N webhook URL is accessible.' },
            { status: 503 }
          );
        }
        return NextResponse.json(
          { error: `Failed to send message: ${fetchError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to send message: Unknown error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('N8N API Proxy Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

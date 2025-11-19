import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db/postgres';
import { z } from 'zod';
import { MessageRole, MessageContent } from '@/lib/types';

const createMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.object({
    type: z.enum(['text', 'image', 'audio', 'mixed']),
    text: z.string().optional(),
    imageUrl: z.string().optional(),
    imageBase64: z.string().optional(),
    audioUrl: z.string().optional(),
    audioBase64: z.string().optional(),
  }),
});

// GET /api/conversations/[id]/messages - Get all messages in conversation
export const GET = withAuth(
  async (request: NextRequest, { params, user }: { params: { id: string }; user: any }) => {
    try {
      const { id } = params;

      // Check conversation ownership
      const ownershipCheck = await query(
        'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
        [id, user.userId]
      );

      if (ownershipCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Conversation not found or access denied' },
          { status: 404 }
        );
      }

      // Get messages
      const result = await query(
        `SELECT id, role, content, created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [id]
      );

      const messages = result.rows.map((row: any) => ({
        id: row.id,
        role: row.role as MessageRole,
        content: row.content as MessageContent,
        timestamp: new Date(row.created_at).getTime(),
      }));

      return NextResponse.json({ messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
  }
);

// POST /api/conversations/[id]/messages - Add message to conversation
export const POST = withAuth(
  async (request: NextRequest, { params, user }: { params: { id: string }; user: any }) => {
    try {
      const { id } = params;
      const body = await request.json();
      const validation = createMessageSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.errors },
          { status: 400 }
        );
      }

      const { role, content } = validation.data;

      // Check conversation ownership
      const ownershipCheck = await query(
        'SELECT id, title FROM conversations WHERE id = $1 AND user_id = $2',
        [id, user.userId]
      );

      if (ownershipCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Conversation not found or access denied' },
          { status: 404 }
        );
      }

      // Insert message
      const result = await query(
        `INSERT INTO messages (conversation_id, role, content)
         VALUES ($1, $2, $3)
         RETURNING id, conversation_id, role, content, created_at`,
        [id, role, JSON.stringify(content)]
      );

      const message = result.rows[0];

      // Update conversation updated_at
      await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [id]);

      // Auto-update conversation title if first user message
      const messageCountResult = await query(
        'SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1',
        [id]
      );

      const messageCount = parseInt(messageCountResult.rows[0].count);
      const conversationTitle = ownershipCheck.rows[0].title;

      if (messageCount === 1 && role === 'user' && conversationTitle === 'New Conversation') {
        const text = content.text || 'Conversation';
        const title = text.slice(0, 50) + (text.length > 50 ? '...' : '');

        await query('UPDATE conversations SET title = $1 WHERE id = $2', [title, id]);
      }

      return NextResponse.json({
        success: true,
        message: {
          id: message.id,
          conversationId: message.conversation_id,
          role: message.role,
          content: message.content,
          timestamp: new Date(message.created_at).getTime(),
        },
      });
    } catch (error) {
      console.error('Error creating message:', error);
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
    }
  }
);

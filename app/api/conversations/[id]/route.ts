import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db/postgres';
import { z } from 'zod';

const updateConversationSchema = z.object({
  title: z.string().optional(),
});

// GET /api/conversations/[id] - Get conversation with messages
export const GET = withAuth(
  async (request: NextRequest, { params, user }: { params: { id: string }; user: any }) => {
    try {
      const { id } = params;

      // Get conversation
      const conversationResult = await query(
        `SELECT c.*, w.name as workflow_name, w.icon as workflow_icon
         FROM conversations c
         LEFT JOIN workflows w ON c.workflow_id = w.id
         WHERE c.id = $1 AND c.user_id = $2`,
        [id, user.userId]
      );

      if (conversationResult.rows.length === 0) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      const conversation = conversationResult.rows[0];

      // Get messages
      const messagesResult = await query(
        `SELECT id, role, content, created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [id]
      );

      const messages = messagesResult.rows.map((row: any) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        timestamp: new Date(row.created_at).getTime(),
      }));

      return NextResponse.json({
        conversation: {
          id: conversation.id,
          userId: conversation.user_id,
          workflowId: conversation.workflow_id,
          workflowName: conversation.workflow_name,
          workflowIcon: conversation.workflow_icon,
          title: conversation.title,
          messages,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
        },
      });
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversation' },
        { status: 500 }
      );
    }
  }
);

// PUT /api/conversations/[id] - Update conversation
export const PUT = withAuth(
  async (request: NextRequest, { params, user }: { params: { id: string }; user: any }) => {
    try {
      const { id } = params;
      const body = await request.json();
      const validation = updateConversationSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.errors },
          { status: 400 }
        );
      }

      const { title } = validation.data;

      // Check ownership
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

      // Update conversation
      const result = await query(
        `UPDATE conversations
         SET title = COALESCE($1, title), updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING id, title, workflow_id, created_at, updated_at`,
        [title, id, user.userId]
      );

      const conversation = result.rows[0];

      return NextResponse.json({
        success: true,
        conversation: {
          id: conversation.id,
          title: conversation.title,
          workflowId: conversation.workflow_id,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
        },
      });
    } catch (error) {
      console.error('Error updating conversation:', error);
      return NextResponse.json(
        { error: 'Failed to update conversation' },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/conversations/[id] - Delete conversation
export const DELETE = withAuth(
  async (request: NextRequest, { params, user }: { params: { id: string }; user: any }) => {
    try {
      const { id } = params;

      // Check ownership
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

      const conversation = ownershipCheck.rows[0];

      // Delete conversation (cascade will delete messages)
      await query('DELETE FROM conversations WHERE id = $1', [id]);

      return NextResponse.json({
        success: true,
        message: `Conversation "${conversation.title}" deleted successfully`,
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return NextResponse.json(
        { error: 'Failed to delete conversation' },
        { status: 500 }
      );
    }
  }
);

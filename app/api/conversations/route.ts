import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db/postgres';
import { z } from 'zod';

const createConversationSchema = z.object({
  title: z.string().default('New Conversation'),
  workflowId: z.string().optional(),
});

// GET /api/conversations - List user's conversations
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workflowId = searchParams.get('workflowId');

    let conversationsQuery = `
      SELECT
        c.id,
        c.title,
        c.workflow_id,
        c.created_at,
        c.updated_at,
        w.name as workflow_name,
        w.icon as workflow_icon,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
      FROM conversations c
      LEFT JOIN workflows w ON c.workflow_id = w.id
      WHERE c.user_id = $1
    `;

    const params: any[] = [user.userId];

    // Filter by workflow if specified
    if (workflowId) {
      conversationsQuery += ` AND c.workflow_id = $2`;
      params.push(workflowId);
    }

    conversationsQuery += ` ORDER BY c.updated_at DESC`;

    const result = await query(conversationsQuery, params);

    const conversations = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      workflowId: row.workflow_id,
      workflowName: row.workflow_name,
      workflowIcon: row.workflow_icon,
      messageCount: parseInt(row.message_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
});

// POST /api/conversations - Create new conversation
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const validation = createConversationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { title, workflowId } = validation.data;

    // If workflowId provided, verify user has access to it
    if (workflowId) {
      const accessCheck = await query(
        `SELECT 1 FROM user_workflows WHERE user_id = $1 AND workflow_id = $2`,
        [user.userId, workflowId]
      );

      if (accessCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'You do not have access to this workflow' },
          { status: 403 }
        );
      }
    }

    // Create conversation
    const result = await query(
      `INSERT INTO conversations (user_id, workflow_id, title)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, workflow_id, title, created_at, updated_at`,
      [user.userId, workflowId || null, title]
    );

    const conversation = result.rows[0];

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        userId: conversation.user_id,
        workflowId: conversation.workflow_id,
        title: conversation.title,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
      },
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
});

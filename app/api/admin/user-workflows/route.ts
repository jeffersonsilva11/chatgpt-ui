import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db/postgres';
import { z } from 'zod';

const assignWorkflowSchema = z.object({
  userId: z.string().uuid(),
  workflowId: z.string(),
});

const unassignWorkflowSchema = z.object({
  userId: z.string().uuid(),
  workflowId: z.string(),
});

// POST /api/admin/user-workflows - Assign workflow to user
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const validation = assignWorkflowSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { userId, workflowId } = validation.data;

    // Check if user exists
    const userCheck = await query('SELECT id, name FROM users WHERE id = $1', [userId]);

    if (userCheck.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if workflow exists
    const workflowCheck = await query('SELECT id, name FROM workflows WHERE id = $1', [
      workflowId,
    ]);

    if (workflowCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Check if assignment already exists
    const existingAssignment = await query(
      'SELECT * FROM user_workflows WHERE user_id = $1 AND workflow_id = $2',
      [userId, workflowId]
    );

    if (existingAssignment.rows.length > 0) {
      return NextResponse.json(
        {
          error: `User "${userCheck.rows[0].name}" already has access to workflow "${workflowCheck.rows[0].name}"`,
        },
        { status: 409 }
      );
    }

    // Create assignment
    await query(
      `INSERT INTO user_workflows (user_id, workflow_id, granted_by)
       VALUES ($1, $2, $3)`,
      [userId, workflowId, user.userId]
    );

    // Log audit
    await query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
       VALUES ($1, 'assign_workflow', 'user_workflow', $2, $3)`,
      [
        user.userId,
        userId,
        JSON.stringify({
          workflowId,
          workflowName: workflowCheck.rows[0].name,
          userName: userCheck.rows[0].name,
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Workflow "${workflowCheck.rows[0].name}" assigned to user "${userCheck.rows[0].name}"`,
    });
  } catch (error) {
    console.error('Error assigning workflow:', error);
    return NextResponse.json({ error: 'Failed to assign workflow' }, { status: 500 });
  }
});

// DELETE /api/admin/user-workflows - Remove workflow from user
export const DELETE = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const validation = unassignWorkflowSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { userId, workflowId } = validation.data;

    // Get user and workflow names for response
    const userCheck = await query('SELECT name FROM users WHERE id = $1', [userId]);
    const workflowCheck = await query('SELECT name FROM workflows WHERE id = $1', [workflowId]);

    if (userCheck.rows.length === 0 || workflowCheck.rows.length === 0) {
      return NextResponse.json({ error: 'User or workflow not found' }, { status: 404 });
    }

    // Delete assignment
    const result = await query(
      'DELETE FROM user_workflows WHERE user_id = $1 AND workflow_id = $2',
      [userId, workflowId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Assignment not found or already removed' },
        { status: 404 }
      );
    }

    // Log audit
    await query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
       VALUES ($1, 'unassign_workflow', 'user_workflow', $2, $3)`,
      [
        user.userId,
        userId,
        JSON.stringify({
          workflowId,
          workflowName: workflowCheck.rows[0].name,
          userName: userCheck.rows[0].name,
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Workflow "${workflowCheck.rows[0].name}" removed from user "${userCheck.rows[0].name}"`,
    });
  } catch (error) {
    console.error('Error removing workflow assignment:', error);
    return NextResponse.json(
      { error: 'Failed to remove workflow assignment' },
      { status: 500 }
    );
  }
});

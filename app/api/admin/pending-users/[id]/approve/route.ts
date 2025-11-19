import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db/postgres';
import { z } from 'zod';

const approveSchema = z.object({
  workflowIds: z.array(z.string()).min(1, 'At least one workflow must be assigned'),
});

// POST /api/admin/pending-users/[id]/approve - Approve pending user
export const POST = withAuth(
  async (request: NextRequest, { params, user }: { params: { id: string }; user: any }) => {
    try {
      // Check if user is admin
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized. Admin access required.' },
          { status: 403 }
        );
      }

      const { id } = params;
      const body = await request.json();
      const validation = approveSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.errors },
          { status: 400 }
        );
      }

      const { workflowIds } = validation.data;

      // Check if pending user exists
      const pendingUserResult = await query(
        'SELECT * FROM pending_users WHERE id = $1 AND status = $2',
        [id, 'pending']
      );

      if (pendingUserResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Pending user not found or already processed' },
          { status: 404 }
        );
      }

      const pendingUser = pendingUserResult.rows[0];

      // Verify all workflows exist
      const workflowCheck = await query(
        'SELECT id FROM workflows WHERE id = ANY($1::text[])',
        [workflowIds]
      );

      if (workflowCheck.rows.length !== workflowIds.length) {
        return NextResponse.json({ error: 'One or more workflows not found' }, { status: 404 });
      }

      // Start transaction
      // Create user in users table
      const userResult = await query(
        `INSERT INTO users (email, name, auth_provider, provider_user_id, avatar_url, role, status)
         VALUES ($1, $2, $3, $4, $5, 'user', 'active')
         RETURNING id`,
        [
          pendingUser.email,
          pendingUser.name,
          pendingUser.auth_provider,
          pendingUser.provider_user_id,
          pendingUser.avatar_url,
        ]
      );

      const newUserId = userResult.rows[0].id;

      // Assign workflows to user
      for (const workflowId of workflowIds) {
        await query(
          `INSERT INTO user_workflows (user_id, workflow_id, granted_by)
           VALUES ($1, $2, $3)`,
          [newUserId, workflowId, user.userId]
        );
      }

      // Update pending user status
      await query(
        `UPDATE pending_users
         SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1
         WHERE id = $2`,
        [user.userId, id]
      );

      // Log audit
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, 'approve_pending_user', 'user', $2, $3)`,
        [
          user.userId,
          newUserId,
          JSON.stringify({
            pendingUserId: id,
            name: pendingUser.name,
            email: pendingUser.email,
            workflowIds,
          }),
        ]
      );

      return NextResponse.json({
        success: true,
        message: `User "${pendingUser.name}" approved successfully`,
        userId: newUserId,
      });
    } catch (error) {
      console.error('Error approving pending user:', error);
      return NextResponse.json({ error: 'Failed to approve user' }, { status: 500 });
    }
  }
);

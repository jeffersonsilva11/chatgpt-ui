import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db/postgres';

// POST /api/admin/pending-users/[id]/reject - Reject pending user
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

      // Update pending user status to rejected
      await query(
        `UPDATE pending_users
         SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $1
         WHERE id = $2`,
        [user.userId, id]
      );

      // Log audit
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, 'reject_pending_user', 'pending_user', $2, $3)`,
        [
          user.userId,
          id,
          JSON.stringify({
            name: pendingUser.name,
            email: pendingUser.email,
          }),
        ]
      );

      return NextResponse.json({
        success: true,
        message: `User "${pendingUser.name}" rejected`,
      });
    } catch (error) {
      console.error('Error rejecting pending user:', error);
      return NextResponse.json({ error: 'Failed to reject user' }, { status: 500 });
    }
  }
);

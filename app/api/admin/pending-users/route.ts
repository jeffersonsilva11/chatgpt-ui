import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db/postgres';

// GET /api/admin/pending-users - List all pending users
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const result = await query(
      `SELECT id, email, name, auth_provider, provider_user_id, avatar_url, status, created_at, reviewed_at, reviewed_by
       FROM pending_users
       WHERE status = 'pending'
       ORDER BY created_at ASC`
    );

    const pendingUsers = result.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      authProvider: row.auth_provider,
      providerUserId: row.provider_user_id,
      avatarUrl: row.avatar_url,
      status: row.status,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by,
    }));

    return NextResponse.json({ pendingUsers });
  } catch (error) {
    console.error('Error fetching pending users:', error);
    return NextResponse.json({ error: 'Failed to fetch pending users' }, { status: 500 });
  }
});

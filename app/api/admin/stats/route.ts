import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db/postgres';

// GET /api/admin/stats - Get system statistics
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    // Get total users count
    const usersResult = await query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_users,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_users,
        COUNT(*) as total_users
       FROM users`
    );

    const usersStats = usersResult.rows[0];

    // Get pending users count
    const pendingResult = await query(
      'SELECT COUNT(*) as pending_users FROM pending_users WHERE status = $1',
      ['pending']
    );

    const pendingCount = parseInt(pendingResult.rows[0].pending_users);

    // Get workflows count
    const workflowsResult = await query(
      `SELECT
        COUNT(*) FILTER (WHERE is_active = true) as active_workflows,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_workflows,
        COUNT(*) as total_workflows
       FROM workflows`
    );

    const workflowsStats = workflowsResult.rows[0];

    // Get recent activity (last 7 days)
    const activityResult = await query(
      `SELECT
        COUNT(*) FILTER (WHERE action = 'login') as logins,
        COUNT(*) FILTER (WHERE action LIKE 'create_%') as creations,
        COUNT(*) FILTER (WHERE action LIKE 'update_%') as updates,
        COUNT(*) FILTER (WHERE action LIKE 'delete_%') as deletions
       FROM audit_logs
       WHERE created_at >= NOW() - INTERVAL '7 days'`
    );

    const activityStats = activityResult.rows[0];

    // Get user growth (last 30 days)
    const growthResult = await query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as new_users
       FROM users
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    const userGrowth = growthResult.rows.map((row: any) => ({
      date: row.date,
      count: parseInt(row.new_users),
    }));

    // Get workflow usage
    const workflowUsageResult = await query(
      `SELECT
        w.id,
        w.name,
        w.icon,
        COUNT(DISTINCT uw.user_id) as user_count
       FROM workflows w
       LEFT JOIN user_workflows uw ON w.id = uw.workflow_id
       GROUP BY w.id, w.name, w.icon
       ORDER BY user_count DESC`
    );

    const workflowUsage = workflowUsageResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      userCount: parseInt(row.user_count),
    }));

    // Get auth providers distribution
    const authProvidersResult = await query(
      `SELECT
        auth_provider,
        COUNT(*) as count
       FROM users
       GROUP BY auth_provider
       ORDER BY count DESC`
    );

    const authProviders = authProvidersResult.rows.map((row: any) => ({
      provider: row.auth_provider,
      count: parseInt(row.count),
    }));

    return NextResponse.json({
      users: {
        total: parseInt(usersStats.total_users),
        active: parseInt(usersStats.active_users),
        inactive: parseInt(usersStats.inactive_users),
        pending: pendingCount,
      },
      workflows: {
        total: parseInt(workflowsStats.total_workflows),
        active: parseInt(workflowsStats.active_workflows),
        inactive: parseInt(workflowsStats.inactive_workflows),
      },
      activity: {
        logins: parseInt(activityStats.logins),
        creations: parseInt(activityStats.creations),
        updates: parseInt(activityStats.updates),
        deletions: parseInt(activityStats.deletions),
      },
      userGrowth,
      workflowUsage,
      authProviders,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
});

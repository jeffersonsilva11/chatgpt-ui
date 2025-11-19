import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db/postgres';
import { hashPassword } from '@/lib/auth/password';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'user']).default('user'),
  status: z.enum(['active', 'inactive']).default('active'),
});

// GET /api/admin/users - List all users
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const result = await query(
      `SELECT
        u.id, u.email, u.name, u.auth_provider, u.role, u.status,
        u.avatar_url, u.created_at, u.updated_at, u.last_login,
        COALESCE(
          json_agg(
            json_build_object(
              'id', w.id,
              'name', w.name,
              'icon', w.icon,
              'webhookUrl', w.webhook_url
            )
          ) FILTER (WHERE w.id IS NOT NULL),
          '[]'
        ) as workflows
       FROM users u
       LEFT JOIN user_workflows uw ON u.id = uw.user_id
       LEFT JOIN workflows w ON uw.workflow_id = w.id
       WHERE u.status != 'pending'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );

    const users = result.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      authProvider: row.auth_provider,
      role: row.role,
      status: row.status,
      avatarUrl: row.avatar_url,
      workflows: row.workflows,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
});

// POST /api/admin/users - Create new user
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [
      data.email.toLowerCase(),
    ]);

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: `User with email "${data.email}" already exists` },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, status, auth_provider)
       VALUES ($1, $2, $3, $4, $5, 'local')
       RETURNING id, name, email, role, status, auth_provider, created_at`,
      [data.name, data.email.toLowerCase(), passwordHash, data.role, data.status]
    );

    const newUser = result.rows[0];

    // Log audit
    await query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
       VALUES ($1, 'create_user', 'user', $2, $3)`,
      [user.userId, newUser.id, JSON.stringify({ name: newUser.name, email: newUser.email })]
    );

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        authProvider: newUser.auth_provider,
        createdAt: newUser.created_at,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
});

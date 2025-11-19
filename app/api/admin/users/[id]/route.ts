import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db/postgres';
import { hashPassword } from '@/lib/auth/password';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'user']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// PUT /api/admin/users/[id] - Update user
export const PUT = withAuth(
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
      const validation = updateUserSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.errors },
          { status: 400 }
        );
      }

      const data = validation.data;

      // Check if user exists
      const existing = await query('SELECT id, email FROM users WHERE id = $1', [id]);

      if (existing.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // If email is being updated, check if it's already taken
      if (data.email && data.email.toLowerCase() !== existing.rows[0].email) {
        const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [
          data.email.toLowerCase(),
          id,
        ]);

        if (emailCheck.rows.length > 0) {
          return NextResponse.json(
            { error: `Email "${data.email}" is already in use` },
            { status: 409 }
          );
        }
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(data.email.toLowerCase());
      }
      if (data.password !== undefined) {
        const passwordHash = await hashPassword(data.password);
        updates.push(`password_hash = $${paramIndex++}`);
        values.push(passwordHash);
      }
      if (data.role !== undefined) {
        updates.push(`role = $${paramIndex++}`);
        values.push(data.role);
      }
      if (data.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const result = await query(
        `UPDATE users
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, name, email, role, status, auth_provider, avatar_url, created_at, updated_at`,
        values
      );

      const updatedUser = result.rows[0];

      // Log audit
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, 'update_user', 'user', $2, $3)`,
        [user.userId, id, JSON.stringify(data)]
      );

      return NextResponse.json({
        success: true,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          status: updatedUser.status,
          authProvider: updatedUser.auth_provider,
          avatarUrl: updatedUser.avatar_url,
          createdAt: updatedUser.created_at,
          updatedAt: updatedUser.updated_at,
        },
      });
    } catch (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
  }
);

// DELETE /api/admin/users/[id] - Delete user
export const DELETE = withAuth(
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

      // Prevent admin from deleting themselves
      if (id === user.userId) {
        return NextResponse.json(
          { error: 'You cannot delete your own account' },
          { status: 400 }
        );
      }

      // Check if user exists
      const existing = await query('SELECT id, name, email FROM users WHERE id = $1', [id]);

      if (existing.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const deletedUser = existing.rows[0];

      // Delete user (cascade will handle user_workflows, sessions, etc)
      await query('DELETE FROM users WHERE id = $1', [id]);

      // Log audit
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, 'delete_user', 'user', $2, $3)`,
        [
          user.userId,
          id,
          JSON.stringify({ name: deletedUser.name, email: deletedUser.email }),
        ]
      );

      return NextResponse.json({
        success: true,
        message: `User "${deletedUser.name}" deleted successfully`,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
  }
);

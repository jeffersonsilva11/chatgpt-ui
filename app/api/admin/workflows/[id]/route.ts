import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db/postgres';
import { z } from 'zod';

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  webhookUrl: z.string().url().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  isMaster: z.boolean().optional(),
  allowedDepartments: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// PUT /api/admin/workflows/[id] - Update workflow
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
      const validation = updateWorkflowSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.errors },
          { status: 400 }
        );
      }

      const data = validation.data;

      // Check if workflow exists
      const existing = await query('SELECT id FROM workflows WHERE id = $1', [id]);

      if (existing.rows.length === 0) {
        return NextResponse.json({ error: `Workflow "${id}" not found` }, { status: 404 });
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.webhookUrl !== undefined) {
        updates.push(`webhook_url = $${paramIndex++}`);
        values.push(data.webhookUrl);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.icon !== undefined) {
        updates.push(`icon = $${paramIndex++}`);
        values.push(data.icon);
      }
      if (data.isMaster !== undefined) {
        updates.push(`is_master = $${paramIndex++}`);
        values.push(data.isMaster);
      }
      if (data.allowedDepartments !== undefined) {
        updates.push(`allowed_departments = $${paramIndex++}`);
        values.push(data.allowedDepartments);
      }
      if (data.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(data.isActive);
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const result = await query(
        `UPDATE workflows
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, name, webhook_url, description, icon, is_master, allowed_departments, is_active, created_at, updated_at`,
        values
      );

      const workflow = result.rows[0];

      // Log audit
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, 'update_workflow', 'workflow', $2, $3)`,
        [user.userId, id, JSON.stringify(data)]
      );

      return NextResponse.json({
        success: true,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          webhookUrl: workflow.webhook_url,
          description: workflow.description,
          icon: workflow.icon,
          isMaster: workflow.is_master,
          allowedDepartments: workflow.allowed_departments,
          isActive: workflow.is_active,
          createdAt: workflow.created_at,
          updatedAt: workflow.updated_at,
        },
      });
    } catch (error) {
      console.error('Error updating workflow:', error);
      return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
    }
  }
);

// DELETE /api/admin/workflows/[id] - Delete workflow
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

      // Check if workflow exists
      const existing = await query('SELECT id, name FROM workflows WHERE id = $1', [id]);

      if (existing.rows.length === 0) {
        return NextResponse.json({ error: `Workflow "${id}" not found` }, { status: 404 });
      }

      const workflowName = existing.rows[0].name;

      // Check if workflow is assigned to any users
      const assignments = await query(
        'SELECT COUNT(*) as count FROM user_workflows WHERE workflow_id = $1',
        [id]
      );

      const assignmentCount = parseInt(assignments.rows[0].count);

      if (assignmentCount > 0) {
        return NextResponse.json(
          {
            error: `Cannot delete workflow "${workflowName}". It is assigned to ${assignmentCount} user(s). Please remove all assignments first.`,
          },
          { status: 409 }
        );
      }

      // Delete workflow
      await query('DELETE FROM workflows WHERE id = $1', [id]);

      // Log audit
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, 'delete_workflow', 'workflow', $2, $3)`,
        [user.userId, id, JSON.stringify({ name: workflowName })]
      );

      return NextResponse.json({
        success: true,
        message: `Workflow "${workflowName}" deleted successfully`,
      });
    } catch (error) {
      console.error('Error deleting workflow:', error);
      return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 });
    }
  }
);

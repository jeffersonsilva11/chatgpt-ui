import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db/postgres';
import { z } from 'zod';

// Validation schema for workflow
const workflowSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  webhookUrl: z.string().url(),
  description: z.string().optional(),
  icon: z.string().optional(),
  isMaster: z.boolean().default(false),
  allowedDepartments: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

// GET /api/admin/workflows - List all workflows
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const result = await query(
      `SELECT id, name, webhook_url, description, icon, is_master, allowed_departments, is_active, created_at, updated_at
       FROM workflows
       ORDER BY created_at DESC`
    );

    const workflows = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      webhookUrl: row.webhook_url,
      description: row.description,
      icon: row.icon,
      isMaster: row.is_master,
      allowedDepartments: row.allowed_departments,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
});

// POST /api/admin/workflows - Create new workflow
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const validation = workflowSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if workflow ID already exists
    const existing = await query('SELECT id FROM workflows WHERE id = $1', [data.id]);

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: `Workflow with ID "${data.id}" already exists` },
        { status: 409 }
      );
    }

    // Insert workflow
    const result = await query(
      `INSERT INTO workflows (id, name, webhook_url, description, icon, is_master, allowed_departments, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, webhook_url, description, icon, is_master, allowed_departments, is_active, created_at, updated_at`,
      [
        data.id,
        data.name,
        data.webhookUrl,
        data.description || null,
        data.icon || null,
        data.isMaster,
        data.allowedDepartments,
        data.isActive,
      ]
    );

    const workflow = result.rows[0];

    // Log audit
    await query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
       VALUES ($1, 'create_workflow', 'workflow', $2, $3)`,
      [user.userId, workflow.id, JSON.stringify({ name: workflow.name })]
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
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
});

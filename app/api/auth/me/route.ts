import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db/postgres';
import { UserProfile, WorkflowSummary } from '@/lib/types';

async function handler(request: NextRequest, context: { params: any; user: any }) {
  try {
    const { user: jwtUser } = context;

    // Buscar dados atualizados do usuário no banco
    const userResult = await query(
      `SELECT id, email, name, role, status, avatar_url
       FROM users
       WHERE id = $1`,
      [jwtUser.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Verificar se usuário está ativo
    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Conta inativa ou aguardando aprovação' },
        { status: 403 }
      );
    }

    // Buscar workflows do usuário
    const workflowsResult = await query(
      `SELECT w.id, w.name, w.icon, w.description
       FROM workflows w
       INNER JOIN user_workflows uw ON w.id = uw.workflow_id
       WHERE uw.user_id = $1 AND w.is_active = true
       ORDER BY w.name`,
      [user.id]
    );

    const workflows: WorkflowSummary[] = workflowsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      description: row.description,
    }));

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatar_url,
      workflows,
    };

    return NextResponse.json(userProfile);

  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados do usuário' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler);

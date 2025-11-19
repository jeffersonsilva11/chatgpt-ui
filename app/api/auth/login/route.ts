import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { comparePassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { getClientIP, getUserAgent } from '@/lib/middleware/auth';
import { LoginRequest, LoginResponse, WorkflowSummary } from '@/lib/types';
import { z } from 'zod';

// Schema de validação
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();

    // Validar dados
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0].message,
        } as LoginResponse,
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Buscar usuário no banco
    const userResult = await query(
      `SELECT id, email, name, password_hash, role, status, avatar_url
       FROM users
       WHERE email = $1 AND auth_provider = 'local'`,
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email ou senha incorretos',
        } as LoginResponse,
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    // Verificar status do usuário
    if (user.status === 'inactive') {
      return NextResponse.json(
        {
          success: false,
          error: 'Conta inativa. Entre em contato com o administrador.',
        } as LoginResponse,
        { status: 403 }
      );
    }

    if (user.status === 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: 'Conta aguardando aprovação do administrador.',
        } as LoginResponse,
        { status: 403 }
      );
    }

    // Verificar senha
    if (!user.password_hash) {
      return NextResponse.json(
        {
          success: false,
          error: 'Esta conta usa login social. Por favor, use o provedor de autenticação correto.',
        } as LoginResponse,
        { status: 400 }
      );
    }

    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email ou senha incorretos',
        } as LoginResponse,
        { status: 401 }
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

    // Criar sessão
    const ipAddress = getClientIP(request);
    const userAgent = getUserAgent(request);
    const { token } = await createSession(
      user.id,
      user.email,
      user.role,
      ipAddress,
      userAgent
    );

    // Registrar log de auditoria
    await query(
      `INSERT INTO audit_logs (user_id, action, resource_type, ip_address, user_agent)
       VALUES ($1, 'login', 'session', $2, $3)`,
      [user.id, ipAddress, userAgent]
    );

    // Retornar resposta
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatar_url,
        workflows,
      },
    } as LoginResponse);

  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao processar login. Tente novamente.',
      } as LoginResponse,
      { status: 500 }
    );
  }
}

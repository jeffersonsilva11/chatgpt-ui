import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, validateSession } from '@/lib/auth';
import { JWTPayload, UserRole } from '@/lib/types';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Middleware para autenticar requisições
 * Retorna o payload do usuário se autenticado, null caso contrário
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return null;
  }

  const payload = await validateSession(token);
  return payload;
}

/**
 * Wrapper para proteger routes que requerem autenticação
 */
export function withAuth(
  handler: (
    request: NextRequest,
    context: { params: any; user: JWTPayload }
  ) => Promise<Response>
) {
  return async (request: NextRequest, context: { params: any }) => {
    const user = await authenticateRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado. Por favor, faça login.' },
        { status: 401 }
      );
    }

    // Verificar se usuário está ativo
    if (user.role === 'user') {
      // Aqui poderia adicionar verificação adicional de status do usuário no banco
      // por enquanto, apenas confiar no JWT
    }

    return handler(request, { params: context.params, user });
  };
}

/**
 * Wrapper para proteger routes que requerem role de admin
 */
export function withAdmin(
  handler: (
    request: NextRequest,
    context: { params: any; user: JWTPayload }
  ) => Promise<Response>
) {
  return async (request: NextRequest, context: { params: any }) => {
    const user = await authenticateRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado. Por favor, faça login.' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar este recurso.' },
        { status: 403 }
      );
    }

    return handler(request, { params: context.params, user });
  };
}

/**
 * Wrapper para routes que aceitam usuário autenticado ou não
 * Se autenticado, adiciona user ao context
 */
export function withOptionalAuth(
  handler: (
    request: NextRequest,
    context: { params: any; user?: JWTPayload }
  ) => Promise<Response>
) {
  return async (request: NextRequest, context: { params: any }) => {
    const user = await authenticateRequest(request);
    return handler(request, { params: context.params, user: user || undefined });
  };
}

/**
 * Helper para verificar se usuário tem acesso a um workflow
 */
export async function checkWorkflowAccess(
  userId: string,
  workflowId: string
): Promise<boolean> {
  const { query } = await import('@/lib/db/postgres');

  const result = await query(
    `SELECT 1 FROM user_workflows
     WHERE user_id = $1 AND workflow_id = $2
     LIMIT 1`,
    [userId, workflowId]
  );

  return result.rows.length > 0;
}

/**
 * Helper para verificar se usuário tem acesso a uma conversa
 */
export async function checkConversationAccess(
  userId: string,
  conversationId: string
): Promise<boolean> {
  const { query } = await import('@/lib/db/postgres');

  const result = await query(
    `SELECT 1 FROM conversations
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [conversationId, userId]
  );

  return result.rows.length > 0;
}

/**
 * Helper para obter IP do cliente
 */
export function getClientIP(request: NextRequest): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (real) {
    return real.trim();
  }

  return undefined;
}

/**
 * Helper para obter User-Agent
 */
export function getUserAgent(request: NextRequest): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

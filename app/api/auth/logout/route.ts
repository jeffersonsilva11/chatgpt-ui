import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader } from '@/lib/auth/jwt';
import { destroySession } from '@/lib/auth/session';
import { query } from '@/lib/db/postgres';
import { getClientIP, getUserAgent } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token não fornecido' },
        { status: 400 }
      );
    }

    // Pegar userId antes de destruir sessão (para audit log)
    const sessionResult = await query(
      'SELECT user_id FROM sessions WHERE token = $1',
      [token]
    );

    const userId = sessionResult.rows[0]?.user_id;

    // Destruir sessão
    await destroySession(token);

    // Registrar log de auditoria
    if (userId) {
      const ipAddress = getClientIP(request);
      const userAgent = getUserAgent(request);

      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, ip_address, user_agent)
         VALUES ($1, 'logout', 'session', $2, $3)`,
        [userId, ipAddress, userAgent]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso',
    });

  } catch (error) {
    console.error('Erro no logout:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao processar logout' },
      { status: 500 }
    );
  }
}

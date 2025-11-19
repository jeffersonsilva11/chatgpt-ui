import { query } from '@/lib/db/postgres';
import { sessionCache } from '@/lib/db/redis';
import { generateToken, verifyToken, getTokenTimeRemaining } from './jwt';
import { Session, JWTPayload, UserRole } from '@/lib/types';

/**
 * Cria uma nova sessão para o usuário
 */
export async function createSession(
  userId: string,
  email: string,
  role: UserRole,
  ipAddress?: string,
  userAgent?: string
): Promise<{ token: string; expiresAt: Date }> {
  // Gerar JWT token
  const token = generateToken({ userId, email, role });

  // Calcular data de expiração
  const expiresInSeconds = getTokenTimeRemaining(token);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  // Salvar sessão no PostgreSQL
  await query(
    `INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, token, expiresAt, ipAddress, userAgent]
  );

  // Salvar também no Redis para acesso rápido
  await sessionCache.set(token, userId, expiresInSeconds);

  // Atualizar last_login do usuário
  await query(
    'UPDATE users SET last_login = NOW() WHERE id = $1',
    [userId]
  );

  return { token, expiresAt };
}

/**
 * Valida uma sessão
 */
export async function validateSession(token: string): Promise<JWTPayload | null> {
  // 1. Verificar JWT token
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  // 2. Verificar no Redis (rápido)
  const cachedUserId = await sessionCache.get(token);
  if (!cachedUserId) {
    // Se não está no Redis, verificar no PostgreSQL
    const result = await query(
      `SELECT user_id, expires_at FROM sessions
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Recolocar no Redis
    const session = result.rows[0];
    const expiresInSeconds = Math.floor(
      (new Date(session.expires_at).getTime() - Date.now()) / 1000
    );

    if (expiresInSeconds > 0) {
      await sessionCache.set(token, session.user_id, expiresInSeconds);
    }
  }

  return payload;
}

/**
 * Destroi uma sessão (logout)
 */
export async function destroySession(token: string): Promise<void> {
  // Remover do Redis
  await sessionCache.delete(token);

  // Remover do PostgreSQL
  await query('DELETE FROM sessions WHERE token = $1', [token]);
}

/**
 * Destroi todas as sessões de um usuário
 */
export async function destroyAllUserSessions(userId: string): Promise<void> {
  // Pegar todos os tokens do usuário
  const result = await query(
    'SELECT token FROM sessions WHERE user_id = $1',
    [userId]
  );

  // Remover do Redis
  for (const row of result.rows) {
    await sessionCache.delete(row.token);
  }

  // Remover do PostgreSQL
  await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

/**
 * Remove sessões expiradas (cleanup)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await query(
    'DELETE FROM sessions WHERE expires_at < NOW() RETURNING id'
  );

  return result.rowCount || 0;
}

/**
 * Lista sessões ativas de um usuário
 */
export async function getUserSessions(userId: string): Promise<Session[]> {
  const result = await query(
    `SELECT id, user_id, token, expires_at, created_at, ip_address, user_agent
     FROM sessions
     WHERE user_id = $1 AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    token: row.token,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
  }));
}

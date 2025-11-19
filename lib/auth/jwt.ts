import jwt from 'jsonwebtoken';
import { JWTPayload } from '@/lib/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'; // 24 horas

/**
 * Gera um JWT token
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verifica e decodifica um JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('Token expirado');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('Token inválido');
    }
    return null;
  }
}

/**
 * Decodifica um token sem verificar (use com cuidado!)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extrai token do header Authorization
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;

  // Formato: "Bearer <token>"
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Verifica se o token está expirado
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);

  if (!decoded || !decoded.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

/**
 * Retorna tempo restante do token em segundos
 */
export function getTokenTimeRemaining(token: string): number {
  const decoded = decodeToken(token);

  if (!decoded || !decoded.exp) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);
  const remaining = decoded.exp - now;

  return Math.max(0, remaining);
}

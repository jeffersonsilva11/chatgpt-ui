import { createClient, RedisClientType } from 'redis';

// Cliente Redis
let client: RedisClientType | null = null;

/**
 * Cria e retorna o cliente Redis
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (client && client.isOpen) {
    return client;
  }

  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  client.on('error', (err) => {
    console.error('❌ Redis: Erro:', err);
  });

  client.on('connect', () => {
    console.log('🔴 Redis: Conectando...');
  });

  client.on('ready', () => {
    console.log('✅ Redis: Pronto');
  });

  await client.connect();
  return client;
}

/**
 * Armazena um valor no Redis com TTL
 */
export async function setCache(key: string, value: any, ttlSeconds: number = 3600) {
  const redis = await getRedisClient();
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  await redis.setEx(key, ttlSeconds, stringValue);
}

/**
 * Recupera um valor do Redis
 */
export async function getCache(key: string): Promise<any | null> {
  const redis = await getRedisClient();
  const value = await redis.get(key);

  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Remove um valor do Redis
 */
export async function deleteCache(key: string) {
  const redis = await getRedisClient();
  await redis.del(key);
}

/**
 * Remove múltiplos valores do Redis por pattern
 */
export async function deleteCacheByPattern(pattern: string) {
  const redis = await getRedisClient();
  const keys = await redis.keys(pattern);

  if (keys.length > 0) {
    await redis.del(keys);
  }
}

/**
 * Testa a conexão com o Redis
 */
export async function testRedisConnection() {
  try {
    const redis = await getRedisClient();
    await redis.ping();
    console.log('✅ Redis conectado');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com Redis:', error);
    return false;
  }
}

/**
 * Fecha a conexão com o Redis
 */
export async function closeRedis() {
  if (client && client.isOpen) {
    await client.quit();
    console.log('🔴 Redis: Conexão fechada');
  }
}

/**
 * Helper para gerenciar sessões
 */
export const sessionCache = {
  /**
   * Armazena token de sessão
   */
  async set(token: string, userId: string, expiresInSeconds: number) {
    await setCache(`session:${token}`, userId, expiresInSeconds);
  },

  /**
   * Recupera userId do token
   */
  async get(token: string): Promise<string | null> {
    return await getCache(`session:${token}`);
  },

  /**
   * Remove sessão
   */
  async delete(token: string) {
    await deleteCache(`session:${token}`);
  },

  /**
   * Remove todas as sessões de um usuário
   */
  async deleteAllUserSessions(userId: string) {
    const redis = await getRedisClient();
    const keys = await redis.keys('session:*');

    for (const key of keys) {
      const value = await redis.get(key);
      if (value === userId) {
        await redis.del(key);
      }
    }
  }
};

export default client;

import { Pool, PoolClient } from 'pg';

// Pool de conexões com PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Máximo de conexões no pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Event listeners para debug
pool.on('connect', () => {
  console.log('🐘 PostgreSQL: Nova conexão estabelecida');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL: Erro inesperado:', err);
  process.exit(-1);
});

/**
 * Executa uma query no banco de dados
 */
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Query executada:', { text, duration, rows: res.rowCount });
    }

    return res;
  } catch (error) {
    console.error('❌ Erro na query:', { text, error });
    throw error;
  }
}

/**
 * Pega um cliente do pool para executar múltiplas queries em transação
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

/**
 * Testa a conexão com o banco
 */
export async function testConnection() {
  try {
    const result = await query('SELECT NOW() as now, version() as version');
    console.log('✅ PostgreSQL conectado:', {
      time: result.rows[0].now,
      version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]
    });
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com PostgreSQL:', error);
    return false;
  }
}

/**
 * Fecha o pool de conexões
 */
export async function closePool() {
  await pool.end();
  console.log('🐘 PostgreSQL: Pool de conexões fechado');
}

export default pool;

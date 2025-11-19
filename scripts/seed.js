/**
 * Script para criar usuário admin inicial
 *
 * Usage:
 *   node scripts/seed.js
 *   npm run db:seed
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdminUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('👤 Criação de Usuário Administrador\n');

    // Coletar dados do usuário
    const name = await question('Nome do administrador: ');
    const email = await question('Email: ');
    const password = await question('Senha: ');

    if (!name || !email || !password) {
      console.log('❌ Todos os campos são obrigatórios!');
      process.exit(1);
    }

    console.log('\n🔄 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL\n');

    // Verificar se usuário já existe
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log('❌ Já existe um usuário com este email!');
      process.exit(1);
    }

    // Hash da senha
    console.log('🔒 Gerando hash da senha...');
    const passwordHash = await bcrypt.hash(password, 10);

    // Criar usuário
    console.log('👤 Criando usuário administrador...');
    const result = await client.query(
      `INSERT INTO users (name, email, password_hash, role, status, auth_provider)
       VALUES ($1, $2, $3, 'admin', 'active', 'local')
       RETURNING id, name, email, role`,
      [name, email, passwordHash]
    );

    const user = result.rows[0];

    console.log('\n✅ Usuário administrador criado com sucesso!');
    console.log('\nDetalhes:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Nome: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);

    // Dar acesso ao workflow "geral"
    await client.query(
      `INSERT INTO user_workflows (user_id, workflow_id)
       VALUES ($1, 'geral')
       ON CONFLICT DO NOTHING`,
      [user.id]
    );

    console.log('\n🔑 Permissões:');
    console.log('  - Workflow "Geral" atribuído');
    console.log('\n💡 Você pode fazer login com:');
    console.log(`  Email: ${email}`);
    console.log(`  Senha: (a senha que você definiu)\n`);

  } catch (error) {
    console.error('\n❌ Erro ao criar usuário:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    rl.close();
  }
}

createAdminUser();

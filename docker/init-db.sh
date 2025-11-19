#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Criar database para N8N
    SELECT 'CREATE DATABASE n8n'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n')\gexec
    GRANT ALL PRIVILEGES ON DATABASE n8n TO $POSTGRES_USER;

    -- Criar database para ChatApp
    SELECT 'CREATE DATABASE chatapp'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'chatapp')\gexec
    GRANT ALL PRIVILEGES ON DATABASE chatapp TO $POSTGRES_USER;
EOSQL

echo "✅ Databases 'n8n' e 'chatapp' criados com sucesso!"

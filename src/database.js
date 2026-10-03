const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDb() {
  try {
    await pool.query(`
      -- Sessões do WhatsApp (Baileys)
      CREATE TABLE IF NOT EXISTS whatsapp_sessions (
        id VARCHAR(255) PRIMARY KEY,
        data TEXT NOT NULL
      );

      -- Cadastro de Clientes e Estado das Conversas
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        whatsapp VARCHAR(255) UNIQUE NOT NULL,
        nome VARCHAR(255),
        empresa VARCHAR(255),
        step VARCHAR(50) DEFAULT 'main',
        status VARCHAR(50) DEFAULT 'bot', -- 'bot' ou 'human_attending'
        last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Leads confirmados pelo fluxo do especialista
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        whatsapp VARCHAR(255),
        nome VARCHAR(255),
        empresa VARCHAR(255),
        necessidade TEXT,
        status VARCHAR(50) DEFAULT 'novo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabelas verificadas e prontas no banco!');
  } catch (err) {
    console.error('❌ Erro ao inicializar banco de dados:', err);
  }
}

initDb();

module.exports = { pool };
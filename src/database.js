const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Inicialização e verificação de tabelas
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_sessions (
        id VARCHAR(255) PRIMARY KEY,
        data TEXT NOT NULL
      );

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
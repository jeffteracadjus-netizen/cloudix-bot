const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testDatabase() {
  try {
    const result = await pool.query("SELECT NOW()");

    console.log("====================================");
    console.log("✅ BANCO DE DADOS CONECTADO!");
    console.log("🗄️ PostgreSQL funcionando corretamente.");
    console.log("🕐 Horário do banco:", result.rows[0].now);
    console.log("====================================");
  } catch (error) {
    console.error("❌ ERRO AO CONECTAR AO BANCO:");
    console.error(error.message);
  }
}

async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        whatsapp VARCHAR(100) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        empresa VARCHAR(255),
        necessidade TEXT,
        status VARCHAR(50) DEFAULT 'novo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ TABELA DE LEADS PRONTA!");
  } catch (error) {
    console.error("❌ ERRO AO CRIAR TABELAS:");
    console.error(error.message);
  }
}

module.exports = {
  pool,
  testDatabase,
  createTables
};
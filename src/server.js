const express = require('express');
const { default: makeWASocket, DisconnectReason, initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const { Pool } = require('pg');
const pino = require('pino');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
let qrCodeData = '';
let statusBot = 'Desconectado';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Gerenciador de Auth no PostgreSQL
async function usePostgresAuthState(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_auth (
      id VARCHAR(255) PRIMARY KEY,
      data TEXT NOT NULL
    );
  `);

  const writeData = async (data, id) => {
    try {
      const value = JSON.stringify(data, BufferJSON.replacer);
      await pool.query(
        'INSERT INTO whatsapp_auth (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data',
        [id, value]
      );
    } catch (err) {
      console.error('Erro ao salvar auth no DB:', err);
    }
  };

  const readData = async (id) => {
    try {
      const res = await pool.query('SELECT data FROM whatsapp_auth WHERE id = $1', [id]);
      if (res.rows[0]?.data) {
        return JSON.parse(res.rows[0].data, BufferJSON.reviver);
      }
    } catch (err) {
      console.error('Erro ao ler auth do DB:', err);
    }
    return null;
  };

  const removeData = async (id) => {
    try {
      await pool.query('DELETE FROM whatsapp_auth WHERE id = $1', [id]);
    } catch (err) {
      console.error('Erro ao deletar auth do DB:', err);
    }
  };

  const creds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: () => writeData(creds, 'creds')
  };
}

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Online', whatsapp: statusBot });
});

app.get('/qr', async (req, res) => {
  if (!qrCodeData) return res.send('<h3>QR Code ainda não gerado ou bot já conectado.</h3>');
  const qrImage = await QRCode.toDataURL(qrCodeData);
  res.send(`<img src="${qrImage}" style="display:block;margin:auto;margin-top:100px;"/>`);
});

async function connectToWhatsApp() {
  const { state, saveCreds } = await usePostgresAuthState(pool);

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state
  });

  sock.ev.on('creds.update', saveCreds);

  // Passo 3: Lógica de Comandos
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe || msg.key.remoteJid.endsWith('@g.us')) continue;

      const sender = msg.key.remoteJid;
      const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim().toLowerCase();

      if (!text) continue;

      if (text === '!menu' || text === 'menu') {
        const menuText = "*📌 MENU PRINCIPAL*\n\n1️⃣ !suporte - Falar com a equipe\n2️⃣ !ping - Testar resposta\n3️⃣ !info - Informações do sistema";
        await sock.sendMessage(sender, { text: menuText });
      } else if (text === '!suporte') {
        await sock.sendMessage(sender, { text: 'Um atendente analisará sua solicitação em breve.' });
      } else if (text === '!ping') {
        await sock.sendMessage(sender, { text: '🏓 Pong! Bot ativo e respondendo.' });
      } else if (text === '!info') {
        await sock.sendMessage(sender, { text: '🤖 Bot rodando no Render + PostgreSQL (Neon).' });
      } else {
        await sock.sendMessage(sender, { 
          text: 'Olá! Digite *!menu* para ver as opções disponíveis.' 
        });
      }
    }
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) qrCodeData = qr;

    if (connection === 'close') {
      statusBot = 'Desconectado';
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) connectToWhatsApp();
    } else if (connection === 'open') {
      statusBot = 'Conectado';
      qrCodeData = '';
      console.log('Bot conectado com sucesso ao WhatsApp (Sessão salva no DB)!');
    }
  });
}

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  connectToWhatsApp();

  // Passo 2: Self-Ping (Evitar Sleep no Render)
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
  if (RENDER_URL) {
    setInterval(() => {
      https.get(RENDER_URL, (res) => {
        console.log(`Self-ping enviado para ${RENDER_URL} | Status: ${res.statusCode}`);
      }).on('error', (err) => {
        console.error('Erro no self-ping:', err.message);
      });
    }, 10 * 60 * 1000); // Executa a cada 10 minutos
  }
});
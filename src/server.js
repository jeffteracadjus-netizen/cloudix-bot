const express = require('express');
const { default: makeWASocket, DisconnectReason, initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');
const https = require('https');
const { pool } = require('./database');
const { handleMessage } = require('./bot');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
let qrCodeData = '';
let statusBot = 'Desconectado';

const processedMessages = new Set();

async function usePostgresAuthState(pool) {
  const writeData = async (data, id) => {
    try {
      const value = JSON.stringify(data, BufferJSON.replacer);
      await pool.query(
        'INSERT INTO whatsapp_sessions (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data',
        [id, value]
      );
    } catch (err) {
      console.error('Erro ao salvar auth no DB:', err);
    }
  };

  const readData = async (id) => {
    try {
      const res = await pool.query('SELECT data FROM whatsapp_sessions WHERE id = $1', [id]);
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
      await pool.query('DELETE FROM whatsapp_sessions WHERE id = $1', [id]);
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

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (processedMessages.has(msg.key.id)) continue;
      processedMessages.add(msg.key.id);

      if (processedMessages.size > 500) {
        const firstKey = processedMessages.values().next().value;
        processedMessages.delete(firstKey);
      }

      await handleMessage(sock, msg);
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
      console.log('Bot Cloudix totalmente conectado!');
    }
  });
}

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  connectToWhatsApp();

  const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
  if (RENDER_URL) {
    setInterval(() => {
      https.get(RENDER_URL, () => {}).on('error', () => {});
    }, 10 * 60 * 1000);
  }
});
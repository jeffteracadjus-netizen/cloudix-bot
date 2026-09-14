const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const { Pool } = require('pg');
const pino = require('pino');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
let qrCodeData = '';
let statusBot = 'Desconectado';

// Conexão com o Neon PostgreSQL (requer SSL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());

// Rota de Health Check para o Render não derrubar a aplicação
app.get('/', (req, res) => {
  res.json({ status: 'Online', whatsapp: statusBot });
});

// Rota para visualizar o QR Code via navegador
app.get('/qr', async (req, res) => {
  if (!qrCodeData) return res.send('<h3>QR Code ainda não gerado ou bot já conectado.</h3>');
  const qrImage = await QRCode.toDataURL(qrCodeData);
  res.send(`<img src="${qrImage}" style="display:block;margin:auto;margin-top:100px;"/>`);
});

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('creds.update', saveCreds);

  // --- ADICIONE ESTE BLOCO AQUI ---
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      // Ignora mensagens enviadas pelo próprio bot ou de grupos
      if (msg.key.fromMe || msg.key.remoteJid.endsWith('@g.us')) continue;

      const sender = msg.key.remoteJid;
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

      console.log(`Mensagem recebida de ${sender}: ${text}`);

      // Exemplo de resposta automática
      if (text) {
        await sock.sendMessage(sender, { 
          text: 'Olá! Mensagem recebida com sucesso pelo bot no Render 🚀' 
        });
      }
    }
  });
  // --------------------------------
  
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCodeData = qr;
    }

    if (connection === 'close') {
      statusBot = 'Desconectado';
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      statusBot = 'Conectado';
      qrCodeData = '';
      console.log('Bot conectado com sucesso ao WhatsApp!');
    }
  });
}

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  connectToWhatsApp();
});
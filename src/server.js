const express = require('express');
const QRCode = require('qrcode');
const { startWhatsApp, getQRCode } = require('./whatsapp');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Online', service: 'Cloudix Bot' });
});

app.get('/qr', async (req, res) => {
  const qr = getQRCode();
  if (!qr) return res.send('<h3>QR Code ainda não gerado ou bot já conectado.</h3>');
  const qrImage = await QRCode.toDataURL(qr);
  res.send(`<img src="${qrImage}" style="display:block;margin:auto;margin-top:100px;"/>`);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  startWhatsApp();
});
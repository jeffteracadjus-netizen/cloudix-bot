const express = require("express");
require("dotenv").config();

const { startWhatsApp, getWhatsAppStatus } = require("./whatsapp");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  const status = getWhatsAppStatus();

  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>CLOUDIX BOT</title>

  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: Arial, sans-serif;
      background: #0d0d0d;
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      width: 100%;
      max-width: 700px;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .logo {
      font-size: 38px;
      font-weight: bold;
      letter-spacing: 2px;
    }

    .subtitle {
      color: #999;
      margin-top: 8px;
    }

    .card {
      background: #171717;
      border: 1px solid #292929;
      border-radius: 18px;
      padding: 25px;
      margin-bottom: 20px;
    }

    .status {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 20px;
    }

    .dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 12px #22c55e;
    }

    .info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }

    .item {
      background: #202020;
      border-radius: 12px;
      padding: 16px;
    }

    .label {
      color: #888;
      font-size: 13px;
      margin-bottom: 7px;
    }

    .value {
      font-size: 17px;
      font-weight: bold;
    }

    .menu {
      line-height: 1.8;
      color: #ddd;
    }

    .footer {
      text-align: center;
      color: #666;
      font-size: 13px;
      margin-top: 25px;
    }

    @media (max-width: 600px) {
      .info {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>

<body>

  <main class="container">

    <div class="header">
      <div class="logo">CLOUDIX BOT</div>
      <div class="subtitle">Automação inteligente via WhatsApp</div>
    </div>

    <section class="card">

      <div class="status">
        <span class="dot"></span>
        SISTEMA ONLINE
      </div>

      <div class="info">

        <div class="item">
          <div class="label">WhatsApp</div>
          <div class="value">
            ${status.connected ? "🟢 Conectado" : "🔴 Desconectado"}
          </div>
        </div>

        <div class="item">
          <div class="label">Bot</div>
          <div class="value">CLOUDIX BOT</div>
        </div>

        <div class="item">
          <div class="label">Servidor</div>
          <div class="value">🟢 Online</div>
        </div>

        <div class="item">
          <div class="label">Ambiente</div>
          <div class="value">${process.env.NODE_ENV || "development"}</div>
        </div>

      </div>

    </section>

    <section class="card">

      <h2 style="margin-bottom: 15px;">
        🤖 Atendimento automático
      </h2>

      <div class="menu">
        <p>1️⃣ Planos</p>
        <p>2️⃣ Falar com especialista</p>
        <p>3️⃣ Suporte</p>
      </div>

    </section>

    <div class="footer">
      CLOUDIX © ${new Date().getFullYear()}
    </div>

  </main>

</body>
</html>
  `);
});

app.get("/health", (req, res) => {
  const status = getWhatsAppStatus();

  res.json({
    status: "online",
    service: "CLOUDIX BOT",
    whatsapp: status.connected
  });
});

app.listen(PORT, async () => {
  console.log(`CLOUDIX BOT rodando na porta ${PORT}`);

  try {
    await startWhatsApp();
  } catch (error) {
    console.error("Erro ao iniciar WhatsApp:", error);
  }
});
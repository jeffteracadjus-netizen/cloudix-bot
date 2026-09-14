const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");
const QRCode = require("qrcode");
const config = require("./config");
const { handleMessage } = require("./bot");

let sock = null;
let whatsappConnected = false;
let currentQR = null;

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(
    config.authFolder
  );

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({
      level: "silent"
    }),
    browser: ["CLOUDIX BOT", "Chrome", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const message of messages) {
      await handleMessage(sock, message);
    }
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
  currentQR = qr;

  console.log("\n====================================");
  console.log("📱 QR CODE DO WHATSAPP DISPONÍVEL");
  console.log("====================================\n");

  try {
    const qrTerminal = await QRCode.toString(qr, {
      type: "terminal",
      small: true
    });

    console.log(qrTerminal);
    console.log("\nAbra o WhatsApp no celular:");
    console.log("Configurações → Aparelhos conectados → Conectar aparelho");
    console.log("Escaneie o QR Code acima.\n");
  } catch (error) {
    console.error("Erro ao gerar QR Code:", error);
  }
}

    if (connection === "open") {
      whatsappConnected = true;
      currentQR = null;

      console.log("\n====================================");
      console.log("✅ WHATSAPP CONECTADO!");
      console.log("🤖 CLOUDIX BOT ONLINE");
      console.log("====================================\n");
    }

    if (connection === "close") {
        whatsappConnected = false;

      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut;

      console.log("\n⚠️ Conexão do WhatsApp encerrada.");

      if (shouldReconnect) {
        console.log("🔄 Tentando reconectar...\n");
        startWhatsApp();
      } else {
        console.log(
          "❌ WhatsApp desconectado permanentemente. Será necessário autenticar novamente."
        );
      }
    }
  });

  return sock;
}

function getSocket() {
  return sock;
}

function getWhatsAppStatus() {
  return {
    connected: whatsappConnected,
    qr: currentQR
  };
}

module.exports = {
  startWhatsApp,
  getSocket,
  getWhatsAppStatus
};
const { default: makeWASocket, DisconnectReason, initAuthCreds, BufferJSON, proto } = require("@whiskeysockets/baileys");
const P = require("pino");
const { handleMessage } = require("./bot");
const { pool } = require("./database");

let sock = null;
let currentQR = null;

async function usePostgresAuthState() {
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

async function startWhatsApp() {
  try {
    const { state, saveCreds } = await usePostgresAuthState();

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: P({ level: "silent" })
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const message of messages) {
        await handleMessage(sock, message);
      }
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) currentQR = qr;

      if (connection === "open") {
        currentQR = null;
        console.log("✅ WHATSAPP CONECTADO E BOT ONLINE!");
      }

      if (connection === "close") {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          setTimeout(startWhatsApp, 3000);
        }
      }
    });

    return sock;
  } catch (error) {
    console.error("❌ Erro ao iniciar WhatsApp:", error);
    setTimeout(startWhatsApp, 5000);
  }
}

function getQRCode() {
  return currentQR;
}

module.exports = { startWhatsApp, getQRCode };
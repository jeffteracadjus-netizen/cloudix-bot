const {
    default: makeWASocket,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    initAuthCreds,
    BufferJSON,
    proto
} = require("@whiskeysockets/baileys");

const P = require("pino");
const QRCode = require("qrcode");

const config = require("./config");
const { handleMessage } = require("./bot");
const { pool } = require("./database");

let sock = null;
let whatsappConnected = false;
let currentQR = null;

// =====================================================
// AUTENTICAÇÃO DO WHATSAPP NO POSTGRESQL
// =====================================================

async function usePostgresAuthState() {

    const { rows } = await pool.query(
        "SELECT key, value FROM whatsapp_auth"
    );

    const data = {};

    for (const row of rows) {
        data[row.key] = row.value;
    }

    const creds = data["creds"]
        ? JSON.parse(JSON.stringify(data["creds"], BufferJSON.reviver))
        : initAuthCreds();

    async function saveCreds() {
        await pool.query(
            `
            INSERT INTO whatsapp_auth (key, value)
            VALUES ($1, $2)
            ON CONFLICT (key)
            DO UPDATE SET value = EXCLUDED.value
            `,
            [
                "creds",
                JSON.stringify(creds, BufferJSON.replacer)
            ]
        );
    }

    const keys = {
        get: async (type, ids) => {

            const result = {};

            for (const id of ids) {

                const key = `${type}-${id}`;

                const query = await pool.query(
                    "SELECT value FROM whatsapp_auth WHERE key = $1",
                    [key]
                );

                if (query.rows.length) {

                    result[id] = JSON.parse(
                        JSON.stringify(
                            query.rows[0].value
                        ),
                        BufferJSON.reviver
                    );
                }
            }

            return result;
        },

        set: async (data) => {

            for (const category of Object.keys(data)) {

                for (const id of Object.keys(data[category])) {

                    const key = `${category}-${id}`;

                    const value = data[category][id];

                    await pool.query(
                        `
                        INSERT INTO whatsapp_auth (key, value)
                        VALUES ($1, $2)
                        ON CONFLICT (key)
                        DO UPDATE SET value = EXCLUDED.value
                        `,
                        [
                            key,
                            JSON.parse(
                                JSON.stringify(
                                    value,
                                    BufferJSON.replacer
                                )
                            )
                        ]
                    );
                }
            }
        }
    };

    return {
        state: {
            creds,
            keys: makeCacheableSignalKeyStore(
                keys,
                P({
                    level: "silent"
                })
            )
        },
        saveCreds
    };
}

// =====================================================
// INICIAR WHATSAPP
// =====================================================

async function startWhatsApp() {

    try {

        const { state, saveCreds } =
            await usePostgresAuthState();

        sock = makeWASocket({

            auth: state,

            printQRInTerminal: false,

            logger: P({
                level: "info"
            }),

            browser: [
                "CLOUDIX BOT",
                "Chrome",
                "1.0.0"
            ]
        });

        // =================================================
        // SALVAR CREDENCIAIS
        // =================================================

        sock.ev.on(
            "creds.update",
            async () => {

                try {

                    await saveCreds();

                    console.log(
                        "💾 Credenciais do WhatsApp salvas no PostgreSQL."
                    );

                } catch (error) {

                    console.error(
                        "❌ Erro ao salvar credenciais:",
                        error.message
                    );
                }
            }
        );

        // =================================================
        // RECEBER MENSAGENS
        // =================================================

        sock.ev.on(
            "messages.upsert",
            async ({ messages, type }) => {

                if (type !== "notify") {
                    return;
                }

                for (const message of messages) {

                    try {

                        await handleMessage(
                            sock,
                            message
                        );

                    } catch (error) {

                        console.error(
                            "❌ Erro ao processar mensagem:",
                            error.message
                        );
                    }
                }
            }
        );

        // =================================================
        // STATUS DA CONEXÃO
        // =================================================

        sock.ev.on(
            "connection.update",
            async (update) => {

                const {
                    connection,
                    lastDisconnect,
                    qr
                } = update;

                // =============================================
                // QR CODE
                // =============================================

                if (qr) {

                    currentQR = qr;

                    console.log(
                        "\n===================================="
                    );

                    console.log(
                        "📱 QR CODE DO WHATSAPP DISPONÍVEL"
                    );

                    console.log(
                        "====================================\n"
                    );

                    try {

                        const qrTerminal =
                            await QRCode.toString(
                                qr,
                                {
                                    type: "terminal",
                                    small: true
                                }
                            );

                        console.log(qrTerminal);

                        console.log(
                            "\nAbra o WhatsApp no celular:"
                        );

                        console.log(
                            "Configurações → Aparelhos conectados → Conectar aparelho"
                        );

                        console.log(
                            "Escaneie o QR Code acima.\n"
                        );

                    } catch (error) {

                        console.error(
                            "❌ Erro ao gerar QR Code:",
                            error.message
                        );
                    }
                }

                // =============================================
                // CONECTADO
                // =============================================

                if (connection === "open") {

                    whatsappConnected = true;
                    currentQR = null;

                    console.log(
                        "\n===================================="
                    );

                    console.log(
                        "✅ WHATSAPP CONECTADO!"
                    );

                    console.log(
                        "🤖 CLOUDIX BOT ONLINE"
                    );

                    console.log(
                        "💾 Sessão armazenada no PostgreSQL"
                    );

                    console.log(
                        "====================================\n"
                    );
                }

                // =============================================
                // DESCONECTADO
                // =============================================

                if (connection === "close") {

                    whatsappConnected = false;

                    const statusCode =
                        lastDisconnect
                            ?.error
                            ?.output
                            ?.statusCode;

                    const shouldReconnect =
                        statusCode !==
                        DisconnectReason.loggedOut;

                    console.log(
                        "\n⚠️ Conexão do WhatsApp encerrada."
                    );

                    console.log(
                        "Código:",
                        statusCode
                    );

                    if (shouldReconnect) {

                        console.log(
                            "🔄 Tentando reconectar...\n"
                        );

                        setTimeout(
                            () => {
                                startWhatsApp();
                            },
                            3000
                        );

                    } else {

                        currentQR = null;

                        console.log(
                            "❌ WhatsApp desconectado permanentemente."
                        );

                        console.log(
                            "📱 Será necessário autenticar novamente."
                        );
                    }
                }
            }
        );

        return sock;

    } catch (error) {

        console.error(
            "❌ Erro ao iniciar WhatsApp:",
            error
        );

        whatsappConnected = false;

        setTimeout(
            () => {
                startWhatsApp();
            },
            5000
        );
    }
}

// =====================================================
// SOCKET
// =====================================================

function getSocket() {
    return sock;
}

// =====================================================
// STATUS
// =====================================================

function getWhatsAppStatus() {

    return {
        connected: whatsappConnected,
        qr: currentQR
    };
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    startWhatsApp,
    getSocket,
    getWhatsAppStatus
};
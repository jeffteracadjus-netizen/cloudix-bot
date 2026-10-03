const { pool } = require("./database");

const userTimers = new Map(); // Timers temporários de inatividade

// --- MENSAGENS DE MENU ---
function getMainMenu() {
  return `👋 Olá! Seja bem-vindo à *CLOUDIX*.

Somos uma empresa de tecnologia, automação e inteligência artificial.

Como podemos ajudar você hoje?

*1️⃣* Conhecer nossas soluções
*2️⃣* Falar com um especialista
*3️⃣* Suporte

Digite apenas o número da opção desejada.`;
}

function getPlans() {
  return `🤖 *SOLUÇÕES CLOUDIX*

Escolha uma solução para conhecer melhor:

*1️⃣* CLOUDIX AI
*2️⃣* Automação
*3️⃣* Marketing & Conteúdo
*4️⃣* Atendimento
*0️⃣* Voltar ao menu`;
}

function getCloudixAI() {
  return `🤖 *CLOUDIX AI*

Inteligência artificial desenvolvida para ajudar empresas a automatizar processos.

Digite:
*1️⃣* Conhecer a solução
*2️⃣* Falar com especialista
*0️⃣* Voltar`;
}

function getAutomation() {
  return `⚙️ *AUTOMAÇÃO CLOUDIX*

Automatize tarefas e processos repetitivos da sua empresa.

Digite:
*2️⃣* Falar com especialista
*0️⃣* Voltar`;
}

function getMarketing() {
  return `📣 *MARKETING & CONTEÚDO*

Melhore sua presença digital com IA e estratégias de conteúdo.

Digite:
*2️⃣* Falar com especialista
*0️⃣* Voltar`;
}

function getService() {
  return `💬 *ATENDIMENTO CLOUDIX*

Transforme o atendimento da sua empresa com WhatsApp automatizado e respostas inteligentes.

Digite:
*2️⃣* Falar com especialista
*0️⃣* Voltar`;
}

function getSpecialist() {
  return `👨‍💻 *ESPECIALISTA CLOUDIX*

Vamos entender melhor sua empresa.

👤 *Qual é o seu nome?*

Digite seu nome ou *0* para voltar ao menu.`;
}

function getSupport() {
  return `🛠️ *SUPORTE CLOUDIX*

Nossa equipe está disponível para ajudar com chamados técnicos.

Digite *0* para voltar ao menu principal.`;
}

function getClosingPrompt() {
  return `😊 Por nada! Ficamos felizes em ajudar.

Deseja finalizar este atendimento?

*1️⃣* Sim, finalizar atendimento
*2️⃣* Não, voltar ao menu principal`;
}

function getUnknownOption() {
  return `🤔 Não consegui identificar essa opção.

Escolha uma das opções disponíveis ou digite *menu* para voltar ao início.`;
}

function normalizeText(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// --- FUNÇÕES DE BANCO DE DADOS PARA CLIENTES ---
async function getOrCreateClient(remoteJid, pushName) {
  let res = await pool.query("SELECT * FROM clients WHERE whatsapp = $1", [remoteJid]);
  
  if (res.rows.length === 0) {
    res = await pool.query(
      "INSERT INTO clients (whatsapp, nome, step, status) VALUES ($1, $2, $3, $4) RETURNING *",
      [remoteJid, pushName || "Cliente", "main", "bot"]
    );
  } else {
    await pool.query("UPDATE clients SET last_interaction = NOW() WHERE whatsapp = $1", [remoteJid]);
  }
  return res.rows[0];
}

async function updateClientStep(remoteJid, step, extraData = {}) {
  const fields = ["step = $2", "last_interaction = NOW()"];
  const values = [remoteJid, step];
  let idx = 3;

  if (extraData.nome) {
    fields.push(`nome = $${idx}`);
    values.push(extraData.nome);
    idx++;
  }
  if (extraData.empresa) {
    fields.push(`empresa = $${idx}`);
    values.push(extraData.empresa);
    idx++;
  }
  if (extraData.status) {
    fields.push(`status = $${idx}`);
    values.push(extraData.status);
    idx++;
  }

  await pool.query(
    `UPDATE clients SET ${fields.join(", ")} WHERE whatsapp = $1`,
    values
  );
}

// Timer de inatividade (15 minutos)
function resetInactivityTimer(sock, remoteJid) {
  if (userTimers.has(remoteJid)) clearTimeout(userTimers.get(remoteJid));

  const timer = setTimeout(async () => {
    const res = await pool.query("SELECT step, status FROM clients WHERE whatsapp = $1", [remoteJid]);
    const client = res.rows[0];

    if (client && client.status !== "human_attending") {
      await updateClientStep(remoteJid, "check_inactivity");
      await sock.sendMessage(remoteJid, {
        text: `⏳ *ATENDIMENTO INATIVO*\n\nPercebi que você está há um tempo sem responder. Podemos finalizar este atendimento?\n\n*1️⃣* Sim, finalizar\n*2️⃣* Continuar atendimento`
      });
    }
    userTimers.delete(remoteJid);
  }, 15 * 60 * 1000);

  userTimers.set(remoteJid, timer);
}

// --- HANDLER PRINCIPAL DE MENSAGENS ---
async function handleMessage(sock, message) {
  try {
    if (!message.message || message.key.fromMe) return;

    const remoteJid = message.key.remoteJid;
    if (!remoteJid || remoteJid.endsWith("@g.us")) return; // Ignora grupos

    const messageContent =
      message.message.conversation ||
      message.message.extendedTextMessage?.text ||
      "";

    if (!messageContent) return;

    const text = normalizeText(messageContent);
    const pushName = message.pushName;

    // 1. Busca ou cria o cliente no PostgreSQL
    const client = await getOrCreateClient(remoteJid, pushName);

    // Se estiver em atendimento humano, o bot não responde
    if (client.status === "human_attending" && text !== "menu") {
      return;
    }

    resetInactivityTimer(sock, remoteJid);

    let state = client.step || "main";
    let response;

    // Comandos globais de reinício
    if (["menu", "inicio", "comecar", "oi", "ola", "bom dia", "boa tarde", "boa noite"].includes(text)) {
      await updateClientStep(remoteJid, "main", { status: "bot" });
      response = getMainMenu();
      await sock.sendMessage(remoteJid, { text: response });
      return;
    }

    // --- MÁQUINA DE ESTADOS ---
    if (state === "main") {
      switch (text) {
        case "1": case "solucoes":
          await updateClientStep(remoteJid, "solutions");
          response = getPlans();
          break;
        case "2": case "especialista":
          await updateClientStep(remoteJid, "specialist");
          response = getSpecialist();
          break;
        case "3": case "suporte":
          await updateClientStep(remoteJid, "support");
          response = getSupport();
          break;
        default:
          response = getUnknownOption();
      }
    } else if (state === "solutions") {
      switch (text) {
        case "1":
          await updateClientStep(remoteJid, "cloudix_ai");
          response = getCloudixAI();
          break;
        case "2":
          await updateClientStep(remoteJid, "automation");
          response = getAutomation();
          break;
        case "3":
          await updateClientStep(remoteJid, "marketing");
          response = getMarketing();
          break;
        case "4":
          await updateClientStep(remoteJid, "service");
          response = getService();
          break;
        case "0":
          await updateClientStep(remoteJid, "main");
          response = getMainMenu();
          break;
        default:
          response = getPlans();
      }
    } else if (["automation", "marketing", "service", "cloudix_ai"].includes(state)) {
      if (text === "2") {
        await updateClientStep(remoteJid, "specialist");
        response = getSpecialist();
      } else if (text === "0") {
        await updateClientStep(remoteJid, "solutions");
        response = getPlans();
      } else {
        response = getUnknownOption();
      }
    } else if (state === "specialist") {
      if (text === "0") {
        await updateClientStep(remoteJid, "main");
        response = getMainMenu();
      } else {
        await updateClientStep(remoteJid, "specialist_company", { nome: messageContent });
        response = `🏢 *PERFEITO!*\n\nAgora, qual é o nome da sua empresa?\n\nDigite o nome da empresa ou *0* para voltar ao menu.`;
      }
    } else if (state === "specialist_company") {
      if (text === "0") {
        await updateClientStep(remoteJid, "main");
        response = getMainMenu();
      } else {
        await updateClientStep(remoteJid, "specialist_need", { empresa: messageContent });
        response = `🎯 *ÓTIMO!*\n\nConte para nós: o que você gostaria de resolver em sua empresa?\n\nDigite *0* para voltar ao menu.`;
      }
    } else if (state === "specialist_need") {
      if (text === "0") {
        await updateClientStep(remoteJid, "main");
        response = getMainMenu();
      } else {
        // Registra o lead diretamente no banco
        await pool.query(
          `INSERT INTO leads (whatsapp, nome, empresa, necessidade, status) VALUES ($1, $2, $3, $4, 'novo')`,
          [remoteJid, client.nome, client.empresa, messageContent]
        );

        await updateClientStep(remoteJid, "human_attending", { status: "human_attending" });

        response = `✅ *SOLICITAÇÃO REGISTRADA!*\n\nObrigado pelas informações, *${client.nome}*! 🚀\n\nUm especialista entrará em contato em breve.\n\nDigite *menu* se quiser reiniciar o atendimento.`;
      }
    } else if (state === "check_inactivity") {
      if (["1", "sim", "finalizar"].includes(text)) {
        await updateClientStep(remoteJid, "main");
        response = "✅ *Atendimento finalizado!* Qualquer dúvida, basta nos chamar novamente. 🚀";
      } else {
        await updateClientStep(remoteJid, "main");
        response = getMainMenu();
      }
    } else {
      response = getUnknownOption();
    }

    await sock.sendMessage(remoteJid, { text: response });
  } catch (error) {
    console.error("❌ Erro ao processar mensagem:", error);
  }
}

module.exports = { handleMessage };
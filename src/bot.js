const userStates = new Map();
const userLeads = new Map();

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
*0️⃣* Voltar ao menu

Digite o número da opção desejada.`;
}

function getCloudixAI() {
  return `🤖 *CLOUDIX AI*

Inteligência artificial desenvolvida para ajudar empresas a automatizar e melhorar seus processos.

A CLOUDIX AI pode atuar em áreas como:

🛒 Vendas
📣 Marketing
💬 Atendimento
💰 Financeiro
📊 Estratégia

Digite:

*1️⃣* Conhecer a solução
*2️⃣* Falar com especialista
*0️⃣* Voltar`;
}

function getAutomation() {
  return `⚙️ *AUTOMAÇÃO CLOUDIX*

Automatize tarefas e processos repetitivos da sua empresa.

Podemos trabalhar com:

🔄 Processos automáticos
📱 Atendimento
📊 Organização de dados
🔔 Notificações
🤖 Inteligência artificial

Digite:

*2️⃣* Falar com especialista
*0️⃣* Voltar`;
}

function getMarketing() {
  return `📣 *MARKETING & CONTEÚDO*

A CLOUDIX pode ajudar sua empresa a melhorar sua presença digital através de:

📱 Conteúdo para redes sociais
📅 Planejamento
🎨 Criativos
📈 Estratégia
🤖 Inteligência artificial

Digite:

*2️⃣* Falar com especialista
*0️⃣* Voltar`;
}

function getService() {
  return `💬 *ATENDIMENTO CLOUDIX*

Transforme o atendimento da sua empresa com tecnologia.

Podemos ajudar com:

🤖 Atendimento automatizado
📱 WhatsApp
💬 Respostas inteligentes
📋 Organização de clientes
🧠 Inteligência artificial

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

Vamos ajudar você.

Envie:

👤 *Seu nome:*

🏢 *Empresa:*

🔧 *Serviço que está utilizando:*

❌ *Descreva o problema:*

Nossa equipe analisará sua solicitação.

Digite *0* para voltar ao menu.`;
}

function getThanks() {
  return `😊 Por nada!

Se precisar de alguma coisa, estou por aqui.

Digite *menu* para abrir novamente o menu principal.`;
}

function getUnknownOption() {
  return `🤔 Não consegui identificar essa opção.

Escolha uma das opções disponíveis ou digite *menu* para voltar ao início.`;
}

function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function handleMessage(sock, message) {
  try {
    if (!message.message) return;

    if (message.key.fromMe) return;

    const remoteJid = message.key.remoteJid;

    if (!remoteJid) return;

    const messageContent =
      message.message.conversation ||
      message.message.extendedTextMessage?.text ||
      "";

    if (!messageContent) return;

    const text = normalizeText(messageContent);

    console.log(`📩 Mensagem recebida: ${text}`);

    let state = userStates.get(remoteJid) || "main";

    let response;

    /*
    ==========================================
    COMANDOS GLOBAIS
    ==========================================
    */

    if (
      text === "menu" ||
      text === "inicio" ||
      text === "comecar" ||
      text === "oi" ||
      text === "ola" ||
      text === "bom dia" ||
      text === "boa tarde" ||
      text === "boa noite"
    ) {
      userStates.set(remoteJid, "main");

      response = getMainMenu();

      await sock.sendMessage(remoteJid, {
        text: response
      });

      console.log(`📤 Resposta enviada para ${remoteJid}`);
      return;
    }

    /*
    ==========================================
    MENU PRINCIPAL
    ==========================================
    */

    if (state === "main") {

      switch (text) {

        case "1":
        case "planos":
        case "plano":
        case "solucoes":
        case "solucao":

          userStates.set(remoteJid, "solutions");

          response = getPlans();
          break;

        case "2":
        case "especialista":
        case "vendedor":
        case "vendas":

          userStates.set(remoteJid, "specialist");

          response = getSpecialist();
          break;

        case "3":
        case "suporte":
        case "ajuda":

          userStates.set(remoteJid, "support");

          response = getSupport();
          break;

        default:

          response = getUnknownOption();
      }
    }

    /*
    ==========================================
    MENU DE SOLUÇÕES
    ==========================================
    */

    else if (state === "solutions") {

      switch (text) {

        case "1":
        case "cloudix ai":
        case "ia":
        case "inteligencia artificial":

          userStates.set(remoteJid, "cloudix_ai");

          response = getCloudixAI();
          break;

        case "2":
        case "automacao":

          userStates.set(remoteJid, "automation");

          response = getAutomation();
          break;

        case "3":
        case "marketing":
        case "conteudo":

          userStates.set(remoteJid, "marketing");

          response = getMarketing();
          break;

        case "4":
        case "atendimento":

          userStates.set(remoteJid, "service");

          response = getService();
          break;

        case "0":
        case "voltar":

          userStates.set(remoteJid, "main");

          response = getMainMenu();
          break;

        default:

          response = getPlans();
      }
    }

    /*
    ==========================================
    CLOUDIX AI
    ==========================================
    */

    else if (state === "cloudix_ai") {

      switch (text) {

        case "1":

          response = `🚀 *CLOUDIX AI*

A CLOUDIX pode desenvolver uma solução de inteligência artificial personalizada para sua empresa.

Para entender o que sua empresa precisa, vamos encaminhar você para um especialista.

Digite *2* para falar com um especialista.

Digite *0* para voltar às soluções.`;

          break;

        case "2":

          userStates.set(remoteJid, "specialist");

          response = getSpecialist();

          break;

        case "0":

          userStates.set(remoteJid, "solutions");

          response = getPlans();

          break;

        default:

          response = getCloudixAI();
      }
    }

    /*
    ==========================================
    OUTRAS SOLUÇÕES
    ==========================================
    */

    else if (
      state === "automation" ||
      state === "marketing" ||
      state === "service"
    ) {

      switch (text) {

        case "2":
        case "especialista":

          userStates.set(remoteJid, "specialist");

          response = getSpecialist();

          break;

        case "0":
        case "voltar":

          userStates.set(remoteJid, "solutions");

          response = getPlans();

          break;

        default:

          if (state === "automation") {
            response = getAutomation();
          } else if (state === "marketing") {
            response = getMarketing();
          } else {
            response = getService();
          }
      }
    }

    /*
    ==========================================
    ESPECIALISTA
    ==========================================
    */

    else if (state === "specialist") {

  if (text === "0" || text === "voltar") {

    userStates.set(remoteJid, "main");
    userLeads.delete(remoteJid);

    response = getMainMenu();

  } else {

    userLeads.set(remoteJid, {
      name: message.message.conversation ||
        message.message.extendedTextMessage?.text ||
        ""
    });

    userStates.set(remoteJid, "specialist_company");

    response = `🏢 *PERFEITO!*

Agora, qual é o nome da sua empresa?

Digite o nome da empresa ou *0* para voltar ao menu.`;
  }
}

else if (state === "specialist_company") {

  if (text === "0" || text === "voltar") {

    userStates.set(remoteJid, "main");
    userLeads.delete(remoteJid);

    response = getMainMenu();

  } else {

    const lead = userLeads.get(remoteJid);

    lead.company =
      message.message.conversation ||
      message.message.extendedTextMessage?.text ||
      "";

    userLeads.set(remoteJid, lead);

    userStates.set(remoteJid, "specialist_need");

    response = `🎯 *ÓTIMO!*

Agora conte para nós:

*O que você está procurando ou qual problema sua empresa gostaria de resolver?*

Pode explicar com suas próprias palavras.

Digite *0* para voltar ao menu.`;
  }
}

else if (state === "specialist_need") {

  if (text === "0" || text === "voltar") {

    userStates.set(remoteJid, "main");
    userLeads.delete(remoteJid);

    response = getMainMenu();

  } else {

    const lead = userLeads.get(remoteJid);

    lead.need =
      message.message.conversation ||
      message.message.extendedTextMessage?.text ||
      "";

    userLeads.set(remoteJid, lead);

    userStates.set(remoteJid, "specialist_confirmation");

    response = `📋 *CONFIRA SEUS DADOS*

👤 *Nome:* ${lead.name}

🏢 *Empresa:* ${lead.company}

🎯 *Interesse:* ${lead.need}

Está tudo correto?

*1️⃣* Confirmar
*2️⃣* Corrigir
*0️⃣* Voltar ao menu`;
  }
}

else if (state === "specialist_confirmation") {

  if (text === "1" || text === "confirmar") {

    const lead = userLeads.get(remoteJid);

    console.log("📋 NOVO LEAD:");
    console.log(`👤 Nome: ${lead.name}`);
    console.log(`🏢 Empresa: ${lead.company}`);
    console.log(`🎯 Interesse: ${lead.need}`);

    response = `✅ *LEAD REGISTRADO!*

Obrigado pelas informações, ${lead.name}! 🚀

Recebemos sua solicitação.

Um especialista da *CLOUDIX* poderá entrar em contato para entender melhor sua necessidade.

Até breve! 🤝

Digite *menu* se quiser iniciar um novo atendimento.`;

    userStates.delete(remoteJid);
    userLeads.delete(remoteJid);

  } else if (text === "2" || text === "corrigir") {

    userStates.set(remoteJid, "specialist");

    userLeads.delete(remoteJid);

    response = `🔄 *VAMOS CORRIGIR*

Sem problemas!

👤 Qual é o seu nome?`;

  } else if (text === "0" || text === "voltar") {

    userStates.set(remoteJid, "main");
    userLeads.delete(remoteJid);

    response = getMainMenu();

  } else {

    response = `🤔 Escolha uma opção:

*1️⃣* Confirmar
*2️⃣* Corrigir
*0️⃣* Voltar ao menu`;
  }
}

    /*
    ==========================================
    SUPORTE
    ==========================================
    */

    else if (state === "support") {

      if (text === "0" || text === "voltar") {

        userStates.set(remoteJid, "main");

        response = getMainMenu();

      } else {

        response = `🛠️ *SOLICITAÇÃO RECEBIDA*

Obrigado pelas informações.

Nossa equipe de suporte poderá analisar seu caso.

Digite *0* para voltar ao menu.`;
      }
    }

    /*
    ==========================================
    AGRADECIMENTOS
    ==========================================
    */

    else if (
      text === "obrigado" ||
      text === "obrigada" ||
      text === "valeu" ||
      text === "vlw"
    ) {

      response = getThanks();
    }

    else {

      response = getUnknownOption();
    }

    await sock.sendMessage(remoteJid, {
      text: response
    });

    console.log(`📤 Resposta enviada para ${remoteJid}`);

  } catch (error) {

    console.error("❌ Erro ao processar mensagem:", error);

  }
}

module.exports = {
  handleMessage
};
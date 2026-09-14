function getMainMenu() {
  return `👋 Olá! Seja bem-vindo à *CLOUDIX*.

Somos uma empresa de tecnologia, automação e inteligência artificial.

Como podemos ajudar você hoje?

*1️⃣* Conhecer nossos planos
*2️⃣* Falar com um especialista
*3️⃣* Suporte

Digite apenas o número da opção desejada.`;
}

function getPlans() {
  return `💼 *PLANOS CLOUDIX*

A CLOUDIX oferece soluções de tecnologia, automação e inteligência artificial para empresas.

Nossas soluções podem ajudar sua empresa com:

🤖 Inteligência Artificial
⚙️ Automação de processos
📱 Atendimento
📊 Estratégia
📈 Vendas e marketing

Para conhecer valores e condições, fale com um especialista.

Digite:

*2* → Falar com especialista
*0* → Voltar ao menu`;
}

function getSpecialist() {
  return `👨‍💻 *ESPECIALISTA CLOUDIX*

Perfeito! 🚀

Vamos encaminhar seu atendimento para um especialista da CLOUDIX.

Enquanto isso, envie:

• Seu nome
• Nome da empresa
• O que você está procurando

Nossa equipe poderá entender melhor sua necessidade.

Digite *0* para voltar ao menu.`;
}

function getSupport() {
  return `🛠️ *SUPORTE CLOUDIX*

Vamos ajudar você.

Descreva o problema que está enfrentando e, se possível, informe:

• O que aconteceu
• Quando começou
• Qual serviço está utilizando

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

Escolha uma das opções:

*1️⃣* Planos
*2️⃣* Falar com especialista
*3️⃣* Suporte

Digite *0* para voltar ao menu.`;
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

    let response;

    switch (text) {

      // MENU

      case "oi":
      case "ola":
      case "bom dia":
      case "boa tarde":
      case "boa noite":
      case "menu":
      case "inicio":
      case "comecar":
        response = getMainMenu();
        break;

      // PLANOS

      case "1":
      case "planos":
      case "plano":
        response = getPlans();
        break;

      // ESPECIALISTA

      case "2":
      case "especialista":
      case "vendedor":
      case "vendas":
        response = getSpecialist();
        break;

      // SUPORTE

      case "3":
      case "suporte":
      case "ajuda":
        response = getSupport();
        break;

      // VOLTAR

      case "0":
      case "voltar":
      case "voltar menu":
        response = getMainMenu();
        break;

      // AGRADECIMENTO

      case "obrigado":
      case "obrigada":
      case "valeu":
      case "vlw":
        response = getThanks();
        break;

      default:
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
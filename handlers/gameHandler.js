const { getGameSession, endGameSession } = require('../utils/gameUtils');
const cartaMayor = require('../games/cartaMayor');
const { getSocket } = require('../bot');

// Utilidad para quitar tildes correctamente
function quitarTildes(str) {
    return str.normalize('NFD').replace(/[ 0-\u007F]/g, c => c).replace(/[\u0300-\u036f]/g, '');
}

async function handleGameResponse(msg) {
    const sock = getSocket();
    // Usar siempre el participant como identificador de sesión
    const jid = msg.key.participant || msg.participant || msg.key.remoteJid;
    const chatId = msg.key.remoteJid;

    const session = await getGameSession(jid);
    if (!session) {
        console.log('[GameHandler] No hay sesión activa para', jid);
        return;
    }

    // Extraer el texto del mensaje de forma robusta
    let messageText = '';
    if (msg.message?.conversation) messageText = msg.message.conversation;
    else if (msg.message?.extendedTextMessage?.text) messageText = msg.message.extendedTextMessage.text;
    else if (msg.message?.imageMessage?.caption) messageText = msg.message.imageMessage.caption;
    else if (msg.message?.videoMessage?.caption) messageText = msg.message.videoMessage.caption;
    messageText = (messageText || '').trim().toLowerCase();
    messageText = quitarTildes(messageText);
    console.log('[GameHandler] Texto recibido para juego:', messageText);

    const validChoices = ['izquierda', 'derecha', 'empate'];
    let choice = validChoices.find(opt => messageText.includes(opt));

    // Si el mensaje es reply a la invitación del bot, también aceptar
    // (Opcional: podrías verificar contextInfo.stanzaId o similar)

    if (choice) {
        console.log('[GameHandler] Opción reconocida:', choice);
        if (session.gameType === 'cartaMayor') {
            await cartaMayor.handleInteractiveChoice(sock, chatId, jid, session.data.user, session.data.betAmount, choice);
        }
        return true;
    }

    console.log('[GameHandler] No se reconoció una opción válida.');
    return false;
}

module.exports = { handleGameResponse };

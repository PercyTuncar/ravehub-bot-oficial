const { getGameSession, endGameSession } = require('../utils/gameUtils');
const cartaMayor = require('../games/cartaMayor');
const { getSocket } = require('../bot');

async function handleGameResponse(msg) {
    const sock = getSocket();
    const jid = msg.key.participant || msg.key.remoteJid;
    const chatId = msg.key.remoteJid;

    const session = await getGameSession(jid);
    if (!session) return;

    // Extraer el texto del mensaje de forma robusta
    const messageText = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim().toLowerCase();

    if (!messageText) return; // Ignorar si no hay texto

    const validChoices = ['izquierda', 'derecha', 'empate'];

    if (validChoices.includes(messageText)) {
        // Detener el temporizador de expiración ya que el usuario ha respondido
        endGameSession(jid); // Esto ahora solo limpia la sesión y el temporizador

        if (session.gameType === 'cartaMayor') {
            // Pasar los datos de la sesión al manejador del juego
            await cartaMayor.handleInteractiveChoice(sock, chatId, jid, session.data.user, session.data.betAmount, messageText);
        }
        // Aquí se podrían añadir más `else if` para otros juegos
        return true; // ¡IMPORTANTE! Informar que el mensaje fue manejado.
    }

    // Si el mensaje no es una opción válida, no fue manejado por el juego.
    return false;
}

module.exports = { handleGameResponse };

const { getSocket } = require('../bot');
const { getGameSession, endGameSession } = require('../utils/gameUtils');
const cartaMayor = require('../games/cartaMayor'); // Import the whole module

async function handleGameMessage(message) {
    const sock = getSocket();
    const jid = message.key.participant || message.key.remoteJid;
    const session = await getGameSession(jid); // Ahora es asíncrono

    if (!session) {
        return false;
    }

    // The user's choice is the whole message body, converted to lower case.
    const choice = (message.message.conversation || '').toLowerCase().trim();

    if (session.game === 'cartaMayor') {
        // Check for valid choices for the game
        if (['izquierda', 'derecha', 'empate'].includes(choice)) {
            // 1. Finalizar la sesión para detener el temporizador de reembolso
            await endGameSession(jid);

            // 2. Proceder con la lógica del juego, pasando los datos de la sesión
            // Ahora, la lógica del juego descontará el dinero.
            await cartaMayor.handleInteractiveChoice(
                sock,
                message.key.remoteJid,
                jid,
                session.user, // Usamos el estado del usuario guardado en la sesión
                session.betAmount,
                choice
            );
            return true;
        }
    }

    return false;
}

module.exports = { handleGameMessage };

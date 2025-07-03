const { getSocket } = require('../bot');
const { getGameSession } = require('../utils/gameUtils');
const cartaMayor = require('../games/cartaMayor'); // Import the whole module

async function handleGameMessage(message) { // client is not used, so it can be removed
    const sock = getSocket();
    const jid = message.key.participant || message.key.remoteJid;
    const session = getGameSession(jid);

    if (!session) {
        return false;
    }

    // The user's choice is the whole message body, converted to lower case.
    const choice = (message.message.conversation || '').toLowerCase().trim();

    if (session.game === 'cartaMayor') {
        // Check for valid choices for the game
        if (['izquierda', 'derecha', 'empate'].includes(choice)) {
            // Call the correct function from the cartaMayor module
            await cartaMayor.handleInteractiveChoice(sock, message.key.remoteJid, jid, session.user, session.betAmount, choice);
            return true;
        }
    }

    return false;
}

module.exports = { handleGameMessage };

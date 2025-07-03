const { getSocket } = require('../bot');
const { getGameSession } = require('../utils/gameUtils');
const { handlePlayerChoice: handleCartaMayorChoice } = require('../games/cartaMayor');

async function handleGameMessage(client, message) {
    const sock = getSocket();
    const senderId = message.author;
    const session = getGameSession(senderId);

    if (!session) {
        return false;
    }

    const messageText = (message.body || '').toLowerCase().trim().split(/\s+/)[1];

    if (session.game === 'cartaMayor') {
        if (messageText === 'yo' || messageText === 'bot') {
            await handleCartaMayorChoice(client, message, messageText);
            return true;
        }
    }

    return false;
}

module.exports = { handleGameMessage };

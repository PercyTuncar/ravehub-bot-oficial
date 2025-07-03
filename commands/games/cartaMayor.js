const { findOrCreateUser } = require('../../utils/userUtils');
const { startGameSession, getGameSession, endGameSession } = require('../../utils/gameUtils');
const { getCurrency } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');
const cartaMayor = require('../../games/cartaMayor');
const { MIN_BET, MAX_BET } = require('../../games/cartaMayor/constants');

module.exports = {
    name: 'carta-mayor',
    description: 'Jugar a la carta mayor.',
    aliases: ['apostar', 'bet'],
    usage: '.apostar <cantidad> [lado]',
    category: 'game',
    async execute(message, args) {
        const sock = getSocket();
        const jid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

        if (getGameSession(jid)) {
            return sock.sendMessage(chatId, {
                text: `🚫 @${jid.split('@')[0]}, ya tienes una partida en curso. Termínala antes de iniciar otra.`,
                mentions: [jid]
            });
        }

        const betAmountStr = args[0];
        if (!betAmountStr || isNaN(betAmountStr)) {
            return sock.sendMessage(chatId, { text: `❌ Debes especificar una cantidad numérica para apostar. Ejemplo: *.apostar 250*` });
        }

        const betAmount = parseInt(betAmountStr, 10);

        if (betAmount < MIN_BET) {
            return sock.sendMessage(chatId, { 
                text: `📉 @${jid.split('@')[0]}, la apuesta mínima es de *${await getCurrency(chatId)} ${MIN_BET}*.`,
                mentions: [jid]
            });
        }

        if (betAmount > MAX_BET) {
            return sock.sendMessage(chatId, { 
                text: `📈 @${jid.split('@')[0]}, la apuesta máxima es de *${await getCurrency(chatId)} ${MAX_BET}*.`,
                mentions: [jid]
            });
        }

        try {
            const user = await findOrCreateUser(jid, chatId, message.pushName);

            if (user.economy.wallet < betAmount) {
                return sock.sendMessage(chatId, { text: `💸 No tienes suficiente dinero para apostar.` });
            }

            // ¡YA NO SE DESCUENTA EL DINERO AQUÍ!
            // Se pasa el objeto 'user' completo para que la sesión tenga todos los datos necesarios.
            await startGameSession(jid, chatId, 'cartaMayor', { betAmount, user: user.toObject() });

            // El resto de la lógica (enviar mensaje interactivo) se mueve a la lógica del juego
            // para mantener el comando limpio.
            await cartaMayor.startInteractiveGame(sock, chatId, jid, user, betAmount);

        } catch (error) {
            console.error('Error al ejecutar el comando apostar:', error);
            endGameSession(jid); // Limpiar sesión en caso de error
            return sock.sendMessage(chatId, { text: 'Error al iniciar el juego.' });
        }
    }
};

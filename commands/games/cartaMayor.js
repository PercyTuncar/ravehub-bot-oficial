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
                return sock.sendMessage(chatId, { text: `💸 No tienes suficiente dinero para apostar *${currency} ${betAmount}*.` });
            }

            // Restar el dinero de la cartera ANTES de empezar el juego
            user.economy.wallet -= betAmount;
            await user.save();

            startGameSession(jid, 'cartaMayor', { betAmount, user });

            const side = args[1] ? args[1].toLowerCase() : null;

            if (side && ['izquierda', 'derecha', 'empate'].includes(side)) {
                // Flujo de juego con lado especificado
                await cartaMayor.play(sock, chatId, jid, user, betAmount, side);
            } else {
                // Flujo de juego interactivo
                await cartaMayor.startInteractiveGame(sock, chatId, jid, user, betAmount);
            }

        } catch (error) {
            console.error('Error al ejecutar el comando apostar:', error);
            // Reembolsar en caso de error
            const user = await findOrCreateUser(jid, chatId, message.pushName);
            user.economy.wallet += betAmount;
            await user.save();
            endGameSession(jid);
            return sock.sendMessage(chatId, { text: 'Error al iniciar el juego. Se te ha devuelto el dinero.' });
        }
    }
};

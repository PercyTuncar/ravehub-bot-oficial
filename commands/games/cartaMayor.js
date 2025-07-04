const { findOrCreateUser } = require('../../utils/userUtils');
const { startGameSession, getGameSession, endGameSession } = require('../../utils/gameUtils');
const { getCurrency } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');
const cartaMayor = require('../../games/cartaMayor');
const { MIN_BET, MAX_BET } = require('../../games/cartaMayor/constants');

module.exports = {
    name: 'apostar',
    description: 'Jugar a la carta mayor.',
    aliases: ['bet', 'carta-mayor'],
    usage: '.apostar <cantidad> [lado]',
    category: 'game',
    async execute(message, args) {
        const sock = getSocket();
        const jid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        if (await getGameSession(jid)) {
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
        const currency = await getCurrency(chatId);

        if (betAmount < MIN_BET) {
            return sock.sendMessage(chatId, { 
                text: `📉 @${jid.split('@')[0]}, la apuesta mínima es de *${currency} ${MIN_BET}*.`,
                mentions: [jid]
            });
        }

        if (betAmount > MAX_BET) {
            return sock.sendMessage(chatId, { 
                text: `📈 @${jid.split('@')[0]}, la apuesta máxima es de *${currency} ${MAX_BET}*.`,
                mentions: [jid]
            });
        }

        try {
            const user = await findOrCreateUser(jid, chatId, message.pushName);

            if (user.economy.wallet < betAmount) {
                return sock.sendMessage(chatId, { 
                    text: `💸 @${jid.split('@')[0]}, no tienes suficiente dinero para apostar *${currency} ${betAmount}*.`,
                    mentions: [jid]
                });
            }

            const sideArg = args[1] ? args[1].toLowerCase() : null;
            const validSides = ['izquierda', 'derecha', 'empate'];

            if (sideArg && validSides.includes(sideArg)) {
                // --- MODO DE JUEGO DIRECTO ---
                // El juego es instantáneo, no se necesita una sesión.
                user.economy.wallet -= betAmount; // Descontar la apuesta inmediatamente.
                await user.save(); // Guardar el cambio antes de jugar
                await cartaMayor.play(sock, chatId, jid, user, betAmount, sideArg);

            } else {
                // --- MODO DE JUEGO INTERACTIVO ---

                // 1. RETIRAR LA APUESTA INMEDIATAMENTE
                user.economy.wallet -= betAmount;

                // 2. GUARDAR EL CAMBIO EN LA BASE DE DATOS
                await user.save();

                // 3. INICIAR LA SESIÓN DE JUEGO
                await startGameSession(jid, chatId, 'cartaMayor', { betAmount });

                // 4. ENVIAR EL MENSAJE DE INICIO AL JUGADOR
                await cartaMayor.startInteractiveGame(sock, chatId, jid, user, betAmount);
            }

        } catch (error) {
            console.error('Error en el comando apostar:', error);
            // Si se produce un error, nos aseguramos de limpiar cualquier sesión que pueda haber quedado abierta.
            if (await getGameSession(jid)) {
                endGameSession(jid);
            }
            return sock.sendMessage(chatId, { text: '⚙️ Ocurrió un error al iniciar el juego.' });
        }
    }
};

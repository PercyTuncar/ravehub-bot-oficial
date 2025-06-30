const { findOrCreateUser } = require('../../utils/userUtils');
const { startGameSession, getGameSession, endGameSession } = require('../../utils/gameUtils');
const { getCurrency } = require('../../utils/groupUtils');

const MIN_BET = 50;
const MAX_BET = 5000;

module.exports = {
    name: 'apostar',
    description: 'Jugar a la carta mayor.',
    aliases: ['bet'],
    usage: '.apostar <cantidad>',
    category: 'game', // Cambiado de 'economy' a 'game'
    async execute(sock, message, args) {
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
            return sock.sendMessage(chatId, { text: `📉 La apuesta mínima es de *${currency}${MIN_BET}*.` });
        }

        if (betAmount > MAX_BET) {
            return sock.sendMessage(chatId, { text: `📈 La apuesta máxima es de *${currency}${MAX_BET}*.` });
        }

        try {
            const user = await findOrCreateUser(jid, message.pushName);

            if (user.economy.wallet < betAmount) {
                return sock.sendMessage(chatId, { text: `💸 No tienes suficiente dinero en tu cartera para apostar *${currency}${betAmount}*.` });
            }

            // Retirar la apuesta de la cartera
            user.economy.wallet -= betAmount;
            await user.save();

            // Iniciar la sesión de juego
            startGameSession(jid, betAmount);

            await sock.sendMessage(chatId, {
                image: { url: 'https://res.cloudinary.com/amadodedios/image/upload/v1751218082/actualizado_casino_ravehub-min_rrojpr.jpg' },
                caption: `*¡Bienvenido al Casino RaveHub, @${jid.split('@')[0]}!* 🎰\n\nTu apuesta de *${currency}${betAmount}* ha sido aceptada.\n\n*Elige tu jugada:*\n> • *Izquierda* o *Derecha*: Gana x2 si tu carta es mayor.\n> • *Empate*: Gana x5 si las cartas son iguales.\n\nResponde con tu elección. ¡Tienes 30 segundos!`,
                mentions: [jid]
            });

            // Configurar el temporizador de inactividad
            const session = getGameSession(jid);
            if (session) {
                session.timer = setTimeout(async () => {
                    if (getGameSession(jid)) { // Verificar si la sesión todavía existe
                        await sock.sendMessage(chatId, {
                            text: `⌛ @${jid.split('@')[0]}, se ha agotado el tiempo para tu jugada.\n\nTu apuesta de *${currency}${betAmount}* ha sido cancelada y devuelta a tu cartera.`,
                            mentions: [jid]
                        });
                        // Devolver la apuesta
                        user.economy.wallet += betAmount;
                        await user.save();
                        endGameSession(jid);
                    }
                }, 30000); // 30 segundos
            }

        } catch (error) {
            console.error('Error en el comando apostar:', error);
            await sock.sendMessage(chatId, { text: '⚙️ Ocurrió un error al iniciar el juego.' });
            endGameSession(jid); // Asegurarse de limpiar la sesión si hay un error
        }
    }
};

const { findOrCreateUser } = require('../../utils/userUtils');
const { startGameSession, getGameSession, endGameSession } = require('../../utils/gameUtils');
const { getCurrency } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');

const MIN_BET = 50;
const MAX_BET = 5000;

module.exports = {
    name: 'apostar',
    description: 'Jugar a la carta mayor.',
    aliases: ['bet'],
    usage: '.apostar <cantidad>',
    category: 'game', // Cambiado de 'economy' a 'game'
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
            const currency = await getCurrency(chatId);

            if (user.economy.wallet < betAmount) {
                return sock.sendMessage(chatId, { text: `💸 No tienes suficiente dinero para apostar *${currency} ${betAmount}*.` });
            }

            // Retirar la apuesta de la cartera
            user.economy.wallet -= betAmount;
            await user.save();

            // Iniciar la sesión de juego
            startGameSession(jid, betAmount);

            await sock.sendMessage(chatId, {
                image: { url: 'https://res.cloudinary.com/amadodedios/image/upload/v1751218082/actualizado_casino_ravehub-min_rrojpr.jpg' },
                caption: `*🃏 ¡Bienvenido al Casino RaveHub! 🃏*

¡Mucha suerte, @${jid.split('@')[0]}! 🎰

Se ha aceptado tu apuesta de *_${currency} ${betAmount}_*.


*      ELIGE TU JUGADA,       *
*└─── ･ ｡ﾟ☆: *.☽ .* :☆ﾟ. ───┘*

> *Izquierda* o *Derecha* ♠️♥️
> _Gana x2 si tu carta es mayor._

> *Empate* ♦️♣️
> _Gana x5 si las cartas son iguales._

*Responde con tu elección. ¡Tienes 30 segundos!* ⏳`,
                mentions: [jid]
            });

            // Configurar el temporizador de inactividad
            const session = getGameSession(jid);
            if (session) {
                session.timer = setTimeout(async () => {
                    if (getGameSession(jid)) { // Verificar si la sesión todavía existe
                        await sock.sendMessage(chatId, {
                            text: `⌛ @${jid.split('@')[0]}, se agotó el tiempo para tu jugada.

Tu apuesta de *${currency} ${betAmount}* ha sido devuelta a tu cartera.`,
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

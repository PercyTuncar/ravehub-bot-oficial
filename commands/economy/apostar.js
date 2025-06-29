const { findOrCreateUser } = require('../../utils/userUtils');
const { startGameSession, getGameSession, endGameSession } = require('../../utils/gameUtils');

const MIN_BET = 50;
const MAX_BET = 5000;

module.exports = {
    name: 'apostar',
    description: 'Inicia un juego de Carta Mayor. Apuesta a Izquierda, Derecha o Empate. Si tu carta es más alta, ganas x2. Si aciertas al empate, ganas x5.',
    usage: '.apostar <cantidad>',
    category: 'games',
    async execute(sock, message, args) {
        const jid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

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
            return sock.sendMessage(chatId, { text: `📉 La apuesta mínima es de *${MIN_BET} 💵*.` });
        }

        if (betAmount > MAX_BET) {
            return sock.sendMessage(chatId, { text: `📈 La apuesta máxima es de *${MAX_BET} 💵*.` });
        }

        try {
            const user = await findOrCreateUser(jid, message.pushName);

            if (user.economy.wallet < betAmount) {
                return sock.sendMessage(chatId, { text: `💸 No tienes suficiente dinero en tu cartera para apostar *${betAmount} 💵*.` });
            }

            // Retirar la apuesta de la cartera
            user.economy.wallet -= betAmount;
            await user.save();

            // Iniciar la sesión de juego
            startGameSession(jid, betAmount);

            await sock.sendMessage(chatId, {
                text: `💰 @${jid.split('@')[0]}, ¡bienvenido al Casino RaveHub! 💰\n\nTu apuesta de *${betAmount} 💵* ha sido aceptada.\n\nElige tu jugada:\nResponde con *Izquierda*, *Derecha* o *Empate*.\n\n- *Izquierda/Derecha*: Ganas el doble (x2) si tu carta es mayor.\n- *Empate*: ¡Ganas 5 veces (x5) tu apuesta si las cartas son iguales!\n\n(Tienes 30 segundos para decidir)`,
                mentions: [jid]
            });

            // Configurar el temporizador de inactividad
            const session = getGameSession(jid);
            if (session) {
                session.timer = setTimeout(async () => {
                    if (getGameSession(jid)) { // Verificar si la sesión todavía existe
                        await sock.sendMessage(chatId, {
                            text: `⌛ @${jid.split('@')[0]}, se ha agotado el tiempo para tu jugada.\n\nTu apuesta de *${betAmount} 💵* ha sido cancelada y devuelta a tu cartera.`,
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

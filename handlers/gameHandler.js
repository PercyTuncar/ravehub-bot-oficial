const { getGameSession, getRandomCard, endGameSession } = require('../utils/gameUtils');
const { findOrCreateUser } = require('../utils/userUtils');

// Helper para pausar la ejecución
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function handleGameMessage(sock, message) {
    const jid = message.key.participant || message.key.remoteJid;
    const chatId = message.key.remoteJid;
    const session = getGameSession(jid);

    // Si no hay sesión de juego para este usuario, no hacer nada.
    if (!session) {
        return false;
    }

    const messageText = (message.message?.conversation || message.message?.extendedTextMessage?.text || '').toLowerCase().trim();

    // --- Etapa 1: El usuario elige un lado ---
    if (session.stage === 'CHOOSING_SIDE') {
        if (messageText !== 'izquierda' && messageText !== 'derecha' && messageText !== 'empate') {
            await sock.sendMessage(chatId, {
                text: `🚫 @${jid.split('@')[0]}, tu respuesta no es válida.\n\nPor favor, elige *Izquierda*, *Derecha* o *Empate* para continuar tu partida.`,
                mentions: [jid]
            });
            return true; // Mensaje manejado, detener procesamiento de comandos
        }

        // Cancelar el temporizador de inactividad
        if (session.timer) {
            clearTimeout(session.timer);
            session.timer = null; // Limpiar el temporizador de la sesión
        }

        const choice = messageText.charAt(0).toUpperCase() + messageText.slice(1);
        await sock.sendMessage(chatId, {
            text: `🃏 @${jid.split('@')[0]}, has elegido *${choice}*. ¡Una elección audaz!\n\nEl crupier coloca las cartas sobre la mesa. El suspenso es total...\n\n🎴 [Izquierda] vs. 🎴 [Derecha]\n\nRevelando las cartas en 3... 2... 1...`,
            mentions: [jid]
        });

        await delay(3000); // Pausa para el suspenso

        // --- Etapa 2: Revelación de cartas y resultado ---
        session.stage = 'REVEALING';
        const leftCard = getRandomCard();
        const rightCard = getRandomCard();

        const leftCardName = `${leftCard.rank} de ${leftCard.suit}`;
        const rightCardName = `${rightCard.rank} de ${rightCard.suit}`;

        // Determinar la carta del jugador y de la casa según la elección
        const playerChoiceIsLeft = messageText === 'izquierda';
        const playerCard = playerChoiceIsLeft ? leftCard : rightCard;
        const houseCard = playerChoiceIsLeft ? rightCard : leftCard;

        // Mensaje 1: Revela ambas cartas
        await sock.sendMessage(chatId, {
            text: `✨ ¡Cartas a la vista! ✨\n\n🎴 Izquierda: *${leftCardName}*\n🎴 Derecha: *${rightCardName}*\n\nAnalizando el resultado...`,
            mentions: [jid]
        });

        await delay(3000); // Más suspenso

        // Mensaje 2: Anunciar el resultado
        const user = await findOrCreateUser(jid);
        let resultMessage = '';
        let finalMessage = '';

        // CASO 1: EMPATE
        if (leftCard.value === rightCard.value) {
            if (messageText === 'empate') {
                const winnings = session.bet * 5;
                user.economy.wallet += winnings;
                resultMessage = `🤯 *¡EMPATE EXACTO!* 🤯\n\n@${jid.split('@')[0]}, ¡has acertado al empate! Una jugada maestra.`;
                finalMessage = `✅ ¡Premio mayor! Se han añadido *${winnings} 💵* a tu cartera.\n\nGracias por jugar en el Casino RaveHub.`;
            } else {
                user.economy.wallet += session.bet; // Devolver la apuesta
                resultMessage = `😐 *¡ES UN EMPATE!* 😐\n\n@${jid.split('@')[0]}, las cartas son idénticas. Ni ganas, ni pierdes.`;
                finalMessage = `✅ Se ha devuelto tu apuesta de *${session.bet} 💵* a tu cartera.\n\nGracias por jugar en el Casino RaveHub.`;
            }
        }
        // CASO 2: NO HAY EMPATE
        else {
            const userWon = playerCard.value > houseCard.value;
            if (messageText === 'empate') {
                // Apostó a empate pero no ocurrió
                resultMessage = `😢 *¡NO HUBO EMPATE!* 😢\n\n@${jid.split('@')[0]}, apostaste todo al empate, pero una carta fue superior.`;
                finalMessage = `❌ Has perdido tu apuesta de *${session.bet} 💵*.\n\nGracias por jugar en el Casino RaveHub.`;
            } else if (userWon) {
                // Ganó la apuesta a Izquierda/Derecha
                const winnings = session.bet * 2;
                user.economy.wallet += winnings;
                resultMessage = `🎉 *¡GANASTE!* 🎉\n\n@${jid.split('@')[0]}, tu carta fue la más alta. ¡Felicidades!`;
                finalMessage = `✅ Se han añadido *${winnings} 💵* a tu cartera.\n\nGracias por jugar en el Casino RaveHub.`;
            } else {
                // Perdió la apuesta a Izquierda/Derecha
                resultMessage = `😢 *¡PERDISTE!* 😢\n\n@${jid.split('@')[0]}, la carta de la casa fue superior. Más suerte para la próxima.`;
                finalMessage = `❌ Has perdido tu apuesta de *${session.bet} 💵*.\n\nGracias por jugar en el Casino RaveHub.`;
            }
        }

        // Enviar mensajes de resultado
        await sock.sendMessage(chatId, { text: resultMessage, mentions: [jid] });
        await delay(2000);
        await sock.sendMessage(chatId, { text: finalMessage, mentions: [jid] });

        await user.save();
        endGameSession(jid); // Finalizar la sesión

        return true; // Mensaje manejado
    }

    // Si el mensaje no corresponde a ninguna etapa, se considera manejado para evitar que se procesen comandos.
    return true;
}

module.exports = { handleGameMessage };

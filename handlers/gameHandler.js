const { getGameSession, getRandomCard, endGameSession } = require('../utils/gameUtils');
const { findOrCreateUser } = require('../utils/userUtils');

// Helper para pausar la ejecución
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function handleGameMessage(sock, message) {
    const jid = message.key.participant || message.key.remoteJid;
    const session = getGameSession(jid);

    // Si no hay sesión de juego para este usuario, no hacer nada.
    if (!session) {
        return false;
    }

    const messageText = message.message?.conversation?.toLowerCase().trim() || '';

    // --- Etapa 1: El usuario elige un lado ---
    if (session.stage === 'CHOOSING_SIDE') {
        if (messageText !== 'izquierda' && messageText !== 'derecha') {
            await sock.sendMessage(jid, {
                text: `🚫 @${jid.split('@')[0]}, tu respuesta no es válida.\n\nPor favor, elige *Izquierda* o *Derecha* para continuar tu partida en el Casino Las Vegas.`,
                mentions: [jid]
            });
            return true; // Mensaje manejado, detener procesamiento de comandos
        }

        // Cancelar el temporizador de inactividad
        if (session.timer) {
            clearTimeout(session.timer);
        }

        const choice = messageText.charAt(0).toUpperCase() + messageText.slice(1);
        await sock.sendMessage(jid, {
            text: `🃏 @${jid.split('@')[0]}, has elegido *${choice}*. ¡Una elección audaz!\n\nEl crupier coloca las cartas sobre la mesa. El suspenso es total...\n\n🎴 [Izquierda] vs. 🎴 [Derecha]\n\nRevelando tu carta en 3... 2... 1...`,
            mentions: [jid]
        });

        await delay(3000); // Pausa para el suspenso

        // --- Etapa 2: Revelación de cartas y resultado ---
        session.stage = 'REVEALING';
        const playerCard = getRandomCard();
        const houseCard = getRandomCard();

        // Asegurarse de que no haya empate para simplificar
        while (playerCard.value === houseCard.value) {
            houseCard = getRandomCard();
        }

        const playerCardName = `${playerCard.rank} de ${playerCard.suit}`;
        const houseCardName = `${houseCard.rank} de ${houseCard.suit}`;

        await sock.sendMessage(jid, {
            text: `✨ @${jid.split('@')[0]}, la carta en el lado *${choice}* es...\n\n¡Un *${playerCardName}*!\n\nUna carta muy fuerte. ¿Será suficiente para vencer a la casa?`,
            mentions: [jid]
        });

        await delay(3000); // Más suspenso

        const userWon = playerCard.value > houseCard.value;
        const user = await findOrCreateUser(jid);
        let resultMessage = `🤖 Y la carta en el lado opuesto era...\n\n¡Un *${houseCardName}*!\n\n`;

        if (userWon) {
            const winnings = session.bet * 2;
            user.economy.wallet += winnings;
            resultMessage += `🎉 *¡GANASTE!* 🎉\n\n@${jid.split('@')[0]}, felicidades. Has ganado el doble de tu apuesta.`;
            await sock.sendMessage(jid, { text: resultMessage, mentions: [jid] });
            await delay(1000);
            await sock.sendMessage(jid, { text: `✅ @${jid.split('@')[0]}, se han añadido *${winnings} 💵* a tu cartera.\n\nGracias por jugar en el Casino Las Vegas. ¡Vuelve pronto!`, mentions: [jid] });
        } else {
            // La apuesta ya fue retirada al iniciar, solo se notifica la pérdida.
            resultMessage += `😢 *¡PERDISTE!* 😢\n\n@${jid.split('@')[0]}, la casa gana esta vez. Más suerte para la próxima.`;
            await sock.sendMessage(jid, { text: resultMessage, mentions: [jid] });
            await delay(1000);
            await sock.sendMessage(jid, { text: `❌ @${jid.split('@')[0]}, has perdido tu apuesta de *${session.bet} 💵*.\n\nGracias por jugar en el Casino Las Vegas.`, mentions: [jid] });
        }

        await user.save();
        endGameSession(jid); // Finalizar la sesión

        return true; // Mensaje manejado
    }

    // Si el mensaje no corresponde a ninguna etapa, se considera manejado para evitar que se procesen comandos.
    return true;
}

module.exports = { handleGameMessage };

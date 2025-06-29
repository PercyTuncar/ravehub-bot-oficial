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

    // Tomar solo la primera palabra del mensaje para evitar errores con respuestas de varias líneas.
    const rawMessage = (message.message?.conversation || message.message?.extendedTextMessage?.text || '');
    const messageText = rawMessage.toLowerCase().trim().split(/\s+/)[0];

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
            text: `🃏 @${jid.split('@')[0]}, has elegido *${choice}*.\n\nEl crupier baraja las cartas y las coloca sobre la mesa. ¡Mucha suerte!`,
            mentions: [jid]
        });

        await delay(3000); // Pausa para el suspenso

        // --- Etapa 2: Revelación de cartas y resultado ---
        session.stage = 'REVEALING';
        const leftCard = getRandomCard();
        const rightCard = getRandomCard();

        const leftCardName = `*${leftCard.rank} de ${leftCard.suit}*`;
        const rightCardName = `*${rightCard.rank} de ${rightCard.suit}*`;

        const user = await findOrCreateUser(jid);
        let resultMessage = '';
        let finalMessage = '';

        // --- Lógica de revelación y resultado ---

        // CASO 1: El usuario apostó a 'empate'
        if (messageText === 'empate') {
            await sock.sendMessage(chatId, { text: `Revelando la primera carta... 🎴` });
            await delay(2000);
            await sock.sendMessage(chatId, { text: `> Carta Izquierda: ${leftCardName}` });
            await delay(2000);
            await sock.sendMessage(chatId, { text: `Ahora, la segunda carta... ¿Será igual? 🤔` });
            await delay(3000);
            await sock.sendMessage(chatId, { text: `> Carta Derecha: ${rightCardName}` });
            await delay(2000);

            if (leftCard.value === rightCard.value) {
                const winnings = session.bet * 5;
                user.economy.wallet += winnings;
                resultMessage = `🤯 *¡EMPATE PERFECTO!* 🤯\n\n¡Felicidades, @${jid.split('@')[0]}! Tu predicción fue correcta.`;
                finalMessage = `💰 ¡Ganaste un premio de $*${winnings} 💵*!`;
            } else {
                resultMessage = `😢 *NO HUBO EMPATE* 😢\n\n@${jid.split('@')[0]}, las cartas no coincidieron.`;
                finalMessage = `❌ Perdiste tu apuesta de $*${session.bet} 💵*.`;
            }
        }
        // CASO 2: El usuario apostó a 'izquierda' o 'derecha'
        else {
            const playerChoice = messageText;
            const playerCard = playerChoice === 'izquierda' ? leftCard : rightCard;
            const houseCard = playerChoice === 'izquierda' ? rightCard : leftCard;
            const playerCardName = playerChoice === 'izquierda' ? leftCardName : rightCardName;
            const houseCardName = playerChoice === 'izquierda' ? rightCardName : leftCardName;

            await sock.sendMessage(chatId, { text: `Tu carta (${playerChoice}) es... 🎴` });
            await delay(2500);
            await sock.sendMessage(chatId, { text: `> Tuya: ${playerCardName}` });
            await delay(2000);
            await sock.sendMessage(chatId, { text: `La carta de la casa es... 🤔` });
            await delay(3000);
            await sock.sendMessage(chatId, { text: `> Casa: ${houseCardName}` });
            await delay(2000);

            if (playerCard.value > houseCard.value) {
                const winnings = session.bet * 2;
                user.economy.wallet += winnings;
                resultMessage = `🎉 *¡GANASTE!* 🎉\n\n¡Tu carta es más alta, @${jid.split('@')[0]}!`;
                finalMessage = `💰 ¡Te llevas $*${winnings} 💵*!`;
            } else if (playerCard.value < houseCard.value) {
                resultMessage = `😢 *¡PERDISTE!* 😢\n\nLa carta de la casa es superior, @${jid.split('@')[0]}.`;
                finalMessage = `❌ Perdiste tu apuesta de *${session.bet} 💵*.`;
            } else { // Empate inesperado
                user.economy.wallet += session.bet; // Devolver apuesta
                resultMessage = `😐 *¡ES UN EMPATE!* 😐\n\nLas cartas son idénticas, @${jid.split('@')[0]}.`;
                finalMessage = `✅ Se te devuelve tu apuesta de $*${session.bet} 💵*.`;
            }
        }

        // Enviar mensajes de resultado final
        await sock.sendMessage(chatId, { text: resultMessage, mentions: [jid] });
        await delay(1500);
        await sock.sendMessage(chatId, { text: `${finalMessage}\n\nGracias por jugar en el Casino RaveHub.`, mentions: [jid] });

        await user.save();
        endGameSession(jid); // Finalizar la sesión

        return true; // Mensaje manejado
    }

    // Si el mensaje no corresponde a ninguna etapa, se considera manejado para evitar que se procesen comandos.
    return true;
}

module.exports = { handleGameMessage };

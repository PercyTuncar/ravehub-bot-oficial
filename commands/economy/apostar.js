const { findOrCreateUser, updateGameStats } = require('../../utils/userUtils');
const { startGameSession, getGameSession, endGameSession } = require('../../utils/gameUtils');
const { getCurrency } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');
const GameLog = require('../../models/GameLog'); // Añadir el modelo de GameLog

const MIN_BET = 50;
const MAX_BET = 5000;

const casinoImages = [
    'https://res.cloudinary.com/amadodedios/image/upload/v1751431245/casino-1_1_xi6eiv.webp',
    'https://res.cloudinary.com/amadodedios/image/upload/v1751431245/casino-_1_ucaqeq.webp',
    'https://res.cloudinary.com/amadodedios/image/upload/v1751431245/casino-2_qk6eyw.webp',
    'https://res.cloudinary.com/amadodedios/image/upload/v1751431246/casino-4_avxtnz.webp',
    'https://res.cloudinary.com/amadodedios/image/upload/v1751431245/casino-3_qcilqk.webp'
];

async function playGame(sock, chatId, jid, user, betAmount, side) {
    const currency = await getCurrency(chatId);
    const randomImage = casinoImages[Math.floor(Math.random() * casinoImages.length)];

    await sock.sendMessage(chatId, {
        image: { url: randomImage },
        caption: `*🃏 ¡Bienvenido al Casino RaveHub! 🃏*

¡Mucha suerte, @${jid.split('@')[0]}! 🎰

*Tu jugada:*
> *Monto:* ${currency} ${betAmount}
> *Lado:* ${side.charAt(0).toUpperCase() + side.slice(1)}

El crupier está barajando las cartas...`,
        mentions: [jid]
    });

    await new Promise(resolve => setTimeout(resolve, 2000)); // Pausa de 2 segundos

    const cardValues = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const cardSuits = ['♠️', '♥️', '♦️', '♣️'];

    const leftCardValue = Math.floor(Math.random() * cardValues.length);
    const rightCardValue = Math.floor(Math.random() * cardValues.length);

    const leftCard = `${cardValues[leftCardValue]} ${cardSuits[Math.floor(Math.random() * cardSuits.length)]}`;
    const rightCard = `${cardValues[rightCardValue]} ${cardSuits[Math.floor(Math.random() * cardSuits.length)]}`;

    await sock.sendMessage(chatId, { text: `Revelando las cartas...` });
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (side === 'izquierda' || side === 'derecha') {
        const userCard = side === 'izquierda' ? leftCard : rightCard;
        const houseCard = side === 'izquierda' ? rightCard : leftCard;
        const userCardName = side.charAt(0).toUpperCase() + side.slice(1);

        await sock.sendMessage(chatId, {
            text: `@${jid.split('@')[0]}, tu carta (${userCardName}) es: *${userCard}*`,
            mentions: [jid]
        });
        await new Promise(resolve => setTimeout(resolve, 2000));

        await sock.sendMessage(chatId, { text: `El crupier voltea la otra carta...` });
        await new Promise(resolve => setTimeout(resolve, 2000));

        await sock.sendMessage(chatId, { text: `La otra carta es: *${houseCard}*` });
        await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
        // Flujo de revelación para la apuesta de empate
        await sock.sendMessage(chatId, { text: `*Carta Izquierda:* ${leftCard}` });
        await new Promise(resolve => setTimeout(resolve, 1500));
        await sock.sendMessage(chatId, { text: `*Carta Derecha:* ${rightCard}` });
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    let resultText = '';
    let win = false;
    let loss = false;
    let multiplier = 0;
    let netWinnings = 0; // Ganancia/pérdida neta

    // Determinar si el jugador ganó basado en su apuesta (side)
    const playerWon = (side === 'izquierda' && leftCardValue > rightCardValue) || 
                      (side === 'derecha' && rightCardValue > leftCardValue);

    if (side === 'empate') {
        if (leftCardValue === rightCardValue) {
            win = true;
            multiplier = 5;
            const totalPayout = betAmount * multiplier;
            netWinnings = totalPayout - betAmount;
            user.economy.wallet += totalPayout;
            resultText = `🎉 ¡Increíble! ¡Es un empate! Ganaste *${currency} ${totalPayout}*.`;
        } else {
            loss = true;
            netWinnings = -betAmount;
            resultText = `❌ ¡No fue un empate! Perdiste *${currency} ${betAmount}*.`;
        }
    } else {
        if (leftCardValue === rightCardValue) {
            // Si hay empate y no se apostó a empate, el jugador pierde.
            loss = true;
            netWinnings = -betAmount;
            resultText = `😐 ¡Fue un empate! Como no apostaste a 'empate', pierdes *${currency} ${betAmount}*.`;
            // No se actualizan las estadísticas de empates del jugador, porque no fue su apuesta.
        } else if (playerWon) {
            win = true;
            multiplier = 2;
            const totalPayout = betAmount * multiplier;
            netWinnings = totalPayout - betAmount;
            user.economy.wallet += totalPayout;
            resultText = `🎉 ¡Felicidades, @${jid.split('@')[0]}! Ganaste *${currency} ${totalPayout}*.`;
        } else {
            loss = true;
            netWinnings = -betAmount;
            resultText = `❌ ¡Mala suerte, @${jid.split('@')[0]}! Perdiste *${currency} ${betAmount}*.`;
        }
    }

    // Registrar el resultado del juego para las estadísticas generales
    let gameResultForLog;
    if (leftCardValue > rightCardValue) {
        gameResultForLog = 'izquierda';
    } else if (leftCardValue < rightCardValue) {
        gameResultForLog = 'derecha';
    } else {
        gameResultForLog = 'empate';
    }

    try {
        const gameLog = new GameLog({
            gameName: 'carta mayor',
            groupId: chatId,
            jid: jid,
            result: gameResultForLog,
            betAmount: betAmount,
            winnings: netWinnings, // Registrar ganancia/pérdida neta
            timestamp: new Date()
        });
        await gameLog.save();
    } catch (error) {
        console.error('Error al guardar el log del juego:', error);
    }

    if (win) {
        await updateGameStats(jid, chatId, 'cartaMayor', { wins: 1, moneyChange: netWinnings });
    } else if (loss) {
        await updateGameStats(jid, chatId, 'cartaMayor', { losses: 1, moneyChange: netWinnings });
    }
    
    await user.save();
    endGameSession(jid);

    await sock.sendMessage(chatId, { text: resultText, mentions: [jid] });
}

module.exports = {
    name: 'apostar',
    description: 'Jugar a la carta mayor.',
    aliases: ['bet'],
    usage: '.apostar <cantidad> [lado]',
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

            if (user.economy.wallet < betAmount) {
                return sock.sendMessage(chatId, { text: `💸 No tienes suficiente dinero para apostar *${currency} ${betAmount}*.` });
            }

            // Iniciar la sesión de juego ANTES de retirar la apuesta
            startGameSession(jid, betAmount);

            const sideArg = args[1] ? args[1].toLowerCase() : null;
            const validSides = ['izquierda', 'derecha', 'empate'];

            if (sideArg && validSides.includes(sideArg)) {
                // Jugar directamente si el lado es válido
                // Retirar la apuesta de la cartera JUSTO ANTES de jugar
                user.economy.wallet -= betAmount;
                await user.save();
                await playGame(sock, chatId, jid, user, betAmount, sideArg);
            } else {
                // Flujo original: preguntar por el lado
                const randomImage = casinoImages[Math.floor(Math.random() * casinoImages.length)];

                await sock.sendMessage(chatId, {
                    image: { url: randomImage },
                    caption: `*🃏 ¡Bienvenido al Casino RaveHub! 🃏*

¡Mucha suerte, @${jid.split('@')[0]}! 🎰

💵 Apuesta aceptada de *_${currency} ${betAmount}_*.

      ELIGE TU JUGADA,       

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
                                text: `⌛ @${jid.split('@')[0]}, se agotó el tiempo para tu jugada. Tu apuesta ha sido cancelada.`,
                                mentions: [jid]
                            });
                            // No es necesario devolver la apuesta porque nunca se retiró
                            endGameSession(jid);
                        }
                    }, 30000); // 30 segundos
                }
            }

        } catch (error) {
            console.error('Error en el comando apostar:', error);
            await sock.sendMessage(chatId, { text: '⚙️ Ocurrió un error al iniciar el juego.' });
            // No es necesario devolver dinero aquí porque la sesión se limpia
            // y el dinero solo se retira al jugar.
            endGameSession(jid); // Asegurarse de limpiar la sesión si hay un error
        }
    }
};

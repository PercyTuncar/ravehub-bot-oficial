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

    const playerCardValue = Math.floor(Math.random() * cardValues.length);
    const houseCardValue = Math.floor(Math.random() * cardValues.length);

    const playerCard = `${cardValues[playerCardValue]} ${cardSuits[Math.floor(Math.random() * cardSuits.length)]}`;
    const houseCard = `${cardValues[houseCardValue]} ${cardSuits[Math.floor(Math.random() * cardSuits.length)]}`;

    await sock.sendMessage(chatId, { text: `Tu carta es... *${playerCard}*` });
    await new Promise(resolve => setTimeout(resolve, 1500));
    await sock.sendMessage(chatId, { text: `El crupier voltea su carta...` });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await sock.sendMessage(chatId, { text: `La carta de la casa es... *${houseCard}*` });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Registrar el resultado del juego para las estadísticas generales
    let gameResultForLog;
    if (playerCardValue > houseCardValue) {
        gameResultForLog = 'izquierda';
    } else if (playerCardValue < houseCardValue) {
        gameResultForLog = 'derecha';
    } else {
        gameResultForLog = 'empate';
    }

    try {
        const gameLog = new GameLog({
            gameName: 'carta mayor',
            groupId: chatId,
            result: gameResultForLog,
            timestamp: new Date()
        });
        await gameLog.save();
    } catch (error) {
        console.error('Error al guardar el log del juego:', error);
    }

    let resultText = '';
    let win = false;
    let loss = false;
    let multiplier = 0;

    if (side === 'empate') {
        if (playerCardValue === houseCardValue) {
            win = true;
            multiplier = 5;
            resultText = `🎉 ¡Increíble! ¡Es un empate! Ganaste *${currency} ${betAmount * multiplier}*.`;
        } else {
            loss = true;
            resultText = `❌ ¡No fue un empate! Perdiste *${currency} ${betAmount}*.`;
        }
    } else {
        const playerWins = playerCardValue > houseCardValue;

        if (playerCardValue === houseCardValue) {
            user.economy.wallet += betAmount; // Devolver apuesta en caso de empate
            await user.save();
            resultText = `😐 ¡Es un empate! Se te devolvió tu apuesta de *${currency} ${betAmount}*.`;
            await updateGameStats(jid, chatId, 'cartaMayor', { ties: 1 });
            endGameSession(jid);
            return sock.sendMessage(chatId, { text: resultText, mentions: [jid] });
        } else if (playerWins) {
            win = true;
            multiplier = 2;
            resultText = `🎉 ¡Felicidades, @${jid.split('@')[0]}! Ganaste *${currency} ${betAmount * multiplier}*.`;
        } else {
            loss = true;
            resultText = `❌ ¡Mala suerte, @${jid.split('@')[0]}! Perdiste *${currency} ${betAmount}*.`;
        }
    }

    if (win) {
        const amountWon = betAmount * multiplier;
        user.economy.wallet += amountWon;
        const profit = amountWon - betAmount;
        await updateGameStats(jid, chatId, 'cartaMayor', { wins: 1, moneyChange: profit });
    } else if (loss) {
        await updateGameStats(jid, chatId, 'cartaMayor', { losses: 1, moneyChange: -betAmount });
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

            // Retirar la apuesta de la cartera
            user.economy.wallet -= betAmount;
            await user.save();

            // Iniciar la sesión de juego
            startGameSession(jid, betAmount);

            const sideArg = args[1] ? args[1].toLowerCase() : null;
            const validSides = ['izquierda', 'derecha', 'empate'];

            if (sideArg && validSides.includes(sideArg)) {
                // Jugar directamente si el lado es válido
                await playGame(sock, chatId, jid, user, betAmount, sideArg);
            } else {
                // Flujo original si no se proporciona un lado válido
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
            }

        } catch (error) {
            console.error('Error en el comando apostar:', error);
            await sock.sendMessage(chatId, { text: '⚙️ Ocurrió un error al iniciar el juego.' });
            // Si hubo un error, devolver el dinero si ya se había restado
            const session = getGameSession(jid);
            if (session) {
                const user = await findOrCreateUser(jid, chatId, message.pushName);
                user.economy.wallet += session.betAmount;
                await user.save();
            }
            endGameSession(jid); // Asegurarse de limpiar la sesión si hay un error
        }
    }
};

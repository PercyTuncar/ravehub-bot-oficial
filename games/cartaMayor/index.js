const { findOrCreateUser, updateGameStats } = require('../../utils/userUtils');
const { stopSessionTimer, endGameSession } = require('../../utils/gameUtils'); // MODIFICADO: Importar stopSessionTimer
const GameLog = require('../../models/GameLog');
const { getRandomCard } = require('./utils');
const { casinoImages } = require('./constants');
const { getCurrency } = require('../../utils/groupUtils');

async function play(sock, chatId, jid, user, betAmount, side) {
    const currency = await getCurrency(chatId);
    const randomImage = casinoImages[Math.floor(Math.random() * casinoImages.length)];

    await sock.sendMessage(chatId, {
        image: { url: randomImage },
        caption: `*🃏 ¡Bienvenido al Casino RaveHub! 🃏*\n\n¡Mucha suerte, @${jid.split('@')[0]}! 🎰\n\n*Tu jugada:*\n> *Monto:* ${currency} ${betAmount}\n> *Lado:* ${side.charAt(0).toUpperCase() + side.slice(1)}\n\nEl crupier está barajando las cartas...`,
        mentions: [jid]
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const leftCard = getRandomCard();
    const rightCard = getRandomCard();

    await sock.sendMessage(chatId, { text: `Revelando las cartas...` });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const userCard = side === 'izquierda' ? leftCard.display : rightCard.display;
    const houseCard = side === 'izquierda' ? rightCard.display : leftCard.display;
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

    const result = determineWinner(user, betAmount, side, leftCard, rightCard);

    await user.save();
    endGameSession(jid);

    await sock.sendMessage(chatId, { text: result.text, mentions: [jid] });
}

async function startInteractiveGame(sock, chatId, jid, user, betAmount) {
    const currency = await getCurrency(chatId);
    const randomImage = casinoImages[Math.floor(Math.random() * casinoImages.length)];

    await sock.sendMessage(chatId, {
        image: { url: randomImage },
        caption: `*🃏 ¡Bienvenido al Casino RaveHub! 🃏*\n\n¡Mucha suerte, @${jid.split('@')[0]}! 🎰\n\n*Tu apuesta:* ${currency} ${betAmount}\n\nElige un lado para tu carta: *izquierda*, *derecha* o *empate*.`,
        mentions: [jid]
    });
}

async function handleInteractiveChoice(sock, chatId, jid, userState, betAmount, side) {
    // ¡CORRECCIÓN CRÍTICA! Detener el temporizador inmediatamente.
    const timerStopped = stopSessionTimer(jid);
    if (!timerStopped) {
        // Si no había temporizador, es posible que la sesión ya haya expirado.
        console.log(`[CartaMayor] No se encontró un temporizador para ${jid}. La sesión pudo haber expirado.`);
        // No se envía mensaje al usuario para no generar spam si ya recibió el de expiración.
        return;
    }

    // Obtener el estado más reciente del usuario para poder AÑADIRLE las ganancias.
    const user = await findOrCreateUser(jid, chatId);

    // La lógica de descuento de la apuesta y la verificación de fondos han sido eliminadas de aquí.
    // La apuesta ya fue descontada en el comando inicial.

    await sock.sendMessage(chatId, {
        text: `Has elegido: *${side.charAt(0).toUpperCase() + side.slice(1)}*\n\nEl crupier está barajando las cartas...`,
        mentions: [jid]
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const leftCard = getRandomCard();
    const rightCard = getRandomCard();

    await sock.sendMessage(chatId, { text: `Revelando las cartas...` });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const userCard = side === 'izquierda' ? leftCard.display : rightCard.display;
    const houseCard = side === 'izquierda' ? rightCard.display : leftCard.display;
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

    // La función determineWinner ahora solo necesita agregar ganancias si corresponde.
    const result = determineWinner(user, betAmount, side, leftCard, rightCard);

    // Guardar los cambios en el usuario (si ganó o empató).
    await user.save();

    // Finalizar la sesión del juego.
    endGameSession(jid);

    await sock.sendMessage(chatId, { text: result.text, mentions: [jid] });
}

function determineWinner(user, betAmount, side, leftCard, rightCard) {
    let resultText = '';
    let win = false;
    let loss = false;
    let multiplier = 0;
    let netWinnings = 0;

    const leftCardValue = leftCard.value;
    const rightCardValue = rightCard.value;

    const playerWon = (side === 'izquierda' && leftCardValue > rightCardValue) || 
                      (side === 'derecha' && rightCardValue > leftCardValue);

    if (side === 'empate') {
        if (leftCardValue === rightCardValue) {
            win = true;
            multiplier = 5;
            const totalPayout = betAmount * multiplier;
            netWinnings = totalPayout - betAmount;
            user.economy.wallet += totalPayout;
            resultText = `🎉 ¡Increíble! ¡Es un empate! Ganaste *S/ ${totalPayout.toLocaleString()}*.`;
        } else {
            loss = true;
            netWinnings = -betAmount;
            resultText = `❌ ¡No fue un empate! Perdiste *S/ ${betAmount.toLocaleString()}*.`;
        }
    } else {
        if (leftCardValue === rightCardValue) {
            loss = true;
            netWinnings = -betAmount;
            resultText = `😐 ¡Fue un empate! Como no apostaste a 'empate', pierdes *S/ ${betAmount.toLocaleString()}*.`;
        } else if (playerWon) {
            win = true;
            multiplier = 2;
            const totalPayout = betAmount * multiplier;
            netWinnings = totalPayout - betAmount;
            user.economy.wallet += totalPayout;
            resultText = `🎉 ¡Felicidades! Ganaste *S/ ${totalPayout.toLocaleString()}*.`;
        } else {
            loss = true;
            netWinnings = -betAmount;
            resultText = `❌ ¡Mala suerte! Perdiste *S/ ${betAmount.toLocaleString()}*.`;
        }
    }

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
            groupId: user.groupId,
            jid: user.jid,
            result: gameResultForLog,
            betAmount: betAmount,
            winnings: netWinnings,
            timestamp: new Date()
        });
        gameLog.save();
    } catch (error) {
        console.error('Error al guardar el log del juego:', error);
    }

    if (win) {
        updateGameStats(user.jid, user.groupId, 'cartaMayor', { wins: 1, moneyChange: netWinnings });
    } else if (loss) {
        updateGameStats(user.jid, user.groupId, 'cartaMayor', { losses: 1, moneyChange: netWinnings });
    }

    return { text: resultText };
}

module.exports = { play, startInteractiveGame, handleInteractiveChoice };

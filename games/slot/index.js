const { updateGameStats } = require('../../utils/userUtils');
const GameLog = require('../../models/GameLog');
const { SYMBOLS, SLOT_IMAGE_URL } = require('./constants');
const { getCurrency } = require('../../utils/groupUtils');

// Helper function to get a random symbol based on weight
function getRandomSymbol() {
    const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
    let random = Math.random() * totalWeight;
    for (const symbol of SYMBOLS) {
        if (random < symbol.weight) {
            return symbol;
        }
        random -= symbol.weight;
    }
}

async function play(sock, chatId, jid, user, betAmount) {
    const currency = await getCurrency(chatId);
    const userMention = `@${jid.split('@')[0]}`;

    // 1. Mensaje de bienvenida (se mantiene igual)
    await sock.sendMessage(chatId, {
        video: { url: SLOT_IMAGE_URL },
        gifPlayback: true,
        caption: `🎰 *¡Tragamonedas activada!* 🎰\n\n*Jugador:* ${userMention}\n*Apuesta:* ${currency} ${betAmount.toLocaleString()}\n\n*🔄 Girando...*`,
        mentions: [jid]
    });

    await sleep(250); // Pequeña pausa después de la bienvenida

    const finalReels = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    let displayReels = [
        { emoji: '❓' }, { emoji: '❓' }, { emoji: '❓' }
    ];

    // 2. Mensaje de animación que será editado
    const animationMsg = await sock.sendMessage(chatId, { text: `| ${displayReels[0].emoji} | ${displayReels[1].emoji} | ${displayReels[2].emoji} |` });
    const msgKey = animationMsg.key;

    // 3. Animación de los rodillos (nueva lógica)
    const spinDelays = [150, 250, 400]; // Tiempos de espera para más emoción

    // Gira el primer rodillo
    for (let i = 0; i < 3; i++) {
        displayReels[0] = getRandomSymbol();
        const text = `| ${displayReels[0].emoji} | ❓ | ❓ |`;
        await sock.sendMessage(chatId, { text, edit: msgKey });
        await sleep(spinDelays[0]);
    }
    displayReels[0] = finalReels[0];
    await sock.sendMessage(chatId, { text: `| ${displayReels[0].emoji} | ❓ | ❓ |`, edit: msgKey });
    await sleep(250);

    // Gira el segundo rodillo
    for (let i = 0; i < 2; i++) {
        displayReels[1] = getRandomSymbol();
        const text = `| ${displayReels[0].emoji} | ${displayReels[1].emoji} | ❓ |`;
        await sock.sendMessage(chatId, { text, edit: msgKey });
        await sleep(spinDelays[1]);
    }
    displayReels[1] = finalReels[1];
    await sock.sendMessage(chatId, { text: `| ${displayReels[0].emoji} | ${displayReels[1].emoji} | ❓ |`, edit: msgKey });
    await sleep(250);

    // Gira el tercer rodillo
    displayReels[2] = getRandomSymbol();
    await sock.sendMessage(chatId, { text: `| ${displayReels[0].emoji} | ${displayReels[1].emoji} | ${displayReels[2].emoji} |`, edit: msgKey });
    await sleep(spinDelays[2]);

    // Muestra el resultado final
    displayReels[2] = finalReels[2];
    const finalText = `| ${displayReels[0].emoji} | ${displayReels[1].emoji} | ${displayReels[2].emoji} |`;
    await sock.sendMessage(chatId, { text: finalText, edit: msgKey });


    await sleep(500); // Pausa antes de mostrar el resultado final

    // 4. Determinar el resultado (lógica existente)
    let resultText = '';
    let win = false;
    let netWinnings = -betAmount; // Start with the loss

    const [s1, s2, s3] = finalReels; // <-- LÍNEA CORREGIDA
    let winSymbol = null;
    let winCount = 0;

    // Simplified win detection
    if (s1.emoji === s2.emoji && s2.emoji === s3.emoji) {
        winSymbol = s1;
        winCount = 3;
    } else {
        const symbols = [s1, s2, s3];
        const counts = symbols.reduce((acc, s) => {
            acc[s.emoji] = (acc[s.emoji] || 0) + 1;
            return acc;
        }, {});
        for (const emoji in counts) {
            if (counts[emoji] === 2) {
                winSymbol = SYMBOLS.find(s => s.emoji === emoji);
                winCount = 2;
                break;
            }
        }
    }

    if (winSymbol && winSymbol.payouts[winCount]) {
        win = true;
        const multiplier = winSymbol.payouts[winCount];
        const winnings = betAmount * multiplier;
        user.economy.wallet += winnings; // The bet was already deducted, so we just add the full prize
        netWinnings = winnings - betAmount;

        // The user object is updated, so we can use it for the new balance
        const newBalance = user.economy.wallet;

        if (winSymbol.emoji === '🎰' && winCount === 3) {
            resultText = `🚨 *¡¡¡ JACKPOT !!!* 🚨

*¡Felicidades, ${userMention}!*
*Resultado:* ¡TRIPLE ${winSymbol.emoji}!
*Premio:* ${currency} ${winnings.toLocaleString()} (x${multiplier})`;
        } else if (winCount === 3) {
            resultText = `🎉 *¡GANASTE!* 🎉

*¡Felicidades, ${userMention}!*
*Resultado:* ¡TRIPLE ${winSymbol.name.toUpperCase()}!
*Premio:* ${currency} ${winnings.toLocaleString()} (x${multiplier})`;
        } else {
            resultText = `✨ *¡GANASTE!* ✨

*¡Felicidades, ${userMention}!*
*Resultado:* ¡DOBLE ${winSymbol.name.toUpperCase()}!
*Premio:* ${currency} ${winnings.toLocaleString()} (x${multiplier})`;
        }
    } else {
        // Bet was already deducted by the command, so we do nothing to the wallet here.
        netWinnings = -betAmount;
        resultText = `😔 *¡No hay coincidencias, ${userMention}!* 😔

*Perdiste:* ${currency} ${betAmount.toLocaleString()}
_¡Inténtalo de nuevo!_`;
    }

    await sock.sendMessage(chatId, { text: resultText, mentions: [jid] });

    await user.save();

    try {
        const gameLog = new GameLog({
            gameName: 'slot',
            groupId: chatId, // Use chatId for group context
            jid: user.jid,
            result: win ? 'win' : 'loss',
            betAmount: betAmount,
            winnings: netWinnings,
            timestamp: new Date()
        });
        await gameLog.save();
    } catch (error) {
        console.error('Error al guardar el log del juego:', error);
    }

    updateGameStats(user.jid, chatId, 'slot', { [win ? 'wins' : 'losses']: 1, moneyChange: netWinnings });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getInfo(sock, chatId) {
    const currency = await getCurrency(chatId);
    let infoText = '🎰 *Tabla de pagos (multiplicador sobre apuesta):*\n\n';
    SYMBOLS.forEach(s => {
        infoText += `${s.emoji} ${s.name} – 3x: x${s.payouts[3]} / 2x: x${s.payouts[2]}\n`;
    });
    infoText += `\n*Apuesta Mínima:* ${currency} ${require('./constants').MIN_BET}\n*Apuesta Máxima:* ${currency} ${require('./constants').MAX_BET}`;
    await sock.sendMessage(chatId, { text: infoText });
}

module.exports = { play, getInfo };

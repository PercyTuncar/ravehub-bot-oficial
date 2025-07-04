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

    await sock.sendMessage(chatId, {
        image: { url: SLOT_IMAGE_URL },
        caption: `🎰 *¡Tragamonedas activada!* 🎰\n\n*Jugador:* ${userMention}\n*Apuesta:* ${currency} ${betAmount.toLocaleString()}\n\n*🔄 Girando...*`,
        mentions: [jid]
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const reels = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

    // Animation
    await sock.sendMessage(chatId, { text: `| ${reels[0].emoji} | ❓ | ❓ |` });
    await new Promise(resolve => setTimeout(resolve, 900));
    await sock.sendMessage(chatId, { text: `| ${reels[0].emoji} | ${reels[1].emoji} | ❓ |` });
    await new Promise(resolve => setTimeout(resolve, 900));

    // Final reel reveal
    const finalReelsText = `| ${reels[0].emoji} | ${reels[1].emoji} | ${reels[2].emoji} |`;
    await sock.sendMessage(chatId, { text: finalReelsText });
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Determine result
    let resultText = '';
    let win = false;
    let netWinnings = -betAmount; // Start with the loss

    const [s1, s2, s3] = reels;
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

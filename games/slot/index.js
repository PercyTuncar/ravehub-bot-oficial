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

    await sock.sendMessage(chatId, {
        image: { url: SLOT_IMAGE_URL },
        caption: `🎰 ¡Tragamonedas activada!\n💰 Apuesta: ${currency} ${betAmount}\n🔄 Girando...`,
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const reels = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

    // Animation
    await sock.sendMessage(chatId, { text: `| ${reels[0].emoji} | ❓ | ❓ |` });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sock.sendMessage(chatId, { text: `| ${reels[0].emoji} | ${reels[1].emoji} | ❓ |` });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const finalReels = `| ${reels[0].emoji} | ${reels[1].emoji} | ${reels[2].emoji} |`;

    // Determine result
    let resultText = '';
    let win = false;
    let netWinnings = -betAmount; // Start with the loss

    const [s1, s2, s3] = reels;
    let winSymbol = null;
    let winCount = 0;

    if (s1.emoji === s2.emoji && s2.emoji === s3.emoji) {
        winSymbol = s1;
        winCount = 3;
    } else if (s1.emoji === s2.emoji) {
        winSymbol = s1;
        winCount = 2;
    } else if (s2.emoji === s3.emoji) {
        winSymbol = s2;
        winCount = 2;
    } else if (s1.emoji === s3.emoji) {
        winSymbol = s1;
        winCount = 2;
    }

    if (winSymbol && winSymbol.payouts[winCount]) {
        win = true;
        const multiplier = winSymbol.payouts[winCount];
        const winnings = betAmount * multiplier;
        netWinnings += winnings;
        user.economy.wallet += winnings;

        if (winSymbol.emoji === '🎰' && winCount === 3) {
            resultText = `🚨 ¡¡¡ JACKPOT !!! 🚨\n${finalReels}\n💥 ¡TRIPLE JACKPOT! 💥\n💰 Ganaste: ${currency} ${winnings.toLocaleString()}\n🎊 ¡FELICIDADES! 🎊\n💳 Nuevo saldo: ${currency} ${user.economy.wallet.toLocaleString()}`;
        } else if (winCount === 3) {
            resultText = `🎉 ¡TRIPLE ${winSymbol.name.toUpperCase()}! 🎉\n${finalReels}\n💰 Ganaste: ${currency} ${winnings.toLocaleString()} (x${multiplier})\n🔥 ¡Increíble suerte!\n💳 Nuevo saldo: ${currency} ${user.economy.wallet.toLocaleString()}`;
        } else {
            resultText = `✨ ¡DOBLE ${winSymbol.name.toUpperCase()}! ✨\n${finalReels}\n💰 Ganaste: ${currency} ${winnings.toLocaleString()} (x${multiplier})\n😊 ¡Buena jugada!\n💳 Nuevo saldo: ${currency} ${user.economy.wallet.toLocaleString()}`;
        }
    } else {
        resultText = `😔 ¡No hay coincidencias! 😔\n${finalReels}\n💸 Perdiste: ${currency} ${betAmount.toLocaleString()}\n🎯 ¡Inténtalo de nuevo!\n💳 Saldo restante: ${currency} ${user.economy.wallet.toLocaleString()}`;
    }

    await sock.sendMessage(chatId, { text: resultText });

    await user.save();

    try {
        const gameLog = new GameLog({
            gameName: 'slot',
            groupId: user.groupId,
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

    updateGameStats(user.jid, user.groupId, 'slot', { [win ? 'wins' : 'losses']: 1, moneyChange: netWinnings });
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

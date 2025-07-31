const { SYMBOLS } = require('./constants');

function getRandomSymbol() {
    const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
    let random = Math.random() * totalWeight;
    for (const symbol of SYMBOLS) {
        if (random < symbol.weight) {
            return symbol;
        }
        random -= symbol.weight;
    }
    return SYMBOLS[SYMBOLS.length - 1];
}

function playSlot(betAmount) {
    const reels = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    const [s1, s2, s3] = reels;

    let winSymbol = null;
    let winCount = 0;
    let winnings = 0;
    let isWin = false;

    // Comprobar triple coincidencia
    if (s1.emoji === s2.emoji && s2.emoji === s3.emoji) {
        winSymbol = s1;
        winCount = 3;
    } 
    // Comprobar doble coincidencia (si no hay triple)
    else {
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

    // Calcular ganancia si hubo coincidencia
    if (winSymbol && winSymbol.payouts[winCount]) {
        isWin = true;
        const multiplier = winSymbol.payouts[winCount];
        winnings = betAmount * multiplier;
    }

    return {
        isWin,
        winnings,
        reels,
        winSymbol,
        winCount
    };
}

function getInfoText(currency) {
    let infoText = '🎰 *Tabla de pagos (multiplicador sobre apuesta):*\n\n';
    SYMBOLS.forEach(s => {
        infoText += `${s.emoji} ${s.name} – 3x: x${s.payouts[3]} / 2x: x${s.payouts[2]}\n`;
    });
    infoText += `\n*Apuesta Mínima:* ${currency} ${require('./constants').MIN_BET}\n*Apuesta Máxima:* ${currency} ${require('./constants').MAX_BET}`;
    return infoText;
}

module.exports = { playSlot, getInfoText };
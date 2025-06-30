const { xpTable, getLevelName } = require('./levels');

/**
 * Maneja el pago de una deuda judicial, ajusta la XP y el nivel del usuario.
 * @param {object} user - El objeto del usuario de la base de datos.
 * @param {number} incomingAmount - La cantidad de dinero que el usuario está recibiendo.
 * @param {string} currency - El símbolo de la moneda del grupo.
 * @returns {{remainingAmount: number, debtMessage: string, levelChangeMessage: string}}
 */
function handleDebtPayment(user, incomingAmount, currency) {
    if (user.judicialDebt <= 0) {
        return { remainingAmount: incomingAmount, debtMessage: '', levelChangeMessage: '' };
    }

    const amountToPay = Math.min(incomingAmount, user.judicialDebt);
    const xpLost = Math.floor(amountToPay / 10);
    const originalLevel = user.level;

    user.judicialDebt -= amountToPay;
    user.xp -= xpLost;

    // Verificar si el usuario baja de nivel
    while (user.level > 1 && user.xp < xpTable[user.level - 1]) {
        user.level--;
    }

    const remainingAmount = incomingAmount - amountToPay;

    const debtMessage = `⚖️ ¡Deuda Cobrada! ⚖️\nSe interceptaron *${currency}${amountToPay}* para pagar tu deuda judicial. Perdiste *${xpLost} XP*.\n*Deuda restante:* ${currency}${user.judicialDebt}`;

    let levelChangeMessage = '';
    if (user.level < originalLevel) {
        levelChangeMessage = `📉 ¡Has bajado de nivel! Ahora eres ${getLevelName(user.level)}.`;
    }

    return { remainingAmount, debtMessage, levelChangeMessage };
}

module.exports = { handleDebtPayment };

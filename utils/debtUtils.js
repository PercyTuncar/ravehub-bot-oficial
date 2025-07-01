const Debt = require('../models/Debt');
const User = require('../models/User');
const { getSocket } = require('../bot');

/**
 * Calcula y aplica el interés acumulado a todas las deudas activas.
 */
async function applyInterestToAllDebts() {
    const debts = await Debt.find();
    const now = new Date();

    for (const debt of debts) {
        const hoursDiff = Math.floor((now - new Date(debt.lastInterestApplied)) / (1000 * 60 * 60));
        const daysPassed = Math.floor(hoursDiff / 24);

        if (daysPassed > 0) {
            const interestAmount = debt.amount * Math.pow(1 + debt.interest, daysPassed) - debt.amount;
            debt.amount += interestAmount;
            debt.lastInterestApplied = now;
            await debt.save();
        }
    }
}

/**
 * Determina la reputación de pago de un usuario.
 * @param {object} user - El objeto del usuario.
 * @returns {string} La etiqueta de reputación.
 */
function getPaymentReputation(user) {
    const { paidOnTime, paidLate } = user.paymentHistory;
    if (paidOnTime > paidLate && paidOnTime > 5) return '🎖️ Buen Pagador';
    if (paidLate > paidOnTime && paidLate > 2) return '⚠️ Moroso';
    return '😐 Neutral';
}

/**
 * Envía un recordatorio de deuda a un usuario.
 * @param {string} chatId - El JID del chat donde se enviará el mensaje.
 * @param {object} user - El objeto del usuario que tiene deudas.
 */
async function sendDebtReminder(chatId, user) {
    const sock = getSocket();
    await applyInterestToAllDebts(); // Asegurarse de que las deudas estén actualizadas
    const populatedUser = await User.findById(user._id).populate({
        path: 'debts',
        populate: { path: 'lender', select: 'name jid' }
    });

    if (populatedUser.debts.length > 0) {
        const totalDebt = populatedUser.debts.reduce((sum, debt) => sum + debt.amount, 0);
        const lenders = [...new Set(populatedUser.debts.map(d => `@${d.lender.jid.split('@')[0]}`))].join(', ');
        const mentions = populatedUser.debts.map(d => d.lender.jid);

        const reminderMessage = `🧾 ¡Recuerda que tienes una deuda total de ${totalDebt.toFixed(2)} 💵 con ${lenders}!\\nUsa *.pagar* para saldar tus cuentas. 💼`;
        
        await sock.sendMessage(chatId, {
            text: reminderMessage,
            mentions: [...new Set([user.jid, ...mentions])]
        });
    }
}

module.exports = { applyInterestToAllDebts, sendDebtReminder, getPaymentReputation };

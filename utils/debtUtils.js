const Debt = require('../models/Debt');
const User = require('../models/User');
const { getSocket } = require('../bot');
const { addMessageToQueue } = require('./messageQueue');

/**
 * Calcula y aplica el interés acumulado a todas las deudas activas.
 */
async function applyInterestToAllDebts() {
    const debts = await Debt.find().populate('borrower');
    const now = new Date();

    for (const debt of debts) {
        // Calcula el interés
        const hoursDiff = Math.floor((now - new Date(debt.lastInterestApplied)) / (1000 * 60 * 60));
        const daysPassed = Math.floor(hoursDiff / 24);

        if (daysPassed > 0) {
            const interestAmount = debt.amount * Math.pow(1 + debt.interest, daysPassed) - debt.amount;
            debt.amount += interestAmount;
            debt.lastInterestApplied = now;
        }

        // Verifica si el usuario se ha vuelto moroso
        const delinquencyDays = 3;
        const debtAgeInDays = Math.floor((now - new Date(debt.createdAt)) / (1000 * 60 * 60 * 24));

        if (debtAgeInDays > delinquencyDays && !debt.isDelinquent) {
            debt.isDelinquent = true;
            if (debt.borrower) {
                debt.borrower.paymentHistory.paidLate = (debt.borrower.paymentHistory.paidLate || 0) + 1;
                await debt.borrower.save();
            }
        }
        
        await debt.save();
    }
}

/**
 * Determina la reputación de pago de un usuario.
 * @param {object} user - El objeto del usuario.
 * @returns {string} La etiqueta de reputación.
 */
function getPaymentReputation(user) {
    const { paidOnTime, paidLate } = user.paymentHistory;
    const totalDebts = paidOnTime + paidLate;

    if (totalDebts === 0) return '😐 Neutral';
    if (paidLate > 0) return '⚠️ Moroso';
    if (paidOnTime > 0 && paidLate === 0) return '🎖️ Buen Pagador';
    
    return '😐 Neutral';
}

/**
 * Genera un mensaje de recordatorio de deuda para un usuario.
 * @param {object} user - El objeto del usuario que tiene deudas.
 * @returns {Promise<object|null>} Un objeto con el mensaje y las menciones, o null si no hay deudas.
 */
async function getDebtReminderMessage(user) {
    await applyInterestToAllDebts(); // Asegurarse de que las deudas estén actualizadas
    const populatedUser = await User.findById(user._id).populate({
        path: 'debts',
        populate: { path: 'lender', select: 'name jid' }
    });

    if (populatedUser.debts.length > 0) {
        const totalDebt = populatedUser.debts.reduce((sum, debt) => sum + debt.amount, 0);
        const lenders = [...new Set(populatedUser.debts.map(d => `@${d.lender.jid.split('@')[0]}`))].join(', ');
        const mentions = populatedUser.debts.map(d => d.lender.jid);

        const reminderMessage = `\n\n🧾 ¡Recuerda que tienes una deuda total de ${totalDebt.toFixed(2)} 💵 con ${lenders}!\nUsa *.pagar* para saldar tus cuentas. 💼`;
        
        return {
            text: reminderMessage,
            mentions: [...new Set([user.jid, ...mentions])]
        };
    }
    return null;
}

/**
 * Envía un recordatorio de deuda a un usuario.
 * @param {string} chatId - El JID del chat donde se enviará el mensaje.
 * @param {object} user - El objeto del usuario que tiene deudas.
 */
async function sendDebtReminder(chatId, user) {
    const sock = getSocket();
    const debtInfo = await getDebtReminderMessage(user);

    if (debtInfo) {
        // El mensaje de getDebtReminderMessage ya viene con saltos de línea iniciales, así que lo usamos directamente.
        addMessageToQueue(sock, chatId, {
            text: debtInfo.text.trim(), // Quitamos espacios extra por si acaso
            mentions: debtInfo.mentions
        });
    }
}

module.exports = { applyInterestToAllDebts, sendDebtReminder, getPaymentReputation, getDebtReminderMessage };

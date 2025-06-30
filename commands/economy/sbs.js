const User = require('../../models/User');
const Debt = require('../../models/Debt');
const { applyInterestToAllDebts } = require('../../utils/debtUtils');
const { getCurrency } = require('../../utils/groupUtils');

module.exports = {
    name: 'sbs',
    description: 'Consultar el historial de deudas de todos los usuarios.',
    aliases: ['infocorp'],
    usage: '.sbs',
    category: 'economy',
    async execute(sock, message) {
        const chatId = message.key.remoteJid;

        try {
            await applyInterestToAllDebts(); // Ensure debts are updated with interest
            const currency = await getCurrency(chatId);

            const allDebts = await Debt.find({ amount: { $gt: 0 } }).populate('borrower').populate('lender');
            const judicialDebtors = await User.find({ judicialDebt: { $gt: 0 } });

            if (allDebts.length === 0 && judicialDebtors.length === 0) {
                return sock.sendMessage(chatId, { text: '✅ ¡Felicidades! No hay deudores registrados en el sistema.' });
            }

            let report = '📋 *REPORTE DE DEUDORES (SBS / INFOCORP)* 📋\n\n';
            const mentions = [];

            if (allDebts.length > 0) {
                report += '*--- Deudas por Préstamos ---*\n';
                allDebts.forEach(debt => {
                    if (debt.borrower && debt.lender) {
                        report += `🔴 @${debt.borrower.jid.split('@')[0]} debe ${debt.amount.toFixed(2)} ${currency} a @${debt.lender.jid.split('@')[0]}\n`;
                        mentions.push(debt.borrower.jid, debt.lender.jid);
                    }
                });
                report += '\n';
            }

            if (judicialDebtors.length > 0) {
                report += '*--- Deudas Judiciales ---*\n';
                judicialDebtors.forEach(user => {
                    report += `⚠️ @${user.jid.split('@')[0]} tiene una deuda judicial por robo de ${user.judicialDebt} ${currency} ⚖️\n`;
                    mentions.push(user.jid);
                });
            }

            await sock.sendMessage(chatId, { 
                text: report.trim(),
                mentions: [...new Set(mentions)] // Avoid duplicate mentions
            });

        } catch (error) {
            console.error('Error en el comando sbs:', error);
            sock.sendMessage(chatId, { text: '❌ Ocurrió un error al generar el reporte de deudas.' });
        }
    },
};

const { findOrCreateUser } = require('../../utils/userUtils');
const { applyInterestToAllDebts } = require('../../utils/debtUtils');
const User = require('../../models/User');
const { getCurrency } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'deuda',
    description: 'Ver tus deudas pendientes.',
    aliases: ['debts', 'deudas'],
    usage: '.deuda',
    category: 'economy',
    async execute(message) {
        const sock = getSocket();
        const jid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            await applyInterestToAllDebts();
            const currency = await getCurrency(chatId);
            const user = await findOrCreateUser(jid, chatId, message.pushName);

            await user.populate({ 
                path: 'debts', 
                populate: { path: 'lender', select: 'name jid groupId' } 
            });

            // Filtrar deudas solo del grupo actual
            const groupDebts = user.debts.filter(debt => debt.groupId === chatId);

            if (!user || (groupDebts.length === 0 && user.judicialDebt === 0)) {
                return sock.sendMessage(chatId, { text: '¡Felicidades! No tienes ninguna deuda pendiente.' });
            }

            let debtMessage = '*╭───≽ 🧾 TUS DEUDAS ≼───*\n*│*\n';
            const mentions = [jid];

            if (user.judicialDebt > 0) {
                debtMessage += `*│* ⚖️ *Deuda Judicial:* ${user.judicialDebt} ${currency} (Por robo)\n`;
            }

            if (groupDebts.length > 0) {
                groupDebts.forEach(debt => {
                    mentions.push(debt.lender.jid);
                    debtMessage += `*│* 💸 *Préstamo:* Debes ${debt.amount.toFixed(2)} ${currency} a @${debt.lender.jid.split('@')[0]}\n`;
                });
            }

            debtMessage += '*│*\n*╰──────────≽*';

            await sock.sendMessage(chatId, { text: debtMessage, mentions: [...new Set(mentions)] });

        } catch (error) {
            console.error('Error en el comando deuda:', error);
            sock.sendMessage(chatId, { text: '❌ Ocurrió un error al consultar tus deudas.' });
        }
    },
};

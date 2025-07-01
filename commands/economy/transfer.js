const { findOrCreateUser } = require('../../utils/userUtils');
const { getCurrency } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');
const Debt = require('../../models/Debt'); // Importar el modelo de Deuda

module.exports = {
    name: 'transfer',
    description: 'Transferir dinero a otro usuario.',
    aliases: ['transferir'],
    usage: '.transfer <monto> @usuario',
    category: 'economy',
    async execute(message, args) {
        const sock = getSocket();
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const amountStr = args.find(arg => !isNaN(parseInt(arg)));
            const amount = amountStr ? parseInt(amountStr) : 0;

            if (!mentionedJid || amount <= 0) {
                return sock.sendMessage(chatId, { text: 'Formato incorrecto. Uso: .transfer <monto> @usuario' });
            }

            if (senderJid === mentionedJid) {
                return sock.sendMessage(chatId, { text: 'No puedes transferirte dinero a ti mismo.' });
            }

            const currency = await getCurrency(chatId);
            const sender = await findOrCreateUser(senderJid, chatId, message.pushName);
            
            if (sender.economy.wallet < amount) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero en tu cartera. Saldo actual: ${currency} ${sender.economy.wallet.toFixed(2)}` });
            }

            const targetName = message.message.extendedTextMessage?.contextInfo?.pushName || mentionedJid.split('@')[0];
            const target = await findOrCreateUser(mentionedJid, chatId, targetName);

            // --- Lógica de Deuda Unificada ---
            let debtMessage = '';
            const debtToTarget = await Debt.findOne({ borrower: sender._id, lender: target._id, groupId: chatId });

            if (debtToTarget) {
                const paymentForDebt = Math.min(amount, debtToTarget.amount);
                debtToTarget.amount -= paymentForDebt;

                if (debtToTarget.amount <= 0) {
                    await Debt.findByIdAndDelete(debtToTarget._id);
                    sender.debts.pull(debtToTarget._id);
                    target.loans.pull(debtToTarget._id);
                    debtMessage = `\n\nℹ️ Con esta transferencia, has saldado completamente tu deuda de *${currency} ${paymentForDebt.toFixed(2)}* con @${target.jid.split('@')[0]}.`;
                } else {
                    await debtToTarget.save();
                    debtMessage = `\n\nℹ️ De este monto, *${currency} ${paymentForDebt.toFixed(2)}* se usaron para pagar tu deuda con @${target.jid.split('@')[0]}. Deuda restante: *${currency} ${debtToTarget.amount.toFixed(2)}*.`;
                }
            }

            // --- Transacción Única ---
            sender.economy.wallet -= amount;
            target.economy.wallet += amount;

            await sender.save();
            await target.save();

            await sock.sendMessage(chatId, {
                text: `✅ Has transferido *${currency} ${amount.toFixed(2)}* de tu cartera a @${mentionedJid.split('@')[0]}.${debtMessage}\n\n*Tu nuevo saldo en cartera:* ${currency} ${sender.economy.wallet.toFixed(2)}`,
                mentions: [senderJid, mentionedJid]
            });

        } catch (error) {
            console.error('Error en la transferencia:', error);
            await sock.sendMessage(chatId, { text: '❌ Ocurrió un error al realizar la transferencia.' });
        }
    }
};

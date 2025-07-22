const User = require('../../models/User');
const { findOrCreateUser } = require('../../utils/userUtils');
const { getCurrency } = require('../../utils/groupUtils');
module.exports = {
    name: 'transfer',
    description: 'Transferir dinero a otro usuario.',
    aliases: ['transferir'],
    usage: '.transfer <monto> @usuario',
    category: 'economy',
    async execute(message, args, client) {
        const sock = client;
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
            const targetName = message.message.extendedTextMessage?.contextInfo?.pushName || mentionedJid.split('@')[0];
            const target = await findOrCreateUser(mentionedJid, chatId, targetName);

            if (sender.economy.wallet < amount) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero en tu cartera. Saldo actual: ${currency} ${sender.economy.wallet.toLocaleString()}` });
            }

            // --- Transacción Atómica ---
            const ops = [
                { updateOne: { filter: { _id: sender._id, 'economy.wallet': { $gte: amount } }, update: { $inc: { 'economy.wallet': -amount } } } },
                { updateOne: { filter: { _id: target._id }, update: { $inc: { 'economy.wallet': amount } } } }
            ];

            const result = await User.bulkWrite(ops);

            if (result.modifiedCount < 2) {
                // Si no se modificaron 2 documentos, la operación falló (probablemente fondos insuficientes).
                // La operación de bulkWrite no se completa, por lo que no hay necesidad de revertir manualmente.
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero para realizar esta transferencia de ${currency} ${amount.toLocaleString()}.` });
            }

            const updatedSender = await User.findById(sender._id);
            let debtMessage = '';

            // La lógica de deudas se puede manejar después de la transferencia exitosa.
            // (Esta parte aún podría mejorarse con transacciones si se vuelve más compleja)
            const debtToTarget = await Debt.findOne({ borrower: sender._id, lender: target._id, groupId: chatId });
            if (debtToTarget) {
                const paymentForDebt = Math.min(amount, debtToTarget.amount);
                debtToTarget.amount -= paymentForDebt;
                if (debtToTarget.amount <= 0) {
                    await Debt.findByIdAndDelete(debtToTarget._id);
                    debtMessage = `\n\nℹ️ Con esta transferencia, has saldado completamente tu deuda de *${currency} ${paymentForDebt.toLocaleString()}* con @${target.jid.split('@')[0]}.`;
                } else {
                    await debtToTarget.save();
                    debtMessage = `\n\nℹ️ De este monto, *${currency} ${paymentForDebt.toLocaleString()}* se usaron para pagar tu deuda con @${target.jid.split('@')[0]}. Deuda restante: *${currency} ${debtToTarget.amount.toLocaleString()}*.`;
                }
            }

            await sock.sendMessage(chatId, {
                text: `✅ Has transferido *${currency} ${amount.toLocaleString()}* de tu cartera a @${mentionedJid.split('@')[0]}.${debtMessage}\n\n*Tu nuevo saldo en cartera:* ${currency} ${updatedSender.economy.wallet.toLocaleString()}`,
                mentions: [senderJid, mentionedJid]
            });

        } catch (error) {
            console.error('Error en la transferencia:', error);
            await sock.sendMessage(chatId, { text: '❌ Ocurrió un error al realizar la transferencia.' });
        }
    }
};

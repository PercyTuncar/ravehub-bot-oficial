const { findOrCreateUser } = require('../../utils/userUtils');
const User = require('../../models/User');
const Debt = require('../../models/Debt');
const { getCurrency } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'plinear',
    description: 'Enviar 💵 usando Plin.',
    usage: '.plinear <monto> @usuario',
    category: 'economy',
    aliases: ['plin'],
    async execute(message, args) {
        const sock = getSocket();
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

        const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const amountStr = args.find(arg => !isNaN(parseInt(arg)));
        const amount = amountStr ? parseInt(amountStr) : 0;

        if (!mentionedJid || amount <= 0) {
            return sock.sendMessage(chatId, { text: 'Formato incorrecto. Uso: .pline @usuario <cantidad>' });
        }

        if (senderJid === mentionedJid) {
            return sock.sendMessage(chatId, { text: 'No te puedes plinear a ti mismo, ¡pasa la voz a un amigo!' });
        }

        try {
            const sender = await findOrCreateUser(senderJid, chatId, message.pushName);

            if (sender.economy.bank < amount) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero en tu banco para plinear esa cantidad. Saldo actual: ${currency} ${sender.economy.bank.toFixed(2)}` });
            }

            const targetName = message.message.extendedTextMessage?.contextInfo?.pushName || mentionedJid.split('@')[0];
            const target = await findOrCreateUser(mentionedJid, chatId, targetName);

            // --- Lógica de Deuda Refactorizada ---
            let debtMessage = '';
            const debtToTarget = await Debt.findOne({ borrower: sender._id, lender: target._id, groupId: chatId });

            if (debtToTarget) {
                const paymentForDebt = Math.min(amount, debtToTarget.amount);
                debtToTarget.amount -= paymentForDebt;

                if (debtToTarget.amount <= 0) {
                    await Debt.findByIdAndDelete(debtToTarget._id);
                    // Asegurarse de que la deuda se elimina de las referencias de ambos usuarios
                    sender.debts.pull(debtToTarget._id);
                    target.loans.pull(debtToTarget._id);
                    debtMessage = `\n\nℹ️ Con este Plin, has saldado completamente tu deuda de *${currency} ${paymentForDebt.toFixed(2)}* con @${target.jid.split('@')[0]}. ¡Estás libre de deudas con esta persona!`;
                } else {
                    await debtToTarget.save();
                    debtMessage = `\n\nℹ️ De este monto, *${currency} ${paymentForDebt.toFixed(2)}* se usaron para pagar tu deuda con @${target.jid.split('@')[0]}. Deuda restante: *${currency} ${debtToTarget.amount.toFixed(2)}*.`;
                }
            }

            // --- Transacción Única ---
            sender.economy.bank -= amount;
            target.economy.bank += amount;

            await sender.save();
            await target.save();

            await sock.sendMessage(chatId, { 
                text: `✅ Plin exitoso de *${currency} ${amount.toFixed(2)}* a @${mentionedJid.split('@')[0]}.${debtMessage}\n\n*Tu nuevo saldo en banco:* ${currency} ${sender.economy.bank.toFixed(2)}`,
                mentions: [senderJid, mentionedJid]
            });

        } catch (error) {
            console.error('Error en el plineo:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al realizar el plineo.' });
        }
    }
};

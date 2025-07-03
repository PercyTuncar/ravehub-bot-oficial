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

            // --- Lógica de Deuda Refactorizada (usando la de yapear.js) ---
            let debtMessage = '';
            const debtToTarget = await Debt.findOne({ borrower: sender._id, lender: target._id, groupId: chatId });

            if (debtToTarget) {
                const paymentForDebt = Math.min(amount, debtToTarget.amount);
                debtToTarget.amount -= paymentForDebt;

                debtMessage = `\n\nℹ️ De tu Plin, se usaron *${currency} ${paymentForDebt.toLocaleString()}* para pagar tu deuda.`;

                if (debtToTarget.amount <= 0.01) { // Umbral para comparación de flotantes
                    await Debt.findByIdAndDelete(debtToTarget._id);
                    sender.debts.pull(debtToTarget._id);
                    debtMessage += `\n¡Felicidades! Has saldado tu deuda por completo. 🎉`;
                } else {
                    await debtToTarget.save();
                    debtMessage += `\nDeuda restante: *${currency} ${debtToTarget.amount.toLocaleString()}*.`;
                }
            }

            // --- Transacción Única ---
            sender.economy.bank -= amount;
            target.economy.bank += amount;

            await sender.save();
            await target.save();

            const finalMessage = `✅ Plin exitoso de *${currency} ${amount.toLocaleString()}* a @${target.jid.split('@')[0]}.${debtMessage}`;

            await sock.sendMessage(chatId, { 
                text: finalMessage,
                mentions: [senderJid, mentionedJid]
            });

        } catch (error) {
            console.error('Error en el plineo:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al realizar el plineo.' });
        }
    }
};

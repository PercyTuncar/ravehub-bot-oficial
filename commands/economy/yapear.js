const { findOrCreateUser } = require('../../utils/userUtils');
const User = require('../../models/User');
const Debt = require('../../models/Debt');
const { applyInterestToAllDebts } = require('../../utils/debtUtils');

module.exports = {
    name: 'yapear',
    description: 'Enviar 💵 usando Yape.',
    aliases: ['yape'],
    usage: '.yapear <monto> @usuario',
    category: 'economy',
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const amountStr = args.find(arg => !isNaN(parseInt(arg)));
            const amount = amountStr ? parseInt(amountStr) : 0;

            if (!mentionedJid || amount <= 0) {
                return sock.sendMessage(chatId, { text: 'Formato incorrecto. Para yapear, usa: .yapear <monto> @usuario' });
            }

            if (senderJid === mentionedJid) {
                return sock.sendMessage(chatId, { text: 'No te puedes yapear a ti mismo, ¡intenta con un amigo!' });
            }

            await applyInterestToAllDebts();

            const sender = await User.findOne({ jid: senderJid });
            const recipient = await User.findOne({ jid: mentionedJid });

            if (!sender || !recipient) {
                await findOrCreateUser(senderJid, message.pushName);
                await findOrCreateUser(mentionedJid);
                return sock.sendMessage(chatId, { text: '❌ Ocurrió un error. Inténtalo de nuevo.' });
            }

            if (sender.economy.bank < amount) {
                return sock.sendMessage(chatId, { text: 'No tienes suficiente dinero en tu cuenta de banco para yapear.' });
            }

            let debtPaymentMessage = '';

            const debt = await Debt.findOne({ borrower: sender._id, lender: recipient._id });

            if (debt) {
                const amountToPayOnDebt = Math.min(amount, debt.amount);
                debt.amount -= amountToPayOnDebt;

                debtPaymentMessage = `\n\n🧾 De tu yapeo, se usaron ${amountToPayOnDebt.toFixed(2)} 💵 para pagar tu deuda.`;

                if (debt.amount <= 0.01) { // Use threshold for float comparison
                    const daysLate = Math.floor((new Date() - new Date(debt.createdAt)) / (1000 * 60 * 60 * 24)) - 7; // 7 days grace
                    if (daysLate > 0) {
                        sender.paymentHistory.paidLate += 1;
                    } else {
                        sender.paymentHistory.paidOnTime += 1;
                    }
                    await Debt.findByIdAndDelete(debt._id);
                    sender.debts.pull(debt._id);
                    debtPaymentMessage += `\n¡Felicidades! Has saldado tu deuda por completo. 🎉`;
                } else {
                    await debt.save();
                    debtPaymentMessage += `\nDeuda restante: ${debt.amount.toFixed(2)} 💵.`;
                }
            }

            // Perform the main transaction
            sender.economy.bank -= amount;
            recipient.economy.bank += amount;

            await sender.save();
            await recipient.save();

            const finalMessage = `✅ Has yapeado ${amount} 💵 a @${recipient.jid.split('@')[0]}.${debtPaymentMessage}`;

            await sock.sendMessage(chatId, { 
                text: finalMessage, 
                mentions: [senderJid, recipient.jid] 
            });

        } catch (error) {
            console.error('Error en el comando de yapeo:', error);
            await sock.sendMessage(chatId, { text: 'Hubo un problema al procesar tu yapeo.' });
        }
    }
};

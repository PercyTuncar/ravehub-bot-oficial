const { findOrCreateUser } = require('../../utils/userUtils');
const User = require('../../models/User');
const Debt = require('../../models/Debt');
const { applyInterestToAllDebts } = require('../../utils/debtUtils');
const { getCurrency } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'pagar',
    description: 'Pagar una deuda a otro usuario.',
    aliases: ['pay'],
    usage: '.pagar <monto> @usuario',
    category: 'economy',
    async execute(message, args) {
        const sock = getSocket();
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            await applyInterestToAllDebts();
            const currency = await getCurrency(chatId);

            if (args.length < 2 || !message.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
                return sock.sendMessage(chatId, { text: 'Debes especificar un monto y mencionar al usuario al que le debes. Ejemplo: .pagar 500 @usuario' });
            }

            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount <= 0) {
                return sock.sendMessage(chatId, { text: 'El monto debe ser un número positivo.' });
            }

            const lenderJid = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            const borrower = await User.findOne({ jid: senderJid, groupId: chatId });
            const lender = await User.findOne({ jid: lenderJid, groupId: chatId });

            if (!borrower || !lender) {
                return sock.sendMessage(chatId, { text: '❌ No se pudo encontrar a uno de los usuarios.' });
            }

            const debt = await Debt.findOne({ borrower: borrower._id, lender: lender._id, groupId: chatId });

            if (!debt) {
                return sock.sendMessage(chatId, { text: `No tienes ninguna deuda pendiente con @${lender.name}.`, mentions: [lender.jid] });
            }

            if (borrower.economy.wallet < amount) {
                return sock.sendMessage(chatId, { text: 'No tienes suficiente dinero en tu cartera para hacer este pago.' });
            }

            const amountToPay = Math.min(amount, debt.amount);

            borrower.economy.wallet -= amountToPay;
            lender.economy.wallet += amountToPay;
            debt.amount -= amountToPay;

            let responseText = `✅ Has pagado ${amountToPay.toFixed(2)} ${currency} de tu deuda a @${lender.name}.`;

            if (debt.amount <= 0.01) { // Use a small threshold for floating point comparison
                const daysLate = Math.floor((new Date() - new Date(debt.createdAt)) / (1000 * 60 * 60 * 24)) - 7; // Example: 7 days grace period
                if (daysLate > 0) {
                    borrower.paymentHistory.paidLate += 1;
                } else {
                    borrower.paymentHistory.paidOnTime += 1;
                }

                await Debt.findByIdAndDelete(debt._id);
                borrower.debts.pull(debt._id);
                responseText += `\n\n¡Felicidades! Has saldado tu deuda por completo. 🎉`;
            } else {
                await debt.save();
                responseText += `\nDeuda restante: ${debt.amount.toFixed(2)} ${currency}.`;
            }

            await borrower.save();
            await lender.save();

            await sock.sendMessage(chatId, { text: responseText, mentions: [lender.jid, borrower.jid] });
        } catch (error) {
            console.error('Error en el comando pagar:', error);
            sock.sendMessage(chatId, { text: '❌ Ocurrió un error al procesar el pago.' });
        }
    },
};

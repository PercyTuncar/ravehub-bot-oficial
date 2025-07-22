const { findOrCreateUser } = require('../../utils/userUtils');
const { getCurrency } = require('../../utils/groupUtils');
const { handleDebtPayment } = require('../../utils/debtManager');
const User = require('../../models/User');

module.exports = {
    name: 'deposit',
    description: 'Depositar dinero.',
    usage: '.deposit <cantidad>',
    category: 'economy',
    aliases: ['dep', 'depositar'],
    async execute(message, args, client) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

        try {
            let user = await findOrCreateUser(senderJid, chatId, message.pushName);

            if (args.length === 0) {
                return client.sendMessage(chatId, { text: `Uso del comando:\n.deposit <cantidad>\n.deposit all`, mentions: [senderJid] });
            }

            const amountToDepositStr = args[0].toLowerCase();
            let amountToDeposit;

            if (amountToDepositStr === 'all') {
                amountToDeposit = user.economy.wallet;
            }
            else {
                amountToDeposit = parseInt(amountToDepositStr);
                if (isNaN(amountToDeposit) || amountToDeposit <= 0) {
                    return client.sendMessage(chatId, { text: 'Por favor, introduce una cantidad válida para depositar.', mentions: [senderJid] });
                }
            }

            if (user.economy.wallet < amountToDeposit) {
                return client.sendMessage(chatId, { text: `No tienes suficiente dinero en tu cartera. Saldo actual: ${currency} ${user.economy.wallet.toLocaleString()}`, mentions: [senderJid] });
            }
            
            if (amountToDeposit === 0) {
                return client.sendMessage(chatId, { text: 'No tienes dinero en tu cartera para depositar.', mentions: [senderJid] });
            }

            // Operación atómica
            const updatedUser = await User.findOneAndUpdate(
                { _id: user._id, 'economy.wallet': { $gte: amountToDeposit } },
                { $inc: { 'economy.wallet': -amountToDeposit, 'economy.bank': amountToDeposit } },
                { new: true }
            );

            if (!updatedUser) {
                return client.sendMessage(chatId, { text: 'Hubo un error durante el depósito, tus fondos podrían haber cambiado. Inténtalo de nuevo.' });
            }

            let responseText = `✅ @${senderJid.split('@')[0]}, depósito exitoso de *${currency} ${amountToDeposit.toLocaleString()}*.`;
            responseText += `\n\n*Nuevo Balance:*\n> *Cartera:* ${currency} ${updatedUser.economy.wallet.toLocaleString()}\n> *Banco:* ${currency} ${updatedUser.economy.bank.toLocaleString()} 🏦`;

            await client.sendMessage(chatId, { text: responseText, mentions: [senderJid] });

        }
        catch (error) {
            console.error('Error en el comando de depósito:', error);
            await client.sendMessage(chatId, { text: 'Ocurrió un error al procesar tu depósito.' });
        }
    }
};
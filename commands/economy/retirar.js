const { findOrCreateUser } = require('../../utils/userUtils');
const { getCurrency } = require('../../utils/groupUtils');
module.exports = {
    name: 'retirar',
    description: 'Retira 💵 del banco.',
    aliases: ['withdraw', 'retiro'],
    usage: '.retirar <cantidad|all>',
    category: 'economy',
    async execute(message, args, client) {
        const sock = client;
        const jid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

        try {
            const user = await findOrCreateUser(jid, chatId, message.pushName);

            if (args.length === 0) {
                return sock.sendMessage(chatId, { text: `❌ Debes especificar la cantidad a retirar. Uso: `.retirar <cantidad|all>`` });
            }

            const amountToWithdrawStr = args[0].toLowerCase();
            let amountToWithdraw;

            if (user.economy.bank <= 0) {
                return sock.sendMessage(chatId, { text: `🏦 No tienes dinero en tu banco para retirar.` });
            }

            if (amountToWithdrawStr === 'all') {
                amountToWithdraw = user.economy.bank;
            } else {
                amountToWithdraw = parseInt(amountToWithdrawStr, 10);
                if (isNaN(amountToWithdraw) || amountToWithdraw <= 0) {
                    return sock.sendMessage(chatId, { text: '❌ Por favor, introduce un número válido para retirar.' });
                }
                if (amountToWithdraw > user.economy.bank) {
                    return sock.sendMessage(chatId, { text: `🏦 No tienes suficiente dinero en el banco. Solo puedes retirar hasta ${currency} ${user.economy.bank.toLocaleString()}.` });
                }
            }

            const updatedUser = await User.findOneAndUpdate(
                { _id: user._id, 'economy.bank': { $gte: amountToWithdraw } },
                { $inc: { 'economy.bank': -amountToWithdraw, 'economy.wallet': amountToWithdraw } },
                { new: true }
            );

            if (!updatedUser) {
                return sock.sendMessage(chatId, { text: 'Hubo un error durante el retiro, tus fondos podrían haber cambiado. Inténtalo de nuevo.' });
            }

            const successMessage = `✅ Has retirado *${currency} ${amountToWithdraw.toLocaleString()}* de tu banco.\n\n*Balance actual:*\r\n> *Cartera:* ${currency} ${updatedUser.economy.wallet.toLocaleString()}\n> *Banco:* ${currency} ${updatedUser.economy.bank.toLocaleString()}`;
            await sock.sendMessage(chatId, { text: successMessage });

        } catch (error) {
            console.error('Error en el comando retirar:', error);
            await sock.sendMessage(chatId, { text: '⚙️ Ocurrió un error al procesar tu retiro.' });
        }
    }
};
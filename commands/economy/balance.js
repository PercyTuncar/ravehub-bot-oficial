const { findOrCreateUser } = require('../../utils/userUtils');
const { getCurrency } = require('../../utils/groupUtils');

module.exports = {
    name: 'balance',
    description: 'Ver tu saldo actual.',
    aliases: ['bal', 'saldo'],
    usage: '.balance',
    category: 'economy',
    async execute(message, args, client) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            const user = await findOrCreateUser(senderJid, chatId, message.pushName);
            const currency = await getCurrency(chatId);

            const balanceMessage = `*╭───≽ 💰 TU BALANCE ≼───*\n*│*\n*│* 👤 @${senderJid.split('@')[0]}\n*│* 💵 *Cartera:* ${currency} ${user.economy.wallet.toLocaleString()}\n*│* 🏦 *Banco:* ${currency} ${user.economy.bank.toLocaleString()}\n*│*\n*│* 💰 *Total:* ${currency} ${(user.economy.wallet + user.economy.bank).toLocaleString()}\n*╰─────────────≽*`;

            client.sendMessage(chatId, {
                text: balanceMessage,
                mentions: [senderJid]
            });
        } catch (error) {
            console.error('Error en el comando balance:', error);
            client.sendMessage(chatId, { text: '❌ Ocurrió un error al consultar tu balance.' });
        }
    },
};

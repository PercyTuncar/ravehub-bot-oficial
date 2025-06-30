const { findOrCreateUser } = require('../../utils/userUtils');
const { getCurrency } = require('../../utils/groupUtils');

module.exports = {
    name: 'balance',
    description: 'Ver tu saldo actual.',
    aliases: ['bal', 'saldo'],
    usage: '.balance',
    category: 'economy',
    async execute(sock, message) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            const user = await findOrCreateUser(senderJid, message.pushName);
            const currency = await getCurrency(chatId);

            const balanceMessage = `*╭───≽ 💰 BALANCE ≼───*\n*│*\n*│* 👤 *Usuario:* @${senderJid.split('@')[0]}\n*│*\n*│* 💵 *Cartera:* ${user.economy.wallet} ${currency}\n*│* 🏦 *Banco:* ${user.economy.bank} ${currency}\n*│*\n*╰──────────≽*`;

            sock.sendMessage(chatId, { text: balanceMessage, mentions: [senderJid] });
        } catch (error) {
            console.error('Error en el comando balance:', error);
            sock.sendMessage(chatId, { text: '❌ Ocurrió un error al consultar tu balance.' });
        }
    },
};

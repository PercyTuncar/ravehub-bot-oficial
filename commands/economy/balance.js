const { findOrCreateUser } = require('../../utils/userUtils');

module.exports = {
    name: 'balance',
    description: 'Muestra tu balance de economía.',
    usage: '.balance',
    category: 'economy',
    async execute(sock, message) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            // Refactorización: Usar la función centralizada para obtener el usuario.
            const user = await findOrCreateUser(senderJid, message.pushName);

            const balanceMessage = `*╭───≽ 💰 BALANCE ≼───*\n*│*\n*│* 👤 *Usuario:* @${senderJid.split('@')[0]}\n*│*\n*│* 💵 *Cartera:* ${user.economy.wallet} 💵\n*│* 🏦 *Banco:* ${user.economy.bank} 💵\n*│*\n*╰──────────≽*`;

            sock.sendMessage(chatId, { text: balanceMessage, mentions: [senderJid] });
        } catch (error) {
            console.error('Error en el comando balance:', error);
            sock.sendMessage(chatId, { text: '❌ Ocurrió un error al consultar tu balance.' });
        }
    },
};

const User = require('../../models/User');

module.exports = {
    name: 'balance',
    description: 'Muestra tu balance de economía.',
    category: 'economy',
    async execute(sock, message) {
        const jid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            let user = await User.findOne({ jid });

            if (!user) {
                user = new User({
                    jid,
                    name: message.pushName || 'Usuario Desconocido',
                });
                await user.save();
            }

            const balanceMessage = `*╭───≽ 💰 BALANCE ≼───*\n*│*\n*│* 👤 *Usuario:* @${jid.split("@")[0]}\n*│*\n*│* 💵 *Cartera:* $${user.economy.wallet}\n*│* 🏦 *Banco:* $${user.economy.bank}\n*│*\n*╰──────────≽*`;

            await sock.sendMessage(chatId, {
                text: balanceMessage,
                mentions: [jid]
            });

        } catch (error) {
            console.error('Error al obtener el balance:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al obtener tu balance.' });
        }
    }
};

const User = require('../../models/User');
const Economy = require('../../models/Economy');

module.exports = {
    name: 'me',
    description: 'Muestra tu perfil.',
    category: 'utility',
    async execute(sock, message) {
        const userId = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const senderName = message.pushName || 'Usuario Desconocido';

        try {
            let user = await User.findOne({ userId });
            let economy = await Economy.findOne({ userId });

            if (!user) {
                user = new User({
                    userId: userId,
                    name: senderName
                });
                await user.save();
            }

            if (!economy) {
                economy = new Economy({ userId });
                await economy.save();
            }

            const profileMessage =
`*╭───≽ PERFIL DE USUARIO ≼───*
*│*
*│* 👤 *Usuario:* @${userId.split('@')[0]}
*│* 💼 *Nombre:* ${user.name}
*│*
*│* ╭─≽ ECONOMÍA ≼
*│* │ 💵 *Cartera:* ${economy.wallet}
*│* │ 🏦 *Banco:* ${economy.bank}/${economy.bankCapacity}
*│* ╰──────────≽
*│*
*╰──────────≽*`;

            await sock.sendMessage(chatId, {
                text: profileMessage,
                mentions: [userId]
            });

        } catch (error) {
            console.error('Error al obtener el perfil:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al obtener tu perfil.' });
        }
    }
};

const User = require('../../models/User');
const Economy = require('../../models/Economy');

module.exports = {
    name: 'balance',
    description: 'Muestra tu balance de economía.',
    category: 'economy',
    async execute(sock, message) {
        const userId = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const senderName = message.pushName || 'Usuario Desconocido';

        try {
            let user = await User.findOne({ userId });
            let economy = await Economy.findOne({ userId });

            if (!user) {
                user = new User({ userId, name: senderName });
                await user.save();
            }
            if (!economy) {
                economy = new Economy({ userId });
                await economy.save();
            }

            const balanceMessage = `*Balance de* @${userId.split('@')[0]}\n\nCartera: ${economy.wallet}\nBanco: ${economy.bank}`;
            
            await sock.sendMessage(chatId, { 
                text: balanceMessage,
                mentions: [userId] 
            });

        } catch (error) {
            console.error('Error al obtener el balance:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al obtener tu balance.' });
        }
    }
};

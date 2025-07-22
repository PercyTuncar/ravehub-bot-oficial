const User = require('../../models/User');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'divorcio',
    description: 'Termina una relación activa.',
    category: 'love',
    aliases: ['divorce', 'separar'],
    async execute(message, args) {
        const sock = getSocket();
        const from = message.key.remoteJid;
        const userJid = message.key.participant || message.key.remoteJid;

        try {
            const user = await User.findOne({ jid: userJid });

            if (!user || user.loveInfo.relationshipStatus !== 'En una relación') {
                return sock.sendMessage(from, { text: 'No estás en una relación para poder divorciarte.' }, { quoted: message });
            }

            const partnerJid = user.loveInfo.partnerJid;
            const partner = await User.findOne({ jid: partnerJid });

            const currentDate = new Date();

            // Actualizar historial del usuario
            const userLoveHistory = user.loveInfo.loveHistory.find(h => h.endDate === null);
            if (userLoveHistory) {
                userLoveHistory.endDate = currentDate;
            }

            user.loveInfo.relationshipStatus = 'Soltero/a';
            user.loveInfo.partnerId = null;
            user.loveInfo.partnerJid = null;

            // Actualizar historial de la pareja
            if (partner) {
                const partnerLoveHistory = partner.loveInfo.loveHistory.find(h => h.endDate === null);
                if (partnerLoveHistory) {
                    partnerLoveHistory.endDate = currentDate;
                }
                partner.loveInfo.relationshipStatus = 'Soltero/a';
                partner.loveInfo.partnerId = null;
                partner.loveInfo.partnerJid = null;
                await partner.save();
            }
            
            await user.save();

            const text = `💔 @${userJid.split('@')[0]} ha terminado su relación con @${partnerJid.split('@')[0]}.
Que cada uno encuentre su camino... 😔`;
            
            sock.sendMessage(from, { text, mentions: [userJid, partnerJid] });

        } catch (error) {
            console.error('Error en el comando divorcio:', error);
            sock.sendMessage(from, { text: 'Ocurrió un error al procesar el divorcio.' }, { quoted: message });
        }
    }
};

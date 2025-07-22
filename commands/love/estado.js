const User = require('../../models/User');
const moment = require('moment');
const { findOrCreateUser } = require('../../utils/userUtils');

module.exports = {
    name: 'estado',
    description: 'Muestra tu estado sentimental.',
    category: 'love',
    aliases: ['status', 'mystatus'],
    async execute(message, args, client) {
        const from = message.key.remoteJid;
        const userJid = message.key.participant || message.key.remoteJid;

        try {
            const groupMetadata = await client.groupMetadata(from);
            const userInfo = groupMetadata.participants.find(p => p.id === userJid);
            const user = await findOrCreateUser(userJid, from, userInfo.name || userJid.split('@')[0]);

            if (!user) {
                return client.sendMessage(from, { text: 'No se encontró tu perfil.' }, { quoted: message });
            }

            let response = '';
            const mentions = [userJid];

            if (user.loveInfo.relationshipStatus === 'En una relación' && user.loveInfo.partnerJid) {
                const partner = await User.findOne({ jid: user.loveInfo.partnerJid });
                const startDate = user.loveInfo.loveHistory.find(h => h.endDate === null)?.startDate;
                response = `❤️ Tu estado: En una relación con @${partner.jid.split('@')[0]} (desde ${moment(startDate).format('YYYY-MM-DD')})`;
                mentions.push(partner.jid);
            } else {
                response = '❤️ Tu estado: Soltero/a';
            }

            client.sendMessage(from, { text: response, mentions });

        } catch (error) {
            console.error('Error en el comando estado:', error);
            client.sendMessage(from, { text: 'Ocurrió un error al obtener tu estado.' }, { quoted: message });
        }
    }
};

const User = require('../../models/User');
const { getSocket } = require('../../bot');
const moment = require('moment');

module.exports = {
    name: 'estado',
    description: 'Muestra tu estado sentimental.',
    aliases: ['status'],
    async execute(message, args) {
        const sock = getSocket();
        const from = message.key.remoteJid;
        const userJid = message.key.participant || message.key.remoteJid;

        try {
            const user = await User.findOne({ jid: userJid });

            if (!user) {
                return sock.sendMessage(from, { text: 'No se encontró tu perfil.' }, { quoted: message });
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

            sock.sendMessage(from, { text: response, mentions });

        } catch (error) {
            console.error('Error en el comando estado:', error);
            sock.sendMessage(from, { text: 'Ocurrió un error al obtener tu estado.' }, { quoted: message });
        }
    }
};

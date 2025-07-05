const User = require('../../models/User');
const { getSocket } = require('../../bot');
const { getMentions } = require('../../utils/messageUtils');
const { findOrCreateUser } = require('../../utils/userUtils');
const moment = require('moment');

module.exports = {
    name: 'historial',
    description: 'Muestra el historial de relaciones de un usuario.',
    category: 'love',
    aliases: ['lovehistory'],
    async execute(message, args) {
        const sock = getSocket();
        const from = message.key.remoteJid;
        
        const mentions = await getMentions(message);
        const targetJid = mentions.length > 0 ? mentions[0] : (message.key.participant || message.key.remoteJid);

        try {
            const groupMetadata = await sock.groupMetadata(from);
            const targetInfo = groupMetadata.participants.find(p => p.id === targetJid);
            const user = await findOrCreateUser(targetJid, from, targetInfo.name || targetJid.split('@')[0]);

            if (!user) {
                return sock.sendMessage(from, { text: 'No se encontró el perfil de este usuario.' }, { quoted: message });
            }

            let response = `📖 HISTORIAL DE RELACIONES DE @${user.name}:\n\n`;

            if (user.loveInfo.relationshipStatus === 'En una relación' && user.loveInfo.partnerJid) {
                const partner = await User.findOne({ jid: user.loveInfo.partnerJid });
                const startDate = user.loveInfo.loveHistory.find(h => h.endDate === null)?.startDate;
                response += `❤️ Estado actual: En una relación con @${partner.name} (desde ${moment(startDate).format('YYYY-MM-DD')})\n\n`;
            } else {
                response += '❤️ Estado actual: Soltero/a\n';
            }

            const pastRelationships = user.loveInfo.loveHistory.filter(h => h.endDate !== null);

            if (pastRelationships.length > 0) {
                response += '📜 Relaciones pasadas:\n';
                pastRelationships.forEach(rel => {
                    response += `- @${rel.partnerName} (${moment(rel.startDate).format('YYYY-MM-DD')} a ${moment(rel.endDate).format('YYYY-MM-DD')})\n`;
                });
            }

            sock.sendMessage(from, { text: response, mentions: [targetJid] });

        } catch (error) {
            console.error('Error en el comando historial:', error);
            sock.sendMessage(from, { text: 'Ocurrió un error al obtener el historial.' }, { quoted: message });
        }
    }
};

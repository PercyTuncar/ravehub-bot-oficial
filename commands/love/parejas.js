const User = require('../../models/User');
const moment = require('moment');

module.exports = {
    name: 'parejas',
    description: 'Lista todas las parejas activas del grupo.',
    category: 'love',
    aliases: ['couples', 'relaciones'],
    async execute(message, args, client) {
        const from = message.key.remoteJid;

        try {
            const couples = await User.find({ 'loveInfo.relationshipStatus': 'En una relación' }).populate('loveInfo.partnerId');

            if (couples.length === 0) {
                return client.sendMessage(from, { text: 'No hay parejas en este grupo.' }, { quoted: message });
            }

            let response = '💑 PAREJAS OFICIALES DEL GRUPO:\n\n';
            const mentionedJids = [];
            const processedJids = new Set();

            couples.forEach(user => {
                if (processedJids.has(user.jid)) return;

                const partner = user.loveInfo.partnerId;
                if (partner && !processedJids.has(partner.jid)) {
                    const startDate = user.loveInfo.loveHistory.find(h => h.endDate === null)?.startDate;
                    response += `1. @${user.jid.split('@')[0]} + @${partner.jid.split('@')[0]} (desde ${moment(startDate).format('YYYY-MM-DD')})\n`;
                    mentionedJids.push(user.jid, partner.jid);
                    processedJids.add(user.jid);
                    processedJids.add(partner.jid);
                }
            });

            client.sendMessage(from, { text: response, mentions: mentionedJids });

        } catch (error) {
            console.error('Error en el comando parejas:', error);
            client.sendMessage(from, { text: 'Ocurrió un error al listar las parejas.' }, { quoted: message });
        }
    }
};

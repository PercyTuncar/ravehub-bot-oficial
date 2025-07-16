const User = require('../../models/User');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'inactivos',
    description: 'Menciona a los miembros inactivos (solo para admins).',
    category: 'admin',
    async execute(m, args) {
        const sock = getSocket();
        const chatId = m.key.remoteJid;
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { text: 'Este comando solo se puede usar en grupos.' }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const senderId = m.key.participant;
        
        const participant = groupMetadata.participants.find(p => p.id === senderId);

        if (!participant || !participant.admin) {
            return sock.sendMessage(chatId, { text: 'Este comando es solo para administradores del grupo.' }, { quoted: m });
        }

        const allParticipantJids = groupMetadata.participants.map(p => p.id);
        
        // Find users in the DB for this group who have interacted (bank > 0)
        const activeUsers = await User.find({ groupId: chatId, 'economy.bank': { $gt: 0 } });
        const activeUserJids = activeUsers.map(u => u.jid);

        // Inactive jids are all participants minus active users
        const inactiveJids = allParticipantJids.filter(jid => !activeUserJids.includes(jid));

        if (inactiveJids.length === 0) {
            return sock.sendMessage(chatId, { text: 'No hay miembros inactivos en este grupo.' }, { quoted: m });
        }

        let mentions = [];
        let mentionsText = '😴 ';
        for (const jid of inactiveJids) {
            mentions.push(jid);
            mentionsText += `@${jid.split('@')[0]} `;
        }

        const messageText = `¿Siguen dormidos? ¡La ciudad está viva y ustedes no existen aún!  
Activen su perfil con \`.iniciar\` o serán considerados fantasmas 👻  
No te quedes mirando. Empieza tu historia ahora. 💥`;

        const text = `${messageText}\n\n${mentionsText.trim()}`;

        await sock.sendMessage(chatId, { text, mentions }, { quoted: m });
    },
};

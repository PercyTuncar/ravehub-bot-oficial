const User = require('../../models/User');

module.exports = {
    name: 'inactivos',
    description: 'Menciona a los miembros inactivos (solo para admins).',
    category: 'admin',
    async execute(sock, m, args) {
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

        const allUsersInGroup = await User.find({ groupId: chatId });
        const activeUserJids = allUsersInGroup.map(u => u.jid);

        const allParticipantJids = groupMetadata.participants.map(p => p.id);
        
        const inactiveJids = allParticipantJids.filter(jid => !activeUserJids.includes(jid));

        if (inactiveJids.length === 0) {
            return sock.sendMessage(chatId, { text: 'No hay miembros inactivos en este grupo.' }, { quoted: m });
        }

        let mentions = [];
        let text = '😴 ';
        for (const jid of inactiveJids) {
            mentions.push(jid);
            text += `@${jid.split('@')[0]} `;
        }

        text += `\n\n¿Siguen dormidos? ¡La ciudad está viva y ustedes no existen aún!  
Activen su perfil con \`.iniciar\` o serán considerados fantasmas 👻  
No te quedes mirando. Empieza tu historia ahora. 💥`;

        await sock.sendMessage(chatId, { text, mentions }, { quoted: m });
    },
};

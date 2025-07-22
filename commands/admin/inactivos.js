const User = require('../../models/User');

module.exports = {
    name: 'inactivos',
    description: 'Menciona a los miembros inactivos (solo para admins).',
    aliases: ['inactive', 'fantasmas'],
    category: 'admin',
    async execute(message, args, client) {
        const chatId = message.key.remoteJid;
        if (!chatId.endsWith('@g.us')) {
            return client.sendMessage(chatId, { text: 'Este comando solo se puede usar en grupos.' }, { quoted: message });
        }

        const groupMetadata = await client.groupMetadata(chatId);
        const senderId = message.key.participant;
        
        const participant = groupMetadata.participants.find(p => p.id === senderId);

        if (!participant || !participant.admin) {
            return client.sendMessage(chatId, { text: 'Este comando es solo para administradores del grupo.' }, { quoted: message });
        }

        const allParticipantJids = groupMetadata.participants.map(p => p.id);
        
        // Find users in the DB for this group who have interacted (bank > 0)
        const activeUsers = await User.find({ groupId: chatId, 'economy.bank': { $gt: 0 } });
        const activeUserJids = activeUsers.map(u => u.jid);

        // Inactive jids are all participants minus active users
        const inactiveJids = allParticipantJids.filter(jid => !activeUserJids.includes(jid));

        if (inactiveJids.length === 0) {
            return client.sendMessage(chatId, { text: 'No hay miembros inactivos en este grupo.' }, { quoted: message });
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

        await client.sendMessage(chatId, { text, mentions }, { quoted: message });
    },
};

const User = require('../../models/User');

module.exports = {
    name: 'inactivos',
    description: 'Menciona a los miembros inactivos (solo para admins).',
    category: 'admin',
    async execute(message, args, client) {
        const chat = await message.getChat();
        if (!chat.isGroup) {
            return message.reply('Este comando solo se puede usar en grupos.');
        }

        const author = await message.getContact();
        const authorId = author.id._serialized;
        const participant = chat.participants.find(p => p.id._serialized === authorId);

        if (!participant || !participant.isAdmin) {
            return message.reply('Este comando es solo para administradores del grupo.');
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const allUsersInGroup = await User.find({ groupId: chat.id._serialized });
        const activeUserJids = allUsersInGroup.map(u => u.jid);

        const allParticipantJids = chat.participants.map(p => p.id._serialized);
        
        const inactiveJids = allParticipantJids.filter(jid => !activeUserJids.includes(jid));

        if (inactiveJids.length === 0) {
            return message.reply('No hay miembros inactivos en este grupo.');
        }

        let mentions = [];
        let text = '😴 ';
        for (const jid of inactiveJids) {
            const contact = await client.getContactById(jid);
            mentions.push(contact);
            text += `@${contact.id.user} `;
        }

        text += `\n\n¿Siguen dormidos? ¡La ciudad está viva y ustedes no existen aún!  
Activen su perfil con \`.iniciar\` o serán considerados fantasmas 👻  
No te quedes mirando. Empieza tu historia ahora. 💥`;

        await chat.sendMessage(text, { mentions });
    },
};

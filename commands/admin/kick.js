const { sock } = require('../../index');

module.exports = {
    name: 'kick',
    description: 'Expulsar a un miembro.',
    aliases: ['ban', 'expulsar'],
    usage: '.kick @usuario',
    category: 'admin',
    async execute(sock, message, args) {
        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;

        // Verificar si el comando se usa en un grupo
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { text: 'Este comando solo se puede usar en grupos.' });
        }

        // Obtener metadatos del grupo para verificar permisos
        const groupMetadata = await sock.groupMetadata(chatId);
        const sender = groupMetadata.participants.find(p => p.id === senderId);

        // Verificar si el que ejecuta el comando es administrador
        if (sender.admin !== 'admin' && sender.admin !== 'superadmin') {
            return sock.sendMessage(chatId, { text: 'No tienes permisos de administrador para usar este comando.' });
        }

        // Verificar si se mencionó a alguien
        if (!message.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
            return sock.sendMessage(chatId, { text: 'Debes mencionar a uno o más usuarios para expulsarlos. Ejemplo: .kick @usuario1 @usuario2' });
        }

        const mentions = message.message.extendedTextMessage.contextInfo.mentionedJid;
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        // Verificar si el bot tiene permisos de administrador
        const bot = groupMetadata.participants.find(p => p.id === botId);
        if (!bot || (bot.admin !== 'admin' && bot.admin !== 'superadmin')) {
            return sock.sendMessage(chatId, { text: 'Necesito ser administrador en este grupo para poder expulsar usuarios.' });
        }

        const kickedUsers = [];
        const failedToKick = [];

        for (const mentionedId of mentions) {
            // No se puede expulsar al dueño del grupo o a otros administradores
            const target = groupMetadata.participants.find(p => p.id === mentionedId);
            if (target && (target.admin === 'admin' || target.admin === 'superadmin')) {
                failedToKick.push(mentionedId);
                continue;
            }
            
            try {
                await sock.groupParticipantsUpdate(chatId, [mentionedId], 'remove');
                kickedUsers.push(mentionedId);
            } catch (error) {
                console.error(`Error al expulsar a ${mentionedId}:`, error);
                failedToKick.push(mentionedId);
            }
        }

        let responseText = '';
        if (kickedUsers.length > 0) {
            responseText += `✅ Se ha expulsado a ${kickedUsers.map(u => `@${u.split('@')[0]}`).join(', ')}.\n`;
        }
        if (failedToKick.length > 0) {
            responseText += `❌ No se pudo expulsar a ${failedToKick.map(u => `@${u.split('@')[0]}`).join(', ')} (quizás son administradores).`;
        }

        if (responseText) {
            await sock.sendMessage(chatId, { 
                text: responseText.trim(),
                mentions: [...kickedUsers, ...failedToKick]
            });
        }
    }
};

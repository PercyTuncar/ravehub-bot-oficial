const User = require('../../models/User');

module.exports = {
    name: 'resetwarns',
    description: 'Resetea las advertencias de un usuario.',
    aliases: ['clearwarns', 'unwarn'],
    async execute(message, args, client) {
        const groupId = message.key.remoteJid;
        const authorId = message.key.participant;

        try {
            // 1. Verificar si el autor es administrador
            const groupMetadata = await client.groupMetadata(groupId);
            const participants = groupMetadata.participants;
            const authorParticipant = participants.find(p => p.id === authorId);

            if (!authorParticipant || !authorParticipant.admin) {
                return client.sendMessage(groupId, { text: 'Este comando solo puede ser usado por administradores del grupo.' }, { quoted: message });
            }

            // 2. Obtener el usuario mencionado
            const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!mentionedJid) {
                return client.sendMessage(groupId, { text: 'Debes mencionar a un usuario para resetear sus advertencias. Ejemplo: .resetwarns @usuario' }, { quoted: message });
            }

            // 3. Encontrar al usuario en el modelo User y resetear sus advertencias
            const user = await User.findOne({ userId: mentionedJid, groupId: groupId });

            if (!user) {
                return client.sendMessage(groupId, { text: 'El usuario mencionado no está registrado en la base de datos.' }, { quoted: message });
            }

            if (user.warnings === 0) {
                return client.sendMessage(groupId, { text: 'El usuario no tiene ninguna advertencia.' }, { quoted: message });
            }

            user.warnings = 0;
            await user.save();

            // 4. Enviar mensaje de confirmación
            const targetName = message.pushName || mentionedJid.split('@')[0];

            await client.sendMessage(groupId, { 
                text: `Se han reseteado las advertencias de @${targetName}.`,
                mentions: [mentionedJid]
            }, { quoted: message });

        } catch (error) {
            console.error('Error en resetwarns:', error);
            client.sendMessage(groupId, { text: 'Ocurrió un error al intentar resetear las advertencias.' }, { quoted: message });
        }
    }
};

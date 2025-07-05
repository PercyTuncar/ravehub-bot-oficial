const User = require('../../models/User');
const { getSocket } = require('../../bot'); // RUTA CORREGIDA

module.exports = {
    name: 'resetwarns',
    description: 'Resetea las advertencias de un usuario.',
    aliases: ['clearwarns', 'unwarn'],
    async execute(message, args, client) {
        const sock = getSocket();
        const groupId = message.key.remoteJid;
        const authorId = message.key.participant;

        try {
            // 1. Verificar si el autor es administrador
            const groupMetadata = await sock.groupMetadata(groupId);
            const participants = groupMetadata.participants;
            const authorParticipant = participants.find(p => p.id === authorId);

            if (!authorParticipant || !authorParticipant.admin) {
                return sock.sendMessage(groupId, { text: 'Este comando solo puede ser usado por administradores del grupo.' });
            }

            // 2. Obtener el usuario mencionado
            const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!mentionedJid) {
                return sock.sendMessage(groupId, { text: 'Debes mencionar a un usuario para resetear sus advertencias. Ejemplo: .resetwarns @usuario' });
            }

            // 3. Encontrar al usuario en el modelo User y resetear sus advertencias
            const user = await User.findOne({ userId: mentionedJid, groupId: groupId });

            if (!user) {
                return sock.sendMessage(groupId, { text: 'El usuario mencionado no está registrado en la base de datos.' });
            }

            if (user.warnings === 0) {
                return sock.sendMessage(groupId, { text: 'El usuario no tiene ninguna advertencia.' });
            }

            user.warnings = 0;
            await user.save();

            // 4. Enviar mensaje de confirmación
            const contact = await sock.getContactById(mentionedJid);
            const targetName = contact.pushname || contact.name || mentionedJid.split('@')[0];

            await sock.sendMessage(groupId, { 
                text: `Se han reseteado las advertencias de @${targetName}.`,
                mentions: [mentionedJid]
            });

        } catch (error) {
            console.error('Error en resetwarns:', error);
            sock.sendMessage(groupId, { text: 'Ocurrió un error al intentar resetear las advertencias.' });
        }
    }
};

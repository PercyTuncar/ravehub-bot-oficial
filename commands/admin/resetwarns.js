const User = require('../../models/User');
const GroupSettings = require('../../models/GroupSettings');
const { getSocket } = require('../../handlers/eventHandler'); // Importar getSocket

module.exports = {
    name: 'resetwarns',
    description: 'Resetea las advertencias de un usuario.',
    aliases: ['clearwarns', 'unwarn'],
    async execute(message, args, client) {
        const sock = getSocket(); // Obtener el socket correctamente
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

            // 3. Encontrar la configuración del grupo
            const groupSettings = await GroupSettings.findOne({ groupId });
            if (!groupSettings || !groupSettings.warnings || !groupSettings.warnings.has(mentionedJid)) {
                return sock.sendMessage(groupId, { text: 'El usuario mencionado no tiene ninguna advertencia.' });
            }

            const currentWarnings = groupSettings.warnings.get(mentionedJid);
            if (currentWarnings === 0) {
                return sock.sendMessage(groupId, { text: 'El usuario ya tiene 0 advertencias.' });
            }

            // 4. Resetear las advertencias y guardar
            groupSettings.warnings.set(mentionedJid, 0);
            await groupSettings.save();

            // 5. Enviar mensaje de confirmación
            const targetUser = await sock.getContactById(mentionedJid);
            const targetName = targetUser.pushname || targetUser.name || mentionedJid.split('@')[0];
            
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

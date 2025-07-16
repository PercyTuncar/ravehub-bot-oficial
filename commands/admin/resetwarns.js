const User = require('../../models/User');
const { getSocket } = require('../../bot'); // RUTA CORREGIDA

module.exports = {
    name: 'resetwarns',
    description: 'Resetea las advertencias de un usuario.',
    aliases: ['clearwarns', 'unwarn'],
    async execute(sock, m, args) {
        const groupId = m.key.remoteJid;
        const authorId = m.key.participant;

        try {
            // 1. Verificar si el autor es administrador
            const groupMetadata = await sock.groupMetadata(groupId);
            const participants = groupMetadata.participants;
            const authorParticipant = participants.find(p => p.id === authorId);

            if (!authorParticipant || !authorParticipant.admin) {
                return sock.sendMessage(groupId, { text: 'Este comando solo puede ser usado por administradores del grupo.' }, { quoted: m });
            }

            // 2. Obtener el usuario mencionado
            const mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!mentionedJid) {
                return sock.sendMessage(groupId, { text: 'Debes mencionar a un usuario para resetear sus advertencias. Ejemplo: .resetwarns @usuario' }, { quoted: m });
            }

            // 3. Encontrar al usuario en el modelo User y resetear sus advertencias
            const user = await User.findOne({ userId: mentionedJid, groupId: groupId });

            if (!user) {
                return sock.sendMessage(groupId, { text: 'El usuario mencionado no está registrado en la base de datos.' }, { quoted: m });
            }

            if (user.warnings === 0) {
                return sock.sendMessage(groupId, { text: 'El usuario no tiene ninguna advertencia.' }, { quoted: m });
            }

            user.warnings = 0;
            await user.save();

            // 4. Enviar mensaje de confirmación
            const targetName = m.pushName || mentionedJid.split('@')[0];

            await sock.sendMessage(groupId, { 
                text: `Se han reseteado las advertencias de @${targetName}.`,
                mentions: [mentionedJid]
            }, { quoted: m });

        } catch (error) {
            console.error('Error en resetwarns:', error);
            sock.sendMessage(groupId, { text: 'Ocurrió un error al intentar resetear las advertencias.' }, { quoted: m });
        }
    }
};

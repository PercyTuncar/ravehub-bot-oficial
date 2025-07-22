const GroupSettings = require('../../models/GroupSettings');
const { isAdmin } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'welcome',
    description: 'Configura un mensaje de bienvenida.',
    aliases: ['bienvenida', 'setwelcome'],
    category: 'admin',
    cooldown: 5,
    async execute(message, args) {
        const sock = getSocket();
        const { remoteJid } = message.key;
        const isGroup = remoteJid.endsWith('@g.us');

        if (!isGroup) {
            return sock.sendMessage(remoteJid, { text: 'Este comando solo puede usarse en grupos.' });
        }

        const senderId = message.key.participant || message.key.remoteJid;
        const groupAdmins = await isAdmin(remoteJid, senderId);
        if (!groupAdmins) {
            return sock.sendMessage(remoteJid, { text: 'Solo los administradores del grupo pueden usar este comando.' });
        }

        const welcomeMessage = args.join(' ');
        if (!welcomeMessage) {
            return sock.sendMessage(remoteJid, { text: 'Debes proporcionar un mensaje de bienvenida. Ejemplo: .welcome ¡Bienvenido @user a @group! Ahora somos @count miembros.' });
        }

        try {
            let groupSettings = await GroupSettings.findOne({ groupId: remoteJid });
            if (!groupSettings) {
                groupSettings = new GroupSettings({ groupId: remoteJid });
            }

            groupSettings.welcomeMessage = welcomeMessage;
            // Por ahora, la imagen se puede manejar como una URL en el mensaje.
            // Una mejora futura podría ser procesar una imagen adjunta.
            const urlRegex = /(https?:\/\/[^\s]+)/;
            const match = welcomeMessage.match(urlRegex);
            if (match) {
                groupSettings.welcomeImage = match[0];
            }

            await groupSettings.save();
            sock.sendMessage(remoteJid, { text: '✅ Mensaje de bienvenida configurado exitosamente para este grupo.' });
        } catch (error) {
            console.error('Error al configurar el mensaje de bienvenida:', error);
            sock.sendMessage(remoteJid, { text: 'Hubo un error al guardar la configuración. Inténtalo de nuevo.' });
        }
    },
};

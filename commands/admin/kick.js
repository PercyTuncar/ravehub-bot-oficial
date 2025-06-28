const { sock } = require('../../index');

module.exports = {
    name: 'kick',
    description: 'Expulsa a un usuario del grupo.',
    category: 'admin',
    adminOnly: true,
    async execute(message, args) {
        const chatId = message.key.remoteJid;
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { text: 'Este comando solo se puede usar en grupos.' });
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const sender = groupMetadata.participants.find(p => p.id === message.key.participant);

        if (sender.admin !== 'admin' && sender.admin !== 'superadmin') {
            return this.sock.sendMessage(chatId, { text: 'No tienes permisos para usar este comando.' });
        }

        const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (!mentionedJid.length) {
            return this.sock.sendMessage(chatId, { text: 'Debes mencionar a un usuario para expulsarlo.' });
        }

        try {
            for (const mentionedId of mentionedJid) {
                await this.sock.groupParticipantsUpdate(chatId, [mentionedId], 'remove');
            }
            this.sock.sendMessage(chatId, { text: 'Usuarios expulsados correctamente.' });
        } catch (error) {
            console.error('Error al expulsar usuarios:', error);
            this.sock.sendMessage(chatId, { text: 'Ocurrió un error al intentar expulsar a los usuarios.' });
        }
    }
};

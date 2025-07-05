const User = require('../../models/User');
const { isAdmin, getMutedRole } = require('../../utils/groupUtils');

module.exports = {
    name: 'resetwarns',
    description: 'Resetea las advertencias de un usuario.',
    aliases: ['clearwarns', 'unwarn'],
    async execute(message, args, client) {
        const authorId = message.author || message.from;
        const groupId = message.to;
        const isAuthorAdmin = await isAdmin(authorId, groupId, client);

        if (!isAuthorAdmin) {
            return message.reply('Este comando solo puede ser usado por administradores del grupo.');
        }

        const mentionedUsers = message.mentionedIds;
        if (!mentionedUsers || mentionedUsers.length === 0) {
            return message.reply('Debes mencionar a un usuario para resetear sus advertencias. Ejemplo: .resetwarns @usuario');
        }

        const targetId = mentionedUsers[0];

        try {
            let user = await User.findOne({ userId: targetId });

            if (!user) {
                return message.reply('El usuario mencionado no está registrado en la base de datos.');
            }

            if (user.warnings === 0) {
                return message.reply('El usuario no tiene ninguna advertencia.');
            }

            user.warnings = 0;
            await user.save();

            const contact = await client.getContactById(targetId);
            message.reply(`Se han reseteado las advertencias de @${contact.pushname}.`);

        } catch (error) {
            console.error('Error al resetear las advertencias:', error);
            message.reply('Ocurrió un error al intentar resetear las advertencias.');
        }
    }
};

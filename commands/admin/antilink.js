const { findOrCreateGroup, getGroupSettings, clearGroupSettingsCache } = require('../../utils/groupUtils');

module.exports = {
    name: 'antilink',
    description: 'Activa o desactiva la función anti-link en este grupo.',
    aliases: ['anti-link', 'nolinks'],
    category: 'admin',
    usage: '.antilink <on|off>',
    async execute(message, args, client) {
        const chatId = message.key.remoteJid;
        const jid = message.key.participant;

        if (!chatId.endsWith('@g.us')) {
            return client.sendMessage(chatId, { text: 'Este comando solo se puede usar en grupos.' });
        }

        const groupMetadata = await client.groupMetadata(chatId);
        const admins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        if (!admins.includes(jid)) {
            return client.sendMessage(chatId, { text: '🚫 No tienes permisos de administrador para usar este comando.' });
        }

        const option = args[0]?.toLowerCase();
        if (option !== 'on' && option !== 'off') {
            return client.sendMessage(chatId, { text: `❌ Uso incorrecto. Ejemplo: .antilink on` });
        }

        try {
            const group = await findOrCreateGroup(chatId);
            group.antiLinkEnabled = (option === 'on');
            await group.save();

            // Limpiar el caché para este grupo
            clearGroupSettingsCache(chatId);

            const status = option === 'on' ? '✅ Activado' : '❌ Desactivado';
            await client.sendMessage(chatId, { text: `La función anti-link ha sido configurada en: ${status}` });

        } catch (error) {
            console.error('Error al configurar el anti-link:', error);
            await client.sendMessage(chatId, { text: 'Ocurrió un error al actualizar la configuración.' });
        }
    },
};

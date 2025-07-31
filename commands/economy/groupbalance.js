const User = require('../../models/User');
const { getCurrency } = require('../../utils/groupUtils');

module.exports = {
    name: 'groupbalance',
    description: 'Muestra el balance de todos los miembros del grupo (solo para admins).',
    aliases: ['saldosgrupo', 'balancetotal'],
    usage: '.groupbalance',
    category: 'economy',
    async execute(message, args, client) {
        const chatId = message.key.remoteJid;
        const senderJid = message.key.participant || message.key.remoteJid;

        try {
            // 1. Verificar si es un grupo
            if (!chatId.endsWith('@g.us')) {
                return client.sendMessage(chatId, { text: 'Este comando solo se puede usar en grupos.' });
            }

            // 2. Verificar si el remitente es administrador
            const groupMetadata = await client.groupMetadata(chatId);
            const sender = groupMetadata.participants.find(p => p.id === senderJid);
            if (sender.admin !== 'admin' && sender.admin !== 'superadmin') {
                return client.sendMessage(chatId, { text: '❌ No tienes permisos de administrador para usar este comando.' });
            }

            // 3. Obtener datos de la base de datos
            const currency = await getCurrency(chatId);
            const usersInGroup = await User.find({ 'groups.chatId': chatId });

            if (!usersInGroup || usersInGroup.length === 0) {
                return client.sendMessage(chatId, { text: 'No se encontraron usuarios registrados para este grupo.' });
            }

            // 4. Procesar y ordenar los datos
            const userBalances = usersInGroup.map(user => {
                const total = (user.economy.wallet || 0) + (user.economy.bank || 0);
                return {
                    jid: user.jid,
                    name: user.name,
                    wallet: user.economy.wallet || 0,
                    bank: user.economy.bank || 0,
                    total: total
                };
            }).sort((a, b) => b.total - a.total);

            // 5. Construir y enviar el mensaje
            let responseText = `*💰 Balance Total del Grupo 💰*\n\n_Lista de usuarios ordenados por su riqueza total._\n\n`;
            const mentions = [];

            userBalances.forEach((user, index) => {
                responseText += `*${index + 1}. @${user.jid.split('@')[0]}*\n`;
                responseText += `   *Cartera:* ${currency} ${user.wallet.toLocaleString()}\n`;
                responseText += `   *Banco:*    ${currency} ${user.bank.toLocaleString()}\n`;
                responseText += `   *Total:*    ${currency} ${user.total.toLocaleString()}\n\n`;
                mentions.push(user.jid);
            });

            if (mentions.length === 0) {
                 return client.sendMessage(chatId, { text: 'No hay usuarios con saldos para mostrar en este grupo.' });
            }

            await client.sendMessage(chatId, {
                text: responseText.trim(),
                mentions: mentions
            });

        } catch (error) {
            console.error('Error en el comando groupbalance:', error);
            await client.sendMessage(chatId, { text: '⚙️ Ocurrió un error al obtener los balances del grupo.' });
        }
    }
};
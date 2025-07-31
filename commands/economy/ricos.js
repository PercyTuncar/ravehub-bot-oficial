const User = require('../../models/User');
const { getCurrency } = require('../../utils/groupUtils');

module.exports = {
    name: 'ricos',
    description: 'Muestra el top 10 de los usuarios más ricos del grupo.',
    usage: '.ricos',
    category: 'economy',
    aliases: ['top', 'leaderboard'],
    async execute(message, args, client) {
        const chatId = message.key.remoteJid;

        try {
            const currency = await getCurrency(chatId);
            
            // Consulta corregida para usar la nueva estructura de datos
            const usersInGroup = await User.find({ 'groups.chatId': chatId });

            if (usersInGroup.length === 0) {
                return client.sendMessage(chatId, { text: 'Aún no hay usuarios registrados en este grupo para mostrar un ranking.' });
            }

            // Calcular el valor neto y ordenar
            const rankedUsers = usersInGroup.map(user => ({
                jid: user.jid,
                name: user.name,
                netWorth: (user.economy.wallet || 0) + (user.economy.bank || 0)
            }))
            .sort((a, b) => b.netWorth - a.netWorth)
            .slice(0, 10);

            if (rankedUsers.length === 0) {
                return client.sendMessage(chatId, { text: 'No hay usuarios con saldos para mostrar en este grupo.' });
            }

            // Construir el mensaje del ranking
            const mentions = [];
            let rankingMessage = `*♛ TOP 10 RICOS DEL GRUPO ♛*\n\n_Clasificación basada en el valor neto (cartera + banco)._\n`;

            rankedUsers.forEach((user, index) => {
                const userTag = `@${user.jid.split('@')[0]}`;
                const wealth = `${currency} ${user.netWorth.toLocaleString()}`;
                mentions.push(user.jid);

                let medal = '';
                if (index === 0) medal = '🥇';
                else if (index === 1) medal = '🥈';
                else if (index === 2) medal = '🥉';
                else medal = `*${index + 1}.*`;

                rankingMessage += `\n${medal} ${userTag} - *${wealth}*`;
            });

            await client.sendMessage(chatId, {
                text: rankingMessage.trim(),
                mentions
            });

        } catch (error) {
            console.error('Error en el comando ricos:', error);
            await client.sendMessage(chatId, { text: '⚙️ Ocurrió un error al obtener el ranking de los más ricos.' });
        }
    }
};

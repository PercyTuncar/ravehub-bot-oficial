const User = require('../../models/User');
const { getCurrency } = require('../../utils/groupUtils');
module.exports = {
    name: 'ricos',
    description: 'Ver top de millonarios.',
    usage: '.ricos',
    category: 'economy',
    aliases: ['top', 'leaderboard'],
    async execute(message, args, client) {
        const sock = client;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

        try {
            // Filtrar usuarios solo del grupo actual
            const users = await User.find({ groupId: chatId, jid: { $exists: true, $type: 'string' } });

            if (users.length === 0) {
                return sock.sendMessage(chatId, { text: 'Aún no hay usuarios registrados para mostrar un ranking.' });
            }

            // Calcular riqueza total y ordenar
            const rankedUsers = users.map(user => ({
                ...user.toObject(),
                totalWealth: user.economy.wallet + user.economy.bank
            })).sort((a, b) => b.totalWealth - a.totalWealth).slice(0, 10);

            if (rankedUsers.length === 0) {
                return sock.sendMessage(chatId, { text: 'Aún no hay usuarios con riqueza registrada para mostrar un ranking.' });
            }

            const mentions = [];
            let rankingMessage = `*♛ LOS MÁS RICOS ♛*\n_La crème de la crème de este grupo_`;

            rankedUsers.forEach((user, index) => {
                if (user.jid && typeof user.jid === 'string') {
                    const userTag = `@${user.jid.split('@')[0]}`;
                    const wealth = `${currency} ${user.totalWealth.toLocaleString()}`;
                    mentions.push(user.jid);

                    if (index === 0) {
                        rankingMessage += `\n\n🥇 *${userTag}*\n      \`${wealth}\``;
                    } else if (index === 1) {
                        rankingMessage += `\n\n🥈 *${userTag}*\n      \`${wealth}\``;
                    } else if (index === 2) {
                        rankingMessage += `\n\n🥉 *${userTag}*\n      \`${wealth}\``;
                    } else {
                        if (index === 3) rankingMessage += `\n\n-----------------------------------`;
                        rankingMessage += `\n*${index + 1}.* ${userTag} - \`${wealth}\``;
                    }
                }
            });

            await sock.sendMessage(chatId, { 
                text: rankingMessage.trim(),
                mentions 
            });

        } catch (error) {
            console.error('Error en el comando ricos:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al intentar obtener el ranking.' });
        }
    }
};

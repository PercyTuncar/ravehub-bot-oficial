const User = require('../../models/User');
const { getCurrency } = require('../../utils/groupUtils');

module.exports = {
    name: 'ricos',
    description: 'Ver top de millonarios.',
    usage: '.ricos',
    category: 'economy',
    aliases: ['top', 'leaderboard'],
    async execute(sock, message) {
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

            const mentions = [];
            let rankingMessage = [
                `*╭───≽ 💵 LOS MÁS RICOS DEL GRUPO 💵 ≼───*`,
                `*│*`,
                `*│* Top 10 pitucos de este grupo 💵._`,
                `*│*`
            ];

            rankedUsers.forEach((user, index) => {
                if (user.jid && typeof user.jid === 'string') {
                    const rankEmoji = ['🥇', '🥈', '🥉'][index] || `*${index + 1}.*`;
                    rankingMessage.push(`*│* ${rankEmoji} @${user.jid.split('@')[0]} - ${currency} ${user.totalWealth.toLocaleString()}`);
                    mentions.push(user.jid);
                }
            });

            rankingMessage.push(`*│*`);
            rankingMessage.push(`*╰─────────────────≽*`);

            await sock.sendMessage(chatId, { 
                text: rankingMessage.join('\n'),
                mentions 
            });

        } catch (error) {
            console.error('Error en el comando ricos:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al intentar obtener el ranking.' });
        }
    }
};

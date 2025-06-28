const User = require('../../models/User');

module.exports = {
    name: 'ricos',
    description: 'Muestra a los 10 usuarios más ricos.',
    usage: '.ricos',
    category: 'economy',
    aliases: ['ranking', 'topricos'],
    async execute(sock, message) {
        const chatId = message.key.remoteJid;

        try {
            // 1. Filtrar usuarios que no tienen JID o cuyo JID no es un string
            const users = await User.find({ jid: { $exists: true, $type: 'string' } });

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
                `*╭───≽ 🏆 LOS MÁS RICOS RAVEHUB 🏆 ≼───*`,
                `*│*`,
                `*│* _Los 10 ravers con más 💵._`,
                `*│*`
            ];

            rankedUsers.forEach((user, index) => {
                // 2. Comprobación de seguridad adicional
                if (user.jid && typeof user.jid === 'string') {
                    const rankEmoji = ['🥇', '🥈', '🥉'][index] || `*${index + 1}.*`;
                    rankingMessage.push(`*│* ${rankEmoji} @${user.jid.split('@')[0]} - $${user.totalWealth} 💵`);
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

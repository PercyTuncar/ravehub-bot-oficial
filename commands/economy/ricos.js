const User = require('../../models/User');

module.exports = {
    name: 'ricos',
    description: 'Muestra a los 10 usuarios más ricos del bot.',
    usage: '.ricos',
    category: 'economy',
    aliases: ['ranking', 'topricos'],
    async execute(sock, message) {
        const chatId = message.key.remoteJid;

        try {
            const users = await User.find({});

            if (users.length === 0) {
                return sock.sendMessage(chatId, { text: 'Aún no hay usuarios registrados para mostrar un ranking.' });
            }

            // Calcular riqueza total y ordenar
            const rankedUsers = users.map(user => ({
                ...user.toObject(),
                totalWealth: user.economy.wallet + user.economy.bank
            })).sort((a, b) => b.totalWealth - a.totalWealth).slice(0, 10);

            let rankingMessage = [
                `*╭───≽ 🏆 RANKING DE RICOS RAVEHUB 🏆 ≼───*`,
                `*│*`,
                `*│* _Los 10 ravers con más 💵 en el juego._`,
                `*│*`
            ];

            rankedUsers.forEach((user, index) => {
                const rankEmoji = ['🥇', '🥈', '🥉'][index] || `*${index + 1}.*`;
                rankingMessage.push(`*│* ${rankEmoji} *${user.name}* - $${user.totalWealth} 💵`);
            });

            rankingMessage.push(`*│*`);
            rankingMessage.push(`*╰─────────────────≽*`);

            await sock.sendMessage(chatId, { text: rankingMessage.join('\n') });

        } catch (error) {
            console.error('Error en el comando ricos:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al intentar obtener el ranking.' });
        }
    }
};

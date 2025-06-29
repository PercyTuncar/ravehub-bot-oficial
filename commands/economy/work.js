const { findOrCreateUser } = require('../../utils/userUtils');
const { handleDebtPayment } = require('../../utils/debtManager');
const { getEligibleJobs, xpTable, getLevelName } = require('../../utils/levels');

module.exports = {
    name: 'work',
    description: 'Ganar dinero y XP.',
    usage: '.work',
    category: 'economy',
    async execute(sock, message) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            const user = await findOrCreateUser(senderJid, message.pushName);

            if (user.cooldowns.work && user.cooldowns.work > new Date()) {
                const timeLeft = (user.cooldowns.work.getTime() - new Date().getTime()) / 1000;
                const minutes = Math.floor(timeLeft / 60);
                const seconds = Math.ceil(timeLeft % 60);

                let timeString = '';
                if (minutes > 0) {
                    timeString += `${minutes} minuto(s)`;
                }
                if (seconds > 0) {
                    if (minutes > 0) timeString += ' y ';
                    timeString += `${seconds} segundo(s)`;
                }

                return sock.sendMessage(chatId, { text: `⏳ Debes esperar ${timeString} más para volver a trabajar.` });
            }

            const eligibleJobs = getEligibleJobs(user.level);
            if (eligibleJobs.length === 0) {
                return sock.sendMessage(chatId, { text: 'No hay trabajos disponibles para tu nivel actual. ¡Sigue esforzándote!' });
            }

            const job = eligibleJobs[Math.floor(Math.random() * eligibleJobs.length)];
            const earnings = job.salary;
            const xpGained = Math.floor(earnings / 10);

            let netGain = earnings;
            let debtMessage = '';

            if (user.judicialDebt > 0) {
                const result = handleDebtPayment(user, earnings);
                netGain = result.remainingAmount;
                debtMessage = result.debtMessage;
            }

            user.economy.wallet += netGain;
            user.xp += xpGained;

            // Lógica de subida de nivel
            // (Esta parte se puede mover a una función en userUtils.js si se vuelve compleja)
            let levelUpMessage = '';
            const currentLevelXp = xpTable[user.level - 1] || 0;
            const nextLevelXp = xpTable[user.level] || Infinity;
            if (user.xp >= nextLevelXp) {
                user.level++;
                const newLevelName = getLevelName(user.level);
                levelUpMessage = `\n\n🎉 ¡Felicidades! Has subido al ${newLevelName}.`;
            }

            user.cooldowns.work = new Date(new Date().getTime() + job.cooldown * 60 * 1000);
            await user.save();

            let response = `*╭───≽ 💼 TRABAJO REALIZADO ≼───*\n*│*\n*│* 👤 *Trabajador:* @${senderJid.split('@')[0]}\n*│* 🏢 *Puesto:* ${job.name}\n*│* 📝 *Reporte:* _\"${job.description}\"_\n*│*\n*│* 💵 *Salario:* ${earnings} 💵\n*│* ✨ *Experiencia:* +${xpGained} XP\n*│*\n*╰─────────────────≽*`;

            if (debtMessage) {
                response += `\n\n${debtMessage}`;
            }
            response += levelUpMessage;

            await sock.sendMessage(chatId, { 
                text: response,
                mentions: [senderJid]
            });

        } catch (error) {
            console.error('Error en el comando work:', error);
            await sock.sendMessage(chatId, { text: '❌ Ocurrió un error al intentar trabajar.' });
        }
    }
};

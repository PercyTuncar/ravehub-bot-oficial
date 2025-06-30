const { findOrCreateUser } = require('../../utils/userUtils');
const { handleDebtPayment } = require('../../utils/debtManager');
const { getEligibleJobs, xpTable, getLevelName } = require('../../utils/levels');
const { sendDebtReminder } = require('../../utils/debtUtils');
const { getCurrency } = require('../../utils/groupUtils');

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
            const currency = await getCurrency(chatId);

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

            // Guardar el cooldown y el estado del usuario ANTES de enviar mensajes
            user.cooldowns.work = new Date(new Date().getTime() + job.cooldown * 60 * 1000);
            user.lastWork = new Date();
            await user.save();

            // Mensaje principal del trabajo
            let workResponse = `*╭─── 💼 TRABAJO ───╮*\n\n  *Puesto:* ${job.name}\n  _\"${job.description}\"_\n\n  *Recompensas para @${senderJid.split('@')[0]}:*\n  > • *Salario:* ${earnings} ${currency}\n  > • *Experiencia:* +${xpGained} XP\n\n*╰─────────────╯*`;

            if (debtMessage) {
                workResponse += `\n\n${debtMessage}`;
            }

            await sock.sendMessage(chatId, { 
                text: workResponse,
                mentions: [senderJid]
            });

            // Lógica de subida de nivel y mensaje separado
            const nextLevelXp = xpTable[user.level] || Infinity;
            if (user.xp >= nextLevelXp) {
                user.level++;
                const newLevelName = getLevelName(user.level);
                await user.save(); // Guardar el nuevo nivel

                const levelUpMessage = `*╭─── 🌟 ¡NIVEL ALCANZADO! 🌟 ───*\n*│*\n*│*   ¡Felicidades, @${senderJid.split('@')[0]}!\n*│*   Has ascendido al nivel:\n*│*\n*│*      *${newLevelName}*\n*│*\n*│*   ¡Sigue así! 🚀\n*│*\n*╰──────────────────────╯*`;

                await sock.sendMessage(chatId, { 
                    text: levelUpMessage,
                    mentions: [senderJid]
                });
            }

            // Enviar recordatorio de deuda después de trabajar
            await sendDebtReminder(sock, chatId, user);

        } catch (error) {
            console.error('Error en el comando work:', error);
            await sock.sendMessage(chatId, { text: '❌ Ocurrió un error al intentar trabajar.' });
        }
    }
};

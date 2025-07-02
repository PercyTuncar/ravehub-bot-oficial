const { findOrCreateUser } = require('../../utils/userUtils');
const { handleDebtPayment } = require('../../utils/debtManager');
const { getEligibleJobs, xpTable, getLevelName } = require('../../utils/levels');
const { getDebtReminderMessage } = require('../../utils/debtUtils'); // Cambiado de sendDebtReminder a getDebtReminderMessage
const { getCurrency } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'work',
    description: 'Ganar dinero y XP.',
    usage: '.work',
    category: 'economy',
    async execute(message) {
        const sock = getSocket();
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            let user = await findOrCreateUser(senderJid, chatId, message.pushName);
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

                return sock.sendMessage(chatId, { text: `⏳ @${senderJid.split('@')[0]}, debes esperar ${timeString} más para volver a trabajar.`, mentions: [senderJid] });
            }

            const eligibleJobs = getEligibleJobs(user.level);
            if (eligibleJobs.length === 0) {
                return sock.sendMessage(chatId, { text: 'No hay trabajos disponibles para tu nivel actual. ¡Sigue esforzándote!' });
            }

            const job = eligibleJobs[Math.floor(Math.random() * eligibleJobs.length)];
            const earnings = job.salary;
            const xpGained = Math.floor(earnings / 10);

            // Las ganancias van directamente a la cartera, sin deducción de deuda judicial aquí.
            user.economy.wallet += earnings;
            user.xp += xpGained;

            // Guardar el cooldown y el estado del usuario ANTES de enviar mensajes
            user.cooldowns.work = new Date(new Date().getTime() + job.cooldown * 60 * 1000);
            user.lastWork = new Date();
            await user.save();

            // Mensaje principal del trabajo
            let workResponse = `🔨════════════ 🔨
*💼 ¡BUEN TRABAJO! 💼*
🔨════════════ 🔨

👤 @${senderJid.split('@')[0]}
🧹 *Puesto:* _${job.name}_
> 🤫 *Detalle:* _${job.description}_
💰 *Salario:* \`${currency} ${earnings.toLocaleString()}\`
🌟 *XP:* \`\`\`+${xpGained}\`\`\``;
            
            // Obtener el mensaje de recordatorio de deuda
            const debtReminder = await getDebtReminderMessage(user);
            let mentions = [senderJid];

            if (debtReminder) {
                workResponse += debtReminder.text; // Añadir el recordatorio al mensaje de trabajo
                mentions = [...new Set([...mentions, ...debtReminder.mentions])]; // Unir menciones sin duplicados
            }

            await sock.sendMessage(chatId, { 
                text: workResponse,
                mentions: mentions
            });

            // Lógica de subida de nivel y mensaje separado
            const nextLevelXp = xpTable[user.level] || Infinity;
            if (user.xp >= nextLevelXp) {
                user.level++;
                const newLevelName = getLevelName(user.level);
                await user.save(); // Guardar el nuevo nivel

                const levelUpMessage = `*🎉 ¡Felicidades, @${senderJid.split('@')[0]}! 🎉*

Has ascendido al nivel: *${newLevelName}*
¡Sigue así! 🚀`;

                await sock.sendMessage(chatId, { 
                    text: levelUpMessage,
                    mentions: [senderJid]
                });
            }

            // Ya no se necesita el envío de recordatorio por separado
            // await sendDebtReminder(chatId, user);

        } catch (error) {
            console.error('Error en el comando work:', error);
            await sock.sendMessage(chatId, { text: '❌ Ocurrió un error al intentar trabajar.' });
        }
    }
};

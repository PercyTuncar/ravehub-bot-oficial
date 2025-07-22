const { findOrCreateUser } = require("../../utils/userUtils");
const { getNextLevelXP } = require("../../utils/levels");
const { getCurrency } = require("../../utils/groupUtils");
const moment = require('moment');
require('moment-duration-format');

function getProgressBar(current, max, length = 10) {
    if (current < 0) current = 0;
    if (current > max) current = max;
    const percentage = current / max;
    const progress = Math.round(length * percentage);
    const empty = length - progress;
    return '▰'.repeat(progress) + '▱'.repeat(empty);
}

module.exports = {
    name: "me",
    description: "Muestra tu perfil de usuario.",
    async execute(message, args, client) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            let user = await findOrCreateUser(senderJid, chatId, message.pushName);
            const currency = await getCurrency(chatId);
            const nextLevelXP = getNextLevelXP(user.level);
            const xpBar = getProgressBar(user.xp, nextLevelXP, 10);

            // --- Barras de estado ---
            const health = user.status?.health ?? 100;
            const hunger = user.status?.hunger ?? 100;
            const thirst = user.status?.thirst ?? 100;
            const stress = user.status?.stress ?? 0;

            const healthBar = getProgressBar(health, 100, 10);
            const hungerBar = getProgressBar(hunger, 100, 10);
            const thirstBar = getProgressBar(thirst, 100, 10);
            const stressBar = getProgressBar(stress, 100, 10);

            let profilePicUrl;
            try {
                profilePicUrl = await client.profilePictureUrl(senderJid, 'image');
            } catch (e) {
                profilePicUrl = 'https://res.cloudinary.com/amadodedios/image/upload/fl_preserve_transparency/v1751131351/portadasinfoto_gz9kk2.jpg';
            }

            const playtime = moment.duration(user.playtime || 0).humanize();

            const profileMessage = `
*PERFIL DE @${senderJid.split("@")[0]}*
══════════════════

*─ Nivel:* ${user.level}
*─ XP:* ${user.xp.toLocaleString()} / ${nextLevelXP.toLocaleString()}
   ${xpBar}

*─ Salud:* ${user.status.health}%
   ${healthBar}
*─ Hambre:* ${user.status.hunger}%
   ${hungerBar}
*─ Sed:* ${user.status.thirst}%
   ${thirstBar}
*─ Estrés:* ${user.status.stress}%
   ${stressBar}

*─ Billetera:* ${currency} ${user.economy.wallet.toLocaleString()}
*─ Banco:* ${currency} ${user.economy.bank.toLocaleString()}
*─ Valor Neto:* ${currency} ${(user.economy.wallet + user.economy.bank).toLocaleString()}

*─ Trabajo:* ${user.job?.name || 'Desempleado'}
*─ Salario:* ${currency} ${user.job?.salary ? user.job.salary.toLocaleString() : 0}

*─ Tiempo jugado:* ${playtime}
*─ Miembro desde:* ${moment(user.createdAt).format('DD/MM/YYYY')}
*─ Estado:* ${user.status.isDead ? 'Muerto 💀' : 'Vivo'}
`;

            await client.sendMessage(chatId, { text: profileMessage, mentions: [senderJid] });

        } catch (error) {
            console.error("Error al obtener el perfil:", error);
            if (client) {
                client.sendMessage(chatId, { text: '🤖 ¡Ups! Hubo un error al obtener tu perfil.' });
            }
        }
    },
};

const User = require('../../models/User');
const { getLevelInfo } = require('../../utils/levels');

const getProgressBar = (value, max, length) => {
    const percentage = value / max;
    const progress = Math.round(length * percentage);
    const empty = length - progress;
    return '▓'.repeat(progress) + '░'.repeat(empty);
};

module.exports = {
    name: 'me',
    description: 'Muestra tu perfil de jugador.',
    aliases: ['profile', 'perfil'],
    async execute(sock, m, args) {
        const senderId = m.key.participant || m.key.remoteJid;
        const groupId = m.key.remoteJid;
        const user = await User.findOne({ jid: senderId, groupId }).populate('inventory.itemId');

        if (!user) {
            return sock.sendMessage(groupId, { text: 'No tienes un perfil. Usa `.iniciar` para crear uno.' }, { quoted: m });
        }

        if (user.status.isDead) {
            return sock.sendMessage(groupId, { text: 'Estás muerto 💀. Usa `.renacer` para volver a la vida.' }, { quoted: m });
        }

        const levelInfo = getLevelInfo(user.xp);
        const judicialDebt = user.judicialDebt > 0 ? `s/ ${user.judicialDebt.toLocaleString()}` : 's/ 0';

        const healthBar = getProgressBar(user.status.health, 100, 10);
        const hungerBar = getProgressBar(user.status.hunger, 100, 10);
        const thirstBar = getProgressBar(user.status.thirst, 100, 10);
        const stressBar = getProgressBar(user.status.stress, 100, 10);

        let inventoryList = user.inventory.map(item => `> ${item.name} (${item.quantity})`).join('\n');
        if (!inventoryList) {
            inventoryList = '> _Vacío_';
        }

        const profileMessage = `
*✨ PERFIL DE @${senderId.split('@')[0]} ✨*

*👤 Nombre:* ${user.name}
*📍 Vive en:* La calle 😢
-----------------------------------
📊 *ESTADÍSTICAS*
> *Nivel:* \`${levelInfo.name}\`
> *XP:* \`${user.xp}/${levelInfo.xpNeeded}\`
> *Deuda Judicial:* \`${judicialDebt}\`
-----------------------------------
🩺 *ESTADO DE VIDA*
> ❤️ Salud: ${healthBar} \`${user.status.health}%\`
> 🍗 Hambre: ${hungerBar} \`${user.status.hunger}%\`
> 🥤 Sed: ${thirstBar} \`${user.status.thirst}%\`
> 😵 Estrés: ${stressBar} \`${user.status.stress}%\`
-----------------------------------
💰 *ECONOMÍA*
> *Cartera:* \`s/ ${user.economy.wallet.toLocaleString()}\`
> *Banco:* \`s/ ${user.economy.bank.toLocaleString()}\`
-----------------------------------
🧾 *DEUDAS*
> ${user.debts.length > 0 ? 'Tienes deudas pendientes.' : '✅ _Sin deudas pendientes_'}
-----------------------------------
🎒 *INVENTARIO*
${inventoryList}
-----------------------------------
        `;

        await sock.sendMessage(groupId, { text: profileMessage, mentions: [senderId] }, { quoted: m });
    },
};

const User = require('../../models/User');
const { getLevelName, xpTable } = require('../../utils/levels');

module.exports = {
    name: 'me',
    description: 'Muestra tu perfil de usuario con tu economía e inventario.',
    usage: '.me',
    category: 'utility',
    async execute(sock, message) {
        const jid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            let user = await User.findOne({ jid }).populate('inventory.itemId');

            if (!user) {
                user = new User({
                    jid,
                    name: message.pushName || 'Usuario Desconocido',
                });
                await user.save();
            }

            let inventoryList = "Inventario vacío.";
            if (user.inventory && user.inventory.length > 0) {
                inventoryList = user.inventory
                    .map((item) => {
                        const emoji = item.itemId?.emoji || "📦";
                        return `${emoji} *${item.name}*: ${item.quantity}`;
                    })
                    .join("\n*│* │ ");
            }

            const nextLevelXp = xpTable[user.level] || user.levelXp;
            const xpProgress = `${user.xp}/${nextLevelXp}`;

            const profileMessage = `*╭───≽ PERFIL DE USUARIO ≼───*\n*│*\n*│* 👤 *Usuario:* @${jid.split("@")[0]}\n*│* 📛 *Nombre:* ${user.name}\n*│* 🌟 *Nivel:* ${getLevelName(user.level)}\n*│* 📈 *Experiencia:* ${xpProgress} XP\n*│* ⚠️ *Advertencias:* ${user.warnings}\n*│*\n*│* ╭─≽ 💰 ECONOMÍA\n*│* │ 💵 *Cartera:* $${user.economy.wallet}\n*│* │ 🏦 *Banco:* $${user.economy.bank}\n*│* ╰─────────────────≽\n*│*\n*│* ╭─≽ 🎒 INVENTARIO\n*│* │ ${inventoryList}\n*│* ╰─────────────────≽\n*│*\n*╰──────────≽*`;

            await sock.sendMessage(
                chatId,
                {
                    text: profileMessage,
                    mentions: [jid]
                }
            );

        } catch (error) {
            console.error('Error al obtener el perfil:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al obtener tu perfil.' });
        }
    }
};

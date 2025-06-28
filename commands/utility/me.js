const { findOrCreateUser } = require('../../utils/userUtils');
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
            // Refactorización: Usar la función centralizada para obtener el usuario.
            let user = await findOrCreateUser(jid, message.pushName);
            // Poblar el inventario después de asegurarse de que el usuario existe.
            user = await user.populate('inventory.itemId');

            let inventoryList = "Inventario vacío.";
            if (user.inventory && user.inventory.length > 0) {
                inventoryList = user.inventory
                    .map((item) => {
                        const emoji = item.itemId?.emoji || "📦";
                        return `${emoji} *${item.name}*: ${item.quantity}`;
                    })
                    .join("\n*│* │ ");
            }

            const nextLevelXp = xpTable[user.level] || Infinity; // Evitar errores si el nivel es el máximo
            const xpProgress = `${user.xp}/${nextLevelXp}`;

            // --- Obtener la foto de perfil ---
            let profilePicUrl;
            try {
                profilePicUrl = await sock.profilePictureUrl(jid, 'image');
            } catch (e) {
                profilePicUrl = 'https://res.cloudinary.com/amadodedios/image/upload/fl_preserve_transparency/v1751131351/portadasinfoto_gz9kk2.jpg'; // URL de imagen por defecto corregida
            }

            const profileMessage = `*╭───≽ PERFIL DE USUARIO ≼───*\n*│*\n*│* 👤 *Usuario:* @${jid.split("@")[0]}\n*│* 📛 *Nombre:* ${user.name}\n*│* 🌟 *Nivel:* ${getLevelName(user.level)}\n*│* 📈 *Experiencia:* ${xpProgress} XP\n*│* ⚖️ *Deuda Judicial:* ${user.judicialDebt} 💵\n*│*\n*│* ╭─≽ 💰 ECONOMÍA\n*│* │ 💵 *Cartera:* $${user.economy.wallet}\n*│* │ 🏦 *Banco:* $${user.economy.bank}\n*│* ╰─────────────────≽\n*│*\n*│* ╭─≽ 🎒 INVENTARIO\n*│* │ ${inventoryList}\n*│* ╰─────────────────≽\n*│*\n*╰──────────≽*`;

            await sock.sendMessage(
                chatId,
                {
                    image: { url: profilePicUrl },
                    caption: profileMessage,
                    mentions: [jid]
                }
            );

        } catch (error) {
            console.error('Error al obtener el perfil:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al obtener tu perfil.' });
        }
    }
};

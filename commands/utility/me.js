const { findOrCreateUser } = require('../../utils/userUtils');
const { getLevelName, xpTable } = require('../../utils/levels');
const { applyInterestToAllDebts, getPaymentReputation } = require('../../utils/debtUtils');
const User = require('../../models/User');

module.exports = {
    name: 'me',
    description: 'Ver tu perfil y stats.',
    aliases: ['profile', 'yo'],
    usage: '.me',
    category: 'utility',
    async execute(sock, message) {
        const jid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            await applyInterestToAllDebts();
            let user = await findOrCreateUser(jid, message.pushName);
            user = await User.findById(user._id).populate('inventory.itemId').populate({ 
                path: 'debts', 
                populate: { path: 'lender', select: 'name jid' } 
            });

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
            const reputation = getPaymentReputation(user);

            let debtsList = "No tienes deudas pendientes.";
            let mentions = [jid];
            if (user.debts && user.debts.length > 0) {
                debtsList = user.debts
                    .map((debt) => {
                        mentions.push(debt.lender.jid);
                        return `💸 Debes ${debt.amount.toFixed(2)} a @${debt.lender.jid.split('@')[0]} (Interés: ${debt.interest * 100}% diario)`;
                    })
                    .join("\n*│* │ ");
            }

            // --- Obtener la foto de perfil ---
            let profilePicUrl;
            try {
                profilePicUrl = await sock.profilePictureUrl(jid, 'image');
            } catch (e) {
                profilePicUrl = 'https://res.cloudinary.com/amadodedios/image/upload/fl_preserve_transparency/v1751131351/portadasinfoto_gz9kk2.jpg'; // URL de imagen por defecto corregida
            }

            const profileMessage = `*╭───≽ PERFIL DE USUARIO ≼───*\n*│*\n*│* 👤 *Usuario:* @${jid.split("@")[0]}\n*│* 📛 *Nombre:* ${user.name}\n*│* 🌟 *Nivel:* ${getLevelName(user.level)}\n*│* 📈 *Experiencia:* ${xpProgress} XP\n*│* 🏅 *Reputación:* ${reputation}\n*│* ⚖️ *Deuda Judicial:* ${user.judicialDebt} 💵\n*│*\n*│* ╭─≽ 💰 ECONOMÍA\n*│* │ 💵 *Cartera:* $${user.economy.wallet}\n*│* │ 🏦 *Banco:* $${user.economy.bank}\n*│* ╰─────────────────≽\n*│*\n*│* ╭─≽ 🧾 DEUDAS\n*│* │ ${debtsList}\n*│* ╰─────────────────≽\n*│*\n*│* ╭─≽ 🎒 INVENTARIO\n*│* │ ${inventoryList}\n*│* ╰─────────────────≽\n*│*\n*╰──────────≽*`;

            await sock.sendMessage(
                chatId,
                {
                    image: { url: profilePicUrl },
                    caption: profileMessage,
                    mentions: [...new Set(mentions)]
                }
            );

        } catch (error) {
            console.error('Error al obtener el perfil:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al obtener tu perfil.' });
        }
    }
};

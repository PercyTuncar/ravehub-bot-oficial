const { findOrCreateUser } = require('../../utils/userUtils');
const { getLevelName, xpTable } = require('../../utils/levels');
const { applyInterestToAllDebts, getPaymentReputation } = require('../../utils/debtUtils');
const { getCurrency } = require('../../utils/groupUtils');
const User = require('../../models/User');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'me',
    description: 'Ver tu perfil y stats.',
    aliases: ['profile', 'yo'],
    usage: '.me',
    category: 'utility',
    async execute(message) {
        const sock = getSocket();
        const jid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            await applyInterestToAllDebts();
            const currency = await getCurrency(chatId);
            let user = await findOrCreateUser(jid, chatId, message.pushName);
            user = await User.findById(user._id).populate('inventory.itemId').populate({ 
                path: 'debts', 
                populate: { path: 'lender', select: 'name jid groupId' } 
            });

            // --- Lógica de Vivienda ---
            const casaSanIsidro = user.inventory.find(item => item.name.toLowerCase() === 'casa en san isidro');
            const casaAte = user.inventory.find(item => item.name.toLowerCase() === 'casa en ate');

            let residence = "La calle 😢";
            if (casaSanIsidro) {
                residence = "San Isidro 🏡";
            } else if (casaAte) {
                residence = "Ate 🏠";
            }

            // --- Inventario Detallado ---
            let inventoryList = "Inventario vacío.";
            if (user.inventory && user.inventory.length > 0) {
                inventoryList = user.inventory
                    .map((item) => {
                        const emoji = item.itemId?.emoji || "📦";
                        // CORRECCIÓN: Cambiar el formato de (xN) a xN para mayor claridad
                        const quantity = item.quantity > 1 ? `x${item.quantity}` : ''; 
                        return `${emoji} *${item.name}* ${quantity}`;
                    })
                    .join("\n*│* │ \n*│* │ "); // Añade un pequeño espacio entre items
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
                        return `💸 Debes *${currency} ${debt.amount.toLocaleString()}* a @${debt.lender.jid.split('@')[0]} (Interés: ${debt.interest * 100}% diario)`;
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

            const profileMessage = `*✨ PERFIL DE @${jid.split("@")[0]} ✨*

*👤 Nombre:* ${user.name}
*📍 Residencia:* ${residence}
-----------------------------------
📊 *ESTADÍSTICAS*
> *Nivel:* \`${getLevelName(user.level)}\`
> *XP:* \`${xpProgress}\`
> *Reputación:* \`${reputation}\`
> *Deuda Judicial:* \`${currency} ${user.judicialDebt.toLocaleString()}\`
-----------------------------------
💰 *ECONOMÍA*
> *Cartera:* \`${currency} ${user.economy.wallet.toLocaleString()}\`
> *Banco:* \`${currency} ${user.economy.bank.toLocaleString()}\`
-----------------------------------
🧾 *DEUDAS*
${user.debts && user.debts.length > 0 ?
    user.debts.map((debt) => {
        mentions.push(debt.lender.jid);
        return `> 💸 Debes \`${currency} ${debt.amount.toLocaleString()}\` a @${debt.lender.jid.split('@')[0]}\n>    _${debt.interest * 100}% interés diario_`;
    }).join('\n') :
    '> ✅ _Sin deudas pendientes_'}
-----------------------------------
🎒 *INVENTARIO*
${user.inventory && user.inventory.length > 0 ?
    user.inventory.map((item) => {
        const emoji = item.itemId?.emoji || "📦";
        const quantity = item.quantity > 1 ? `x${item.quantity}` : '';
        return `> ${emoji} *${item.name}* ${quantity}`;
    }).join('\n') :
    '> 📭 _Inventario vacío_'}
-----------------------------------`;

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

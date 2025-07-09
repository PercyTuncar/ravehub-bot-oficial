const { findOrCreateUser } = require('../../utils/userUtils');
const { getLevelName, xpTable } = require('../../utils/levels');
const { applyInterestToAllDebts, getPaymentReputation } = require('../../utils/debtUtils');
const { getCurrency } = require('../../utils/groupUtils');
const User = require('../../models/User');
const ShopItem = require('../../models/ShopItem'); // Importar el modelo de la tienda
const { getSocket } = require('../../bot');

const getProgressBar = (value, max, length) => {
    if (typeof value !== 'number' || typeof max !== 'number' || value < 0 || max <= 0) {
        return '░'.repeat(length);
    }
    const percentage = value / max;
    const progress = Math.round(length * percentage);
    const empty = length - progress;
    return '▓'.repeat(progress) + '░'.repeat(empty);
};

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

            if (user.status && user.status.isDead) {
                return sock.sendMessage(chatId, {
                    text: `💀 @${jid.split("@")[0]}, estás muerto. Usa \`.renacer\` para volver al juego.`,
                    mentions: [jid],
                });
            }

            // Obtener todos los items de la tienda para mapear emojis
            const allShopItems = await ShopItem.find({});
            const emojiMap = allShopItems.reduce((map, item) => {
                map[item.name.toLowerCase()] = item.emoji;
                return map;
            }, {});

            // --- Lógica de Vivienda ---
            const casaSanIsidro = user.inventory.find(item => item.name.toLowerCase() === 'casa en san isidro');
            const casaSJL = user.inventory.find(item => item.name.toLowerCase() === 'casa en sjl');

            let residence = "La calle 😢";
            if (casaSanIsidro) {
                residence = "San Isidro 🏡";
            } else if (casaSJL) {
                residence = "SJL 🏠";
            }

            // --- Inventario Detallado ---
            let inventoryList = "Inventario vacío.";
            if (user.inventory && user.inventory.length > 0) {
                inventoryList = user.inventory
                    .map((item) => {
                        const emoji = emojiMap[item.name.toLowerCase()] || item.itemId?.emoji || "📦";
                        const quantity = item.quantity > 1 ? `x${item.quantity}` : ''; 
                        return `${emoji} *${item.name}* ${quantity}`;
                    })
                    .join("\n*│* │ \n*│* │ ");
            }

            const nextLevelXp = xpTable[user.level] || Infinity; // Evitar errores si el nivel es el máximo
            const xpProgress = `${user.xp}/${nextLevelXp}`;
            const reputation = getPaymentReputation(user);

            // Solo muestra la reputación si el usuario es moroso
            const reputationLine = reputation === '⚠️ Moroso' ? `> *Reputación:* \`${reputation}\`\n` : '';

            const mentions = [jid];

            // --- Barras de estado ---
            const health = user.status?.health ?? 100;
            const hunger = user.status?.hunger ?? 100;
            const thirst = user.status?.thirst ?? 100;
            const stress = user.status?.stress ?? 0;

            const healthBar = getProgressBar(health, 100, 10);
            const hungerBar = getProgressBar(hunger, 100, 10);
            const thirstBar = getProgressBar(thirst, 100, 10);
            const stressBar = getProgressBar(stress, 100, 10);

            // --- Obtener la foto de perfil ---
            let profilePicUrl;
            try {
                profilePicUrl = await sock.profilePictureUrl(jid, 'image');
            } catch (e) {
                profilePicUrl = 'https://res.cloudinary.com/amadodedios/image/upload/fl_preserve_transparency/v1751131351/portadasinfoto_gz9kk2.jpg'; // URL de imagen por defecto corregida
            }

            const profileMessage = `*✨ PERFIL DE @${jid.split("@")[0]} ✨*

*👤 Nombre:* ${user.name}
*📍 Vive en:* ${residence}
-----------------------------------
📊 *ESTADÍSTICAS*
> *Nivel:* \`${getLevelName(user.level)}\`
> *XP:* \`${xpProgress}\`
${reputationLine}> *Deuda Judicial:* \`${currency} ${user.judicialDebt.toLocaleString()}\`
-----------------------------------
🩺 *ESTADO DE VIDA*
> ❤️ Salud: ${healthBar} \`${health}%\`
> 🍗 Hambre: ${hungerBar} \`${hunger}%\`
> 🥤 Sed: ${thirstBar} \`${thirst}%\`
> 😵 Estrés: ${stressBar} \`${stress}%\`
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
*│* │ ${inventoryList}
*│* ╰──────────────────≽`;

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

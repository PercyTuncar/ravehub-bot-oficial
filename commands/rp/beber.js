const { findOrCreateUser, updateHealth } = require('../../utils/userUtils');
const ShopItem = require('../../models/ShopItem');

module.exports = {
    name: 'beber',
    aliases: ['tomar', 'drink'],
    description: 'Bebe un item de tu inventario para saciar la sed y reducir el estrés.',
    category: 'rp',
    async execute(message, args, client) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const pushName = message.pushName || '';

        if (args.length === 0) {
            return client.sendMessage(chatId, { text: 'Debes especificar qué quieres beber. Ejemplo: `.beber cerveza heladita`' });
        }

        const itemName = args.join(' ').toLowerCase();

        try {
            const user = await findOrCreateUser(senderJid, chatId, pushName);

            if (user.status.isDead) {
                return client.sendMessage(chatId, { text: '👻 No puedes hacer nada, estás muerto.' });
            }

            // 1. Buscar el ShopItem en la base de datos por nombre o alias
            const searchPattern = itemName.replace(/s$/, '(s)?'); // Maneja plurales simples
            const shopItem = await ShopItem.findOne({
                $or: [
                    { name: new RegExp(`^${searchPattern}$`, 'i') },
                    { aliases: new RegExp(`^${searchPattern}$`, 'i') }
                ]
            });

            if (!shopItem) {
                return client.sendMessage(chatId, { text: `No existe un item bebible llamado "${itemName}" en el bar.` });
            }

            if (shopItem.type !== 'drink') {
                return client.sendMessage(chatId, { text: `No puedes beber un(a) "${shopItem.name}".` });
            }

            // 2. Verificar si el usuario tiene ese item en su inventario
            const itemInInventoryIndex = user.inventory.findIndex(item => item.itemId && item.itemId.toString() === shopItem._id.toString() && item.quantity > 0);

            if (itemInInventoryIndex === -1) {
                return client.sendMessage(chatId, { text: `No tienes "${shopItem.name}" en tu inventario.` });
            }
            
            const itemInInventory = user.inventory[itemInInventoryIndex];

            // 3. Aplicar efectos y consumir
            const oldStatus = { ...user.status };
            user.status.thirst = Math.min(100, user.status.thirst + (shopItem.effects.thirst || 0));
            user.status.stress = Math.max(0, user.status.stress - Math.abs(shopItem.effects.stress || 0));
            // Aplicar efecto directo a la salud si existe
            user.status.health = Math.max(0, Math.min(100, user.status.health + (shopItem.effects.health || 0)));

            // Actualizar salud general basada en stats
            updateHealth(user);

            // Consumir item
            itemInInventory.quantity -= 1;
            if (itemInInventory.quantity === 0) {
                user.inventory.splice(itemInInventoryIndex, 1);
            }

            await user.save();

            // 4. Construir mensaje de respuesta
            let effectsMessage = '';
            if (shopItem.effects.thirst > 0) {
                effectsMessage += `\n💧 Tu sed disminuyó (+${shopItem.effects.thirst}).`;
            }
            if (shopItem.effects.stress > 0) {
                effectsMessage += `\n😌 Tu estrés se redujo (-${shopItem.effects.stress}).`;
            }
            if (shopItem.effects.health > 0) {
                effectsMessage += `\n❤️ Tu salud mejoró (+${shopItem.effects.health}).`;
            } else if (shopItem.effects.health < 0) {
                effectsMessage += `\n💔 Tu salud empeoró (${shopItem.effects.health}).`;
            }

            const responseMessage = `*¡Salud!* 🍻\n\n@${senderJid.split('@')[0]} ha bebido *un(a) ${shopItem.name}*.${effectsMessage}\n\n*Salud actual:* ${user.status.health}%`;

            return client.sendMessage(chatId, {
                text: responseMessage,
                mentions: [senderJid]
            });

        } catch (error) {
            console.error('Error en el comando beber:', error);
            return client.sendMessage(chatId, { text: '❌ Ocurrió un error al procesar tu acción.' });
        }
    },
};

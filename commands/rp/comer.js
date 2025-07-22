const { findOrCreateUser, updateHealth } = require('../../utils/userUtils');
const ShopItem = require('../../models/ShopItem');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'comer',
    description: 'Come un item de tu inventario para saciar el hambre y reducir el estrés.',
    category: 'rp',
    aliases: ['eat', 'alimentar'],
    async execute(message, args) {
        const sock = getSocket();
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const pushName = message.pushName || '';

        if (args.length === 0) {
            return sock.sendMessage(chatId, { text: 'Debes especificar qué quieres comer. Ejemplo: `.comer pan`' });
        }

        const itemName = args.join(' ').toLowerCase();

        try {
            const user = await findOrCreateUser(senderJid, chatId, pushName);

            if (user.status.isDead) {
                return sock.sendMessage(chatId, { text: '👻 No puedes hacer nada, estás muerto.' });
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
                return sock.sendMessage(chatId, { text: `No existe un item comestible llamado "${itemName}" en la tienda.` });
            }

            if (shopItem.type !== 'food') {
                return sock.sendMessage(chatId, { text: `No puedes comer un(a) "${shopItem.name}".` });
            }

            // 2. Verificar si el usuario tiene ese item en su inventario
            const itemInInventoryIndex = user.inventory.findIndex(item => item.itemId && item.itemId.toString() === shopItem._id.toString() && item.quantity > 0);

            if (itemInInventoryIndex === -1) {
                return sock.sendMessage(chatId, { text: `No tienes "${shopItem.name}" en tu inventario.` });
            }
            
            const itemInInventory = user.inventory[itemInInventoryIndex];

            // 3. Aplicar efectos y consumir
            const oldStatus = { ...user.status };
            user.status.hunger = Math.min(100, user.status.hunger + (shopItem.effects.hunger || 0));
            user.status.stress = Math.max(0, user.status.stress - (shopItem.effects.stress || 0));

            // Actualizar salud general
            updateHealth(user);

            // Consumir item
            itemInInventory.quantity -= 1;
            if (itemInInventory.quantity === 0) {
                user.inventory.splice(itemInInventoryIndex, 1);
            }

            await user.save();

            // 4. Construir mensaje de respuesta
            let effectsMessage = '';
            if (shopItem.effects.hunger > 0) {
                effectsMessage += `\n🍖 Tu hambre ha disminuido.`;
            }
            if (shopItem.effects.stress > 0) {
                effectsMessage += `\n😌 Te sientes más relajado/a.`;
            }
            if (user.status.health > oldStatus.health) {
                effectsMessage += `\n❤️ Tu salud ha mejorado.`;
            } else if (user.status.health < oldStatus.health) {
                effectsMessage += `\n💔 Tu salud ha empeorado.`;
            }

            const responseMessage = `*¡Buen provecho!* 🍽️\n\n@${senderJid.split('@')[0]} ha comido *un(a) ${shopItem.name}*.${effectsMessage}`;

            return sock.sendMessage(chatId, {
                text: responseMessage,
                mentions: [senderJid]
            });

        } catch (error) {
            console.error('Error en el comando comer:', error);
            return sock.sendMessage(chatId, { text: '❌ Ocurrió un error al procesar tu acción.' });
        }
    },
};

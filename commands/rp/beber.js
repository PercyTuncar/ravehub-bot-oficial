const { findOrCreateUser, updateHealth } = require('../../utils/userUtils');
const ShopItem = require('../../models/ShopItem');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'beber',
    aliases: ['tomar'],
    description: 'Bebe un item de tu inventario para saciar la sed y reducir el estrés.',
    category: 'rp',
    async execute(message, args) {
        const sock = getSocket();
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const pushName = message.pushName || '';

        if (args.length === 0) {
            return sock.sendMessage(chatId, { text: 'Debes especificar qué quieres beber. Ejemplo: `.beber cerveza heladita`' });
        }

        const itemName = args.join(' ').toLowerCase();

        try {
            const user = await findOrCreateUser(senderJid, chatId, pushName);

            if (user.status.isDead) {
                return sock.sendMessage(chatId, { text: '👻 No puedes hacer nada, estás muerto.' });
            }

            const itemInInventoryIndex = user.inventory.findIndex(item => item.name.toLowerCase() === itemName && item.quantity > 0);

            if (itemInInventoryIndex === -1) {
                return sock.sendMessage(chatId, { text: `No tienes "${itemName}" en tu inventario.` });
            }

            const itemInInventory = user.inventory[itemInInventoryIndex];
            
            // Fallback por si el item no tiene `itemId` (datos antiguos)
            if (!itemInInventory.itemId) {
                return sock.sendMessage(chatId, { text: `❌ El item "${itemName}" en tu inventario es antiguo y no puede ser consumido. Contacta a un admin.` });
            }

            const shopItem = await ShopItem.findById(itemInInventory.itemId);

            if (!shopItem) {
                return sock.sendMessage(chatId, { text: `❌ Error: No se encontró la definición del item "${itemName}". Contacta a un admin.` });
            }

            if (shopItem.type !== 'drink') {
                return sock.sendMessage(chatId, { text: `No puedes beber un(a) "${shopItem.name}".` });
            }

            // Aplicar efectos
            const oldStatus = { ...user.status };
            user.status.thirst = Math.min(100, user.status.thirst + (shopItem.effects.thirst || 0));
            user.status.stress = Math.max(0, user.status.stress - (shopItem.effects.stress || 0));

            // Actualizar salud general
            updateHealth(user);

            // Consumir item
            itemInInventory.quantity -= 1;
            if (itemInInventory.quantity === 0) {
                user.inventory.splice(itemInInventoryIndex, 1);
            }

            await user.save();

            // Construir mensaje de respuesta
            let effectsMessage = '';
            if (shopItem.effects.thirst > 0) {
                effectsMessage += `\n💧 Tu sed ha disminuido.`;
            }
            if (shopItem.effects.stress > 0) {
                effectsMessage += `\n😌 Te sientes más relajado/a.`;
            }
            if (user.status.health > oldStatus.health) {
                effectsMessage += `\n❤️ Tu salud ha mejorado.`;
            } else if (user.status.health < oldStatus.health) {
                effectsMessage += `\n💔 Tu salud ha empeorado.`;
            }

            const responseMessage = `*¡Salud!* 🍻\n\n@${senderJid.split('@')[0]} ha bebido *un(a) ${shopItem.name}*.${effectsMessage}`;

            return sock.sendMessage(chatId, {
                text: responseMessage,
                mentions: [senderJid]
            });

        } catch (error) {
            console.error('Error en el comando beber:', error);
            return sock.sendMessage(chatId, { text: '❌ Ocurrió un error al procesar tu acción.' });
        }
    },
};

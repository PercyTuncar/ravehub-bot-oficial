const { findOrCreateUser, updateHealth } = require('../../utils/userUtils');
const ShopItem = require('../../models/ShopItem');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'beber',
    aliases: ['tomar', 'drink'],
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

            // 1. Buscar el ShopItem en la base de datos por nombre o alias
            const searchPattern = itemName.replace(/s$/, '(s)?'); // Maneja plurales simples
            const shopItem = await ShopItem.findOne({
                $or: [
                    { name: new RegExp(`^${searchPattern}$`, 'i') },
                    { aliases: new RegExp(`^${searchPattern}$`, 'i') }
                ]
            });

            if (!shopItem) {
                return sock.sendMessage(chatId, { text: `No existe un item bebible llamado "${itemName}" en el bar.` });
            }

            if (shopItem.type !== 'drink') {
                return sock.sendMessage(chatId, { text: `No puedes beber un(a) "${shopItem.name}".` });
            }

            // 2. Verificar si el usuario tiene ese item en su inventario
            const itemInInventoryIndex = user.inventory.findIndex(item => item.itemId && item.itemId.toString() === shopItem._id.toString() && item.quantity > 0);

            if (itemInInventoryIndex === -1) {
                return sock.sendMessage(chatId, { text: `No tienes "${shopItem.name}" en tu inventario.` });
            }
            
            const itemInInventory = user.inventory[itemInInventoryIndex];

            // 3. Aplicar efectos y consumir
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

            // 4. Construir mensaje de respuesta
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

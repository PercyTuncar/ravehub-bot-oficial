const User = require('../../models/User');
const ShopItem = require('../../models/ShopItem');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'comer',
    description: 'Come un item de tu inventario para saciar el hambre.',
    category: 'rp',
    async execute(message, args) {
        const sock = getSocket();
        const senderId = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        
        const user = await User.findOne({ jid: senderId, groupId: chatId });

        if (!user) {
            return sock.sendMessage(chatId, { text: 'No tienes un perfil. Usa `.iniciar` para crear uno.' });
        }
        if (user.status.isDead) {
            return sock.sendMessage(chatId, { text: 'Estás muerto 💀. No puedes comer.' });
        }

        let itemToEat;
        let shopItem;

        if (args.length > 0) {
            const itemName = args.join(' ').toLowerCase();
            
            // Buscar el item en la tienda por nombre o alias
            const shopItemToFind = await ShopItem.findOne({
                $or: [
                    { name: new RegExp(`^${itemName}$`, 'i') },
                    { aliases: new RegExp(`^${itemName}$`, 'i') }
                ]
            });

            if (!shopItemToFind || shopItemToFind.type !== 'food') {
                 return sock.sendMessage(chatId, { 
                    text: `El item "${itemName}" no es comida o no existe.`,
                    mentions: [senderId]
                });
            }

            // Buscar el item en el inventario del usuario usando el ID del item de la tienda
            itemToEat = user.inventory.find(invItem => invItem.itemId.equals(shopItemToFind._id));
            shopItem = shopItemToFind;

        } else {
            // Si no se especificó un item, buscar el primer item de comida en el inventario
            const allFoodShopItems = await ShopItem.find({ $or: [{ type: 'food' }, { type: 'drink' }] });
            const allFoodShopItemIds = allFoodShopItems.map(item => item._id.toString());
            
            // Se añade la comprobación "invItem.itemId &&" para ignorar items corruptos
            itemToEat = user.inventory.find(invItem => invItem.itemId && allFoodShopItemIds.includes(invItem.itemId.toString()));
            
            if (itemToEat) {
                shopItem = allFoodShopItems.find(si => si._id.equals(itemToEat.itemId));
            }
        }

        if (!itemToEat || itemToEat.quantity <= 0) {
            return sock.sendMessage(chatId, { 
                text: `@${senderId.split('@')[0]}, no tienes comida en tu inventario. Usa \`.shop\` para ver la tienda, \`.buy\` para comprar y \`.work\` si necesitas dinero.`,
                mentions: [senderId]
            });
        }

        // Comprobar si el item tiene efectos definidos
        if (!shopItem || !shopItem.effects || (shopItem.effects.hunger === 0 && shopItem.effects.thirst === 0 && shopItem.effects.stress === 0)) {
            return sock.sendMessage(chatId, { text: `El item "${shopItem.name}" no es comestible ni bebible.` });
        }

        // Aplicar efectos
        const initialStatus = { ...user.status };
        user.status.hunger = Math.min(100, user.status.hunger + (shopItem.effects.hunger || 0));
        user.status.thirst = Math.min(100, user.status.thirst + (shopItem.effects.thirst || 0));
        user.status.stress = Math.max(0, user.status.stress + (shopItem.effects.stress || 0)); // El estrés se reduce, por eso el + con valor negativo

        itemToEat.quantity -= 1;

        if (itemToEat.quantity <= 0) {
            user.inventory = user.inventory.filter(invItem => !invItem._id.equals(itemToEat._id));
        }
        
        user.lastInteraction = Date.now();
        await user.save();

        // Mensaje de respuesta detallado
        let effectsMessage = `Has comido ${shopItem.name}.`;
        if (user.status.hunger > initialStatus.hunger) {
            effectsMessage += `\nTu hambre ahora es ${user.status.hunger}%.`;
        }
        if (user.status.thirst > initialStatus.thirst) {
            effectsMessage += `\nTu sed ahora es ${user.status.thirst}%.`;
        }
        if (user.status.stress < initialStatus.stress) {
            effectsMessage += `\nTu estrés se ha reducido a ${user.status.stress}%.`;
        }

        await sock.sendMessage(chatId, { text: effectsMessage });
    },
};

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
            const allFoodShopItems = await ShopItem.find({ type: 'food' });
            const allFoodShopItemIds = allFoodShopItems.map(item => item._id.toString());
            
            itemToEat = user.inventory.find(invItem => allFoodShopItemIds.includes(invItem.itemId.toString()));
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

        if (!shopItem || !shopItem.effects || shopItem.effects.hunger === 0) {
            return sock.sendMessage(chatId, { text: `El item "${itemToEat.name}" no es comestible.` });
        }

        user.status.hunger = Math.min(100, user.status.hunger + shopItem.effects.hunger);
        itemToEat.quantity -= 1;

        if (itemToEat.quantity <= 0) {
            user.inventory = user.inventory.filter(invItem => !invItem._id.equals(itemToEat._id));
        }
        
        user.lastInteraction = Date.now();
        await user.save();

        await sock.sendMessage(chatId, { text: `Has comido ${shopItem.name}. Tu hambre ahora es ${user.status.hunger}%.` });
    },
};

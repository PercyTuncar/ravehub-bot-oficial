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
        
        const user = await User.findOne({ jid: senderId, groupId: chatId }).populate('inventory.itemId');

        if (!user) {
            return sock.sendMessage(chatId, { text: 'No tienes un perfil. Usa `.iniciar` para crear uno.' });
        }
        if (user.status.isDead) {
            return sock.sendMessage(chatId, { text: 'Estás muerto 💀. No puedes comer.' });
        }

        let itemToEat;
        const foodInInventory = user.inventory.filter(item => item.itemId && item.itemId.type === 'food');

        if (args.length > 0) {
            const itemName = args.join(' ').toLowerCase();
            itemToEat = foodInInventory.find(item => item.name.toLowerCase() === itemName);
        } else {
            // Come el primer item de comida que encuentre
            itemToEat = foodInInventory[0];
        }

        if (!itemToEat || itemToEat.quantity <= 0) {
            return sock.sendMessage(chatId, { text: 'No tienes comida en tu inventario. Usa `.tienda` para comprar algo y `.work` si necesitas dinero.' });
        }

        const shopItem = itemToEat.itemId;
        if (!shopItem || !shopItem.effects || shopItem.effects.hunger === 0) {
            return sock.sendMessage(chatId, { text: `El item "${itemToEat.name}" no es comestible.` });
        }

        user.status.hunger = Math.min(100, user.status.hunger + shopItem.effects.hunger);
        itemToEat.quantity -= 1;

        if (itemToEat.quantity <= 0) {
            user.inventory = user.inventory.filter(invItem => invItem._id.toString() !== itemToEat._id.toString());
        }
        
        user.lastInteraction = Date.now();
        await user.save();

        await sock.sendMessage(chatId, { text: `Has comido ${shopItem.name}. Tu hambre ahora es ${user.status.hunger}%.` });
    },
};

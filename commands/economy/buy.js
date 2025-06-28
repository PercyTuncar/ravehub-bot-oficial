const User = require('../../models/User');
const ShopItem = require('../../models/ShopItem');

module.exports = {
    name: 'buy',
    description: 'Compra un item de la tienda.',
    category: 'economy',
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        if (args.length === 0) {
            return sock.sendMessage(chatId, { text: 'Debes especificar el item que quieres comprar. Uso: .buy <nombre del item>' });
        }

        const itemName = args.join(' ').toLowerCase();

        try {
            let user = await User.findOne({ jid: senderJid });
            if (!user) {
                user = new User({ jid: senderJid, name: message.pushName || senderJid.split('@')[0] });
                await user.save();
            }

            const itemToBuy = await ShopItem.findOne({ name: new RegExp(`^${itemName}$`, 'i') });

            if (!itemToBuy) {
                return sock.sendMessage(chatId, { text: `El item "${itemName}" no existe en la tienda.` });
            }

            if (user.economy.wallet < itemToBuy.price) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero para comprar ${itemToBuy.name}. Necesitas ${itemToBuy.price} 🪙.` });
            }

            user.economy.wallet -= itemToBuy.price;

            const existingItem = user.inventory.find(invItem => invItem.itemId.equals(itemToBuy._id));

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                user.inventory.push({
                    itemId: itemToBuy._id,
                    name: itemToBuy.name,
                    quantity: 1,
                });
            }

            await user.save();

            await sock.sendMessage(chatId, {
                text: `¡Felicidades! Has comprado *${itemToBuy.name}* por ${itemToBuy.price} 🪙.`, 
                mentions: [senderJid]
            });

        } catch (error) {
            console.error('Error en el comando buy:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al intentar comprar el item.' });
        }
    }
};

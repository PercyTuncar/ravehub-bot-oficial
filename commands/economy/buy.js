const User = require('../../models/User');
const ShopItem = require('../../models/ShopItem');

module.exports = {
    name: 'buy',
    description: 'Compra un item de la tienda.',
    usage: '.buy <nombre del item>',
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

            const price = itemToBuy.price;
            const wallet = user.economy.wallet;
            const bank = user.economy.bank;
            let paymentMessage = '';

            if (wallet + bank < price) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero ni en la cartera ni en el banco para comprar *${itemToBuy.name}*. Necesitas ${price} 💵.` });
            }

            if (wallet >= price) {
                // Pago completo con cartera (efectivo)
                user.economy.wallet -= price;
                paymentMessage = `Has pagado en efectivo *${price} 💵* por tu *${itemToBuy.name}*.`;
            } else {
                const paymentMethods = ['yapeaste', 'plineaste', 'transferiste'];
                const randomMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
                
                if (wallet > 0) {
                    // Pago mixto: parte cartera, parte banco
                    const fromBank = price - wallet;
                    user.economy.wallet = 0;
                    user.economy.bank -= fromBank;
                    paymentMessage = `Pagaste *${wallet} 💵* en efectivo y ${randomMethod} *${fromBank} 💵* desde tu banco para comprar tu *${itemToBuy.name}*.`;
                } else {
                    // Pago completo con banco
                    user.economy.bank -= price;
                    paymentMessage = `Has ${randomMethod} *${price} 💵* desde tu banco para comprar tu *${itemToBuy.name}*.`;
                }
            }

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
                text: `🛍️ *¡Compra exitosa!* 🛍️

${paymentMessage}

*Nuevo saldo en cartera:* ${user.economy.wallet} 💵
*Nuevo saldo en banco:* ${user.economy.bank} 💵`, 
                mentions: [senderJid]
            });

        } catch (error) {
            console.error('Error en el comando buy:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al intentar comprar el item.' });
        }
    }
};

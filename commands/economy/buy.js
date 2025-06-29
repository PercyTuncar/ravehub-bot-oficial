const { findOrCreateUser } = require('../../utils/userUtils');
const { handleDebtPayment } = require('../../utils/debtManager');
const ShopItem = require('../../models/ShopItem');

module.exports = {
    name: 'buy',
    description: 'Comprar un ítem.',
    aliases: ['comprar'],
    usage: '.buy <item_id>',
    category: 'economy',
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        if (args.length === 0) {
            return sock.sendMessage(chatId, { text: 'Debes especificar el item que quieres comprar. Uso: .buy <nombre del item>' });
        }

        const itemName = args.join(' ').toLowerCase();

        try {
            // Refactorización: Usar la función centralizada para obtener el usuario.
            let user = await findOrCreateUser(senderJid, message.pushName);

            const itemToBuy = await ShopItem.findOne({ name: new RegExp(`^${itemName}$`, 'i') });

            if (!itemToBuy) {
                return sock.sendMessage(chatId, { text: `El item "${itemName}" no existe en la tienda.` });
            }

            const price = itemToBuy.price;

            // Corrección: Usar la función centralizada para manejar la deuda.
            if (user.judicialDebt > 0) {
                const { remainingAmount, debtMessage, levelChangeMessage } = handleDebtPayment(user, price);
                
                if (debtMessage) {
                    await sock.sendMessage(chatId, { text: debtMessage + (levelChangeMessage ? `\n${levelChangeMessage}` : '') });
                    if (remainingAmount <= 0) {
                         await user.save();
                         return;
                    }
                }
            }

            const wallet = user.economy.wallet;
            const bank = user.economy.bank;
            let paymentMessage = '';

            if (wallet + bank < price) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero para comprar *${itemToBuy.name}*. Necesitas ${price} 💵.` });
            }

            if (wallet >= price) {
                user.economy.wallet -= price;
                paymentMessage = `Has pagado en efectivo *${price} 💵* por tu *${itemToBuy.name}*.`;
            } else {
                const paymentMethods = ['yapeaste', 'plineaste', 'transferiste'];
                const randomMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
                
                if (wallet > 0) {
                    const fromBank = price - wallet;
                    user.economy.wallet = 0;
                    user.economy.bank -= fromBank;
                    paymentMessage = `Pagaste *${wallet} 💵* en efectivo y ${randomMethod} *${fromBank} 💵* desde tu banco para comprar tu *${itemToBuy.name}*.`;
                } else {
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
                text: `🛍️ ¡Compra exitosa! 🛍️\n\n${paymentMessage}\n\n*Balance actual:*\n*Cartera:* ${user.economy.wallet} 💵\n*Banco:* ${user.economy.bank} 💵`
            });

        } catch (error) {
            console.error('Error en el comando buy:', error);
            sock.sendMessage(chatId, { text: '❌ Ocurrió un error al procesar tu compra.' });
        }
    },
};

const User = require('../../models/User');
const ShopItem = require('../../models/ShopItem');
const { getCurrency } = require('../../utils/groupUtils');
const bot = require('../../bot');
const { findOrCreateUser } = require('../../utils/userUtils');

module.exports = {
    name: 'buy',
    description: 'Comprar un ítem.',
    aliases: ['comprar'],
    usage: '.buy <cantidad> <nombre del item>',
    category: 'economy',
    async execute(message, args, commands) {
        const sock = bot.getSocket();
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

        if (args.length === 0) {
            return sock.sendMessage(chatId, { text: 'Debes especificar el item que quieres comprar. Uso: .buy <cantidad> <nombre del item>' });
        }

        let quantity = 1;
        let itemNameInput = args.join(' ').toLowerCase();
        const quantityArg = args.find(arg => !isNaN(parseInt(arg)));

        if (quantityArg) {
            quantity = parseInt(quantityArg);
            itemNameInput = args.filter(arg => arg !== quantityArg).join(' ').toLowerCase();
        }

        if (quantity <= 0 || !Number.isInteger(quantity)) {
            return sock.sendMessage(chatId, { text: 'La cantidad debe ser un número entero y positivo.' });
        }

        try {
            await findOrCreateUser(senderJid, chatId, message.pushName);

            const itemToBuy = await ShopItem.findOne({ 
                $or: [
                    { name: new RegExp(`^${itemNameInput.trim()}$`, 'i') }, 
                    { aliases: new RegExp(`^${itemNameInput.trim()}$`, 'i') } 
                ]
            });

            if (!itemToBuy) {
                return sock.sendMessage(chatId, { text: `El item "${itemNameInput}" no existe en la tienda.` });
            }

            const totalPrice = itemToBuy.price * quantity;
            let paymentMessage = '';
            let updatedUser;

            const user = await User.findOne({ jid: senderJid, groupId: chatId });

            if (user.economy.wallet + user.economy.bank < totalPrice) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero para comprar *${quantity} ${itemToBuy.name}*. Necesitas ${currency} ${totalPrice.toLocaleString()}.` });
            }

            if (user.economy.wallet >= totalPrice) {
                updatedUser = await User.findOneAndUpdate(
                    { _id: user._id, 'economy.wallet': { $gte: totalPrice } },
                    { $inc: { 'economy.wallet': -totalPrice } },
                    { new: true }
                );
                if(updatedUser) paymentMessage = `Has pagado en efectivo *${currency} ${totalPrice.toLocaleString()}*.`;
            } else {
                const fromBank = totalPrice - user.economy.wallet;
                const fromWallet = user.economy.wallet;
                
                updatedUser = await User.findOneAndUpdate(
                    { _id: user._id, 'economy.bank': { $gte: fromBank } },
                    { $inc: { 'economy.bank': -fromBank, 'economy.wallet': -fromWallet } },
                    { new: true }
                );

                if (updatedUser) {
                    const paymentMethods = ['yapeaste', 'plineaste', 'transferiste'];
                    const randomMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
                    if (fromWallet > 0) {
                        paymentMessage = `Pagaste *${currency} ${fromWallet.toLocaleString()}* en efectivo y ${randomMethod} *${currency} ${fromBank.toLocaleString()}* desde tu banco.`;
                    } else {
                        paymentMessage = `Has ${randomMethod} *${currency} ${totalPrice.toLocaleString()}* desde tu banco.`;
                    }
                }
            }

            if (!updatedUser) {
                return sock.sendMessage(chatId, { text: '❌ Hubo un problema con el pago. Es posible que tus fondos hayan cambiado. Inténtalo de nuevo.' });
            }

            // Lógica de inventario corregida y segura
            const existingItem = updatedUser.inventory.find(invItem => invItem.itemId.toString() === itemToBuy._id.toString());

            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                updatedUser.inventory.push({
                    itemId: itemToBuy._id,
                    name: itemToBuy.name,
                    quantity: quantity,
                });
            }

            await updatedUser.save();

            const purchaseDescription = `*${quantity} ${itemToBuy.name}${quantity > 1 ? 's' : ''}*`;
            await sock.sendMessage(chatId, {
                text: `🛍️ *¡Compra exitosa!* 🛍️\n\n¡@${senderJid.split('@')[0]}! Has comprado ${purchaseDescription}.\n\n${paymentMessage}`,
                mentions: [senderJid]
            });

        } catch (error) {
            console.error('Error en el comando buy:', error);
            sock.sendMessage(chatId, { text: '❌ Ocurrió un error al procesar tu compra.' });
        }
    },
};
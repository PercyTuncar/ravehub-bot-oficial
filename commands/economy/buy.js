const { findOrCreateUser } = require('../../utils/userUtils');
const { handleDebtPayment } = require('../../utils/debtManager');
const ShopItem = require('../../models/ShopItem');
const { getCurrency } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'buy',
    description: 'Comprar un ítem.',
    aliases: ['comprar'],
    usage: '.buy <item_id>',
    category: 'economy',
    async execute(message, args) {
        const sock = getSocket();
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

        if (args.length === 0) {
            return sock.sendMessage(chatId, { text: 'Debes especificar el item que quieres comprar. Uso: .buy <nombre del item>' });
        }

        const itemName = args.join(' ').toLowerCase();

        try {
            // Refactorización: Usar la función centralizada para obtener el usuario.
            let user = await findOrCreateUser(senderJid, chatId, message.pushName);

            const itemToBuy = await ShopItem.findOne({ name: new RegExp(`^${itemName}$`, 'i') });

            if (!itemToBuy) {
                return sock.sendMessage(chatId, { text: `El item "${itemName}" no existe en la tienda.` });
            }

            const price = itemToBuy.price;
            let paymentMessage = '';

            // Lógica de compra revisada
            if (user.judicialDebt > 0) {
                // Usuario con deuda: solo puede usar la cartera
                if (user.economy.wallet < price) {
                    return sock.sendMessage(chatId, { text: `ℹ️ Tienes una deuda judicial pendiente y solo puedes comprar con dinero en efectivo (cartera).\n\nNo tienes suficiente para comprar *${itemToBuy.name}*. Necesitas ${currency} ${price} y tienes ${currency} ${user.economy.wallet.toFixed(2)} en la cartera.` });
                }
                
                user.economy.wallet -= price;
                paymentMessage = `Has pagado en efectivo *${currency} ${price}* por tu *${itemToBuy.name}*.`;

            } else {
                // Usuario sin deuda: puede usar cartera y banco
                if (user.economy.wallet + user.economy.bank < price) {
                    return sock.sendMessage(chatId, { text: `No tienes suficiente dinero para comprar *${itemToBuy.name}*. Necesitas ${currency} ${price}.` });
                }

                if (user.economy.wallet >= price) {
                    user.economy.wallet -= price;
                    paymentMessage = `Has pagado en efectivo *${currency} ${price}* por tu *${itemToBuy.name}*.`;
                } else {
                    const paymentMethods = ['yapeaste', 'plineaste', 'transferiste'];
                    const randomMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
                    
                    const fromBank = price - user.economy.wallet;
                    const fromWallet = user.economy.wallet;
                    
                    user.economy.wallet = 0;
                    user.economy.bank -= fromBank;

                    if (fromWallet > 0) {
                        paymentMessage = `Pagaste *${currency} ${fromWallet.toFixed(2)}* en efectivo y ${randomMethod} *${currency} ${fromBank.toFixed(2)}* desde tu banco para comprar tu *${itemToBuy.name}*.`;
                    } else {
                        paymentMessage = `Has ${randomMethod} *${currency} ${price}* desde tu banco para comprar tu *${itemToBuy.name}*.`;
                    }
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

            // --- Mensaje de Compra Personalizado ---
            const itemNameLower = itemToBuy.name.toLowerCase();
            const mentions = [senderJid];

            if (itemNameLower === 'ramo de rosas') {
                const roseImages = [
                    'https://res.cloudinary.com/amadodedios/image/upload/v1751338565/ramo-de-24-rosas-rojas-en-papel-koreano_hn2muy.jpg',
                    'https://res.cloudinary.com/amadodedios/image/upload/v1751338565/WhatsApp-Image-2024-05-16-at-11.04.59_srlrbs.jpg',
                    'https://res.cloudinary.com/amadodedios/image/upload/v1751338565/DSC02967_tolmkw.jpg'
                ];
                const randomImage = roseImages[Math.floor(Math.random() * roseImages.length)];
                const successMessage = `🌹 *¡Un detalle especial para alguien especial!* 🌹\n\n¡Felicidades, @${senderJid.split('@')[0]}! Has comprado un *Ramo de rosas*.\n\n${paymentMessage}\n\n*Balance actual:*\n> *Cartera:* ${currency} ${user.economy.wallet.toLocaleString()}\n> *Banco:* ${currency} ${user.economy.bank.toLocaleString()}`;

                await sock.sendMessage(chatId, {
                    image: { url: randomImage },
                    caption: successMessage,
                    mentions: mentions
                });

            } else if (itemNameLower === 'cerveza heladita') {
                const successMessage = `🍻 *¡Salud por esa compra!* 🍻\n\n¡Felicidades, @${senderJid.split('@')[0]}! Has comprado una *Cerveza Heladita*.\n\n${paymentMessage}\n\n*Balance actual:*\n> *Cartera:* ${currency} ${user.economy.wallet.toLocaleString()}\n> *Banco:* ${currency} ${user.economy.bank.toLocaleString()}`;

                await sock.sendMessage(chatId, {
                    image: { url: 'https://res.cloudinary.com/amadodedios/image/upload/fl_preserve_transparency/v1751939301/images_byic4s.jpg' },
                    caption: successMessage,
                    mentions: mentions
                });

            } else {
                // Mensaje de compra genérico para otros items
                await sock.sendMessage(chatId, {
                    text: `🛍️ *¡Compra exitosa!* 🛍️\n\n${paymentMessage}\n\n*Balance actual:*\n> *Cartera:* ${currency} ${user.economy.wallet.toLocaleString()}\n> *Banco:* ${currency} ${user.economy.bank.toLocaleString()}`,
                    mentions
                });
            }

        } catch (error) {
            console.error('Error en el comando buy:', error);
            sock.sendMessage(chatId, { text: '❌ Ocurrió un error al procesar tu compra.' });
        }
    },
};

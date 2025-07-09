const { findOrCreateUser } = require('../../utils/userUtils');
const { handleDebtPayment } = require('../../utils/debtManager');
const ShopItem = require('../../models/ShopItem');
const { getCurrency } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'buy',
    description: 'Comprar un ítem.',
    aliases: ['comprar'],
    usage: '.buy <cantidad> <nombre del item>',
    category: 'economy',
    async execute(message, args) {
        const sock = getSocket();
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

        if (args.length === 0) {
            return sock.sendMessage(chatId, { text: 'Debes especificar el item que quieres comprar. Uso: .buy <cantidad> <nombre del item>' });
        }

        // --- Lógica para parsear cantidad y nombre ---
        let quantity = 1;
        let itemNameInput = args.join(' ').toLowerCase();
        const quantityArg = args.find(arg => !isNaN(parseInt(arg)));

        if (quantityArg) {
            quantity = parseInt(quantityArg);
            itemNameInput = args.filter(arg => arg !== quantityArg).join(' ').toLowerCase();
        }

        let finalItemName = itemNameInput;
        let purchaseUnit = 'unidad(es)';
        const beerName = 'cerveza heladita';

        // Lógica para "media caja", "caja" o "cajas"
        if (itemNameInput.includes(beerName)) {
            if (itemNameInput.includes('media caja')) {
                quantity = 6;
                finalItemName = beerName;
                purchaseUnit = 'media caja';
            } else if (itemNameInput.includes('caja')) {
                const cajas = quantity; // La cantidad parseada ahora son las cajas
                quantity = cajas * 12; // Convertir cajas a unidades
                finalItemName = beerName;
                purchaseUnit = cajas > 1 ? 'cajas' : 'caja';
            }
        }

        if (quantity <= 0 || !Number.isInteger(quantity)) {
            return sock.sendMessage(chatId, { text: 'La cantidad debe ser un número entero y positivo.' });
        }

        try {
            let user = await findOrCreateUser(senderJid, chatId, message.pushName);

            // Lógica de búsqueda mejorada para singular/plural
            const cleanedItemName = finalItemName.replace(/caja(s)?\sde\s/,'').trim();
            const searchPattern = cleanedItemName.split(' ').map(word => {
                if (word.endsWith('s')) {
                    return `${word.slice(0, -1)}(s)?`;
                }
                return word;
            }).join(' ');

            const itemToBuy = await ShopItem.findOne({
                $or: [
                    { name: new RegExp(`^${searchPattern}$`, 'i') },
                    { aliases: new RegExp(`^${searchPattern}$`, 'i') }
                ]
            });

            if (!itemToBuy) {
                return sock.sendMessage(chatId, { text: `El item "${itemNameInput}" no existe en la tienda.` });
            }

            const totalPrice = itemToBuy.price * quantity;
            let paymentMessage = '';

            // Lógica de compra revisada
            if (user.judicialDebt > 0) {
                if (user.economy.wallet < totalPrice) {
                    return sock.sendMessage(chatId, { text: `ℹ️ Tienes una deuda judicial y no tienes suficiente dinero en efectivo para esta compra.\n\nNecesitas ${currency} ${totalPrice.toLocaleString()} y tienes ${currency} ${user.economy.wallet.toLocaleString()} en la cartera.` });
                }
                user.economy.wallet -= totalPrice;
                paymentMessage = `Has pagado en efectivo *${currency} ${totalPrice.toLocaleString()}*.`;

            } else {
                if (user.economy.wallet + user.economy.bank < totalPrice) {
                    return sock.sendMessage(chatId, { text: `No tienes suficiente dinero para comprar *${quantity} ${itemToBuy.name}*. Necesitas ${currency} ${totalPrice.toLocaleString()}.` });
                }

                if (user.economy.wallet >= totalPrice) {
                    user.economy.wallet -= totalPrice;
                    paymentMessage = `Has pagado en efectivo *${currency} ${totalPrice.toLocaleString()}*.`;
                } else {
                    const paymentMethods = ['yapeaste', 'plineaste', 'transferiste'];
                    const randomMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
                    
                    const fromBank = totalPrice - user.economy.wallet;
                    const fromWallet = user.economy.wallet;
                    
                    user.economy.wallet = 0;
                    user.economy.bank -= fromBank;

                    if (fromWallet > 0) {
                        paymentMessage = `Pagaste *${currency} ${fromWallet.toLocaleString()}* en efectivo y ${randomMethod} *${currency} ${fromBank.toLocaleString()}* desde tu banco.`;
                    } else {
                        paymentMessage = `Has ${randomMethod} *${currency} ${totalPrice.toLocaleString()}* desde tu banco.`;
                    }
                }
            }

            const existingItem = user.inventory.find(invItem => invItem.itemId.toString() === itemToBuy._id.toString());

            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                user.inventory.push({
                    itemId: itemToBuy._id,
                    name: itemToBuy.name,
                    quantity: quantity,
                });
            }

            await user.save();

            // --- Mensaje de Compra Personalizado ---
            const itemNameLower = itemToBuy.name.toLowerCase();
            const mentions = [senderJid];
            let purchaseDescription = '';

            // Cambios para media caja de cerveza heladita
            if (purchaseUnit === 'media caja' && itemNameLower === 'cerveza heladita') {
                purchaseDescription = `*media caja de Cervezas Heladitas*`;
            } else if (purchaseUnit.includes('caja') && itemNameLower === 'cerveza heladita') {
                const cajas = quantity / 12;
                purchaseDescription = `*${cajas} ${purchaseUnit} de Cervezas Heladitas*`;
            } else if (purchaseUnit === 'media caja') {
                purchaseDescription = `*media caja de ${itemToBuy.name}s*`;
            } else if (purchaseUnit.includes('caja')) {
                const cajas = quantity / 12;
                purchaseDescription = `*${cajas} ${purchaseUnit} de ${itemToBuy.name}s*`;
            } else {
                purchaseDescription = `*${quantity} ${itemToBuy.name}${quantity > 1 ? 's' : ''}*`;
            }

            if (itemNameLower === 'ramo de rosas') {
                const roseImages = [
                    'https://res.cloudinary.com/amadodedios/image/upload/v1751338565/ramo-de-24-rosas-rojas-en-papel-koreano_hn2muy.jpg',
                    'https://res.cloudinary.com/amadodedios/image/upload/v1751338565/WhatsApp-Image-2024-05-16-at-11.04.59_srlrbs.jpg',
                    'https://res.cloudinary.com/amadodedios/image/upload/v1751338565/DSC02967_tolmkw.jpg'
                ];
                const randomImage = roseImages[Math.floor(Math.random() * roseImages.length)];
                const successMessage = `🌹 *¡Un detalle especial para alguien especial!* 🌹\n\n¡Felicidades, @${senderJid.split('@')[0]}! Has comprado un *Ramo de rosas*.\n\n${paymentMessage}`;

                await sock.sendMessage(chatId, {
                    image: { url: randomImage },
                    caption: successMessage,
                    mentions: mentions
                });

            } else if (itemNameLower === 'cerveza heladita') {
                const successMessage = `🍻 *¡Salud por esa compra!* 🍻\n\n¡Felicidades, @${senderJid.split('@')[0]}! Has comprado ${purchaseDescription}.\n\n${paymentMessage}`;

                await sock.sendMessage(chatId, {
                    image: { url: 'https://res.cloudinary.com/amadodedios/image/upload/fl_preserve_transparency/v1751939301/images_byic4s.jpg' },
                    caption: successMessage,
                    mentions: mentions
                });

            } else {
                // Mensaje de compra genérico para otros items
                await sock.sendMessage(chatId, {
                    text: `🛍️ *¡Compra exitosa!* 🛍️\n\nHas comprado ${purchaseDescription}.\n\n${paymentMessage}`,
                    mentions
                });
            }

        } catch (error) {
            console.error('Error en el comando buy:', error);
            sock.sendMessage(chatId, { text: '❌ Ocurrió un error al procesar tu compra.' });
        }
    },
};

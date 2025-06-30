const { findOrCreateUser } = require('../../utils/userUtils');

module.exports = {
    name: 'give',
    description: 'Dar dinero a usuario.',
    aliases: ['dar'],
    usage: '.give @usuario <cantidad> <nombre del item>',
    category: 'economy',
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        
        // Extraer cantidad y nombre del item
        const quantityArg = args.find(arg => !isNaN(parseInt(arg)));
        const quantity = quantityArg ? parseInt(quantityArg) : 1; // Por defecto es 1 si no se especifica
        const itemName = args.filter(arg => arg !== quantityArg && !arg.startsWith('@')).join(' ').toLowerCase();

        if (!mentionedJid || !itemName) {
            return sock.sendMessage(chatId, { text: `Formato incorrecto. Uso: *.give @usuario <cantidad> <nombre del item>*` });
        }

        if (quantity <= 0 || !Number.isInteger(quantity)) {
            return sock.sendMessage(chatId, { text: 'La cantidad debe ser un número entero y positivo.' });
        }

        if (senderJid === mentionedJid) {
            return sock.sendMessage(chatId, { text: 'No puedes regalar items a ti mismo.' });
        }

        try {
            // Refactorización: Usar la función centralizada para obtener el emisor.
            const sender = await findOrCreateUser(senderJid, chatId, message.pushName);

            const itemInInventory = sender.inventory.find(item => item.name.toLowerCase() === itemName);

            if (!itemInInventory || itemInInventory.quantity < quantity) {
                return sock.sendMessage(chatId, { text: `No tienes suficientes "${itemName}" en tu inventario. Tienes ${itemInInventory ? itemInInventory.quantity : 0}.` });
            }

            // Refactorización: Usar la función centralizada para obtener el receptor.
            const targetName = message.message.extendedTextMessage?.contextInfo?.pushName || mentionedJid.split('@')[0];
            const target = await findOrCreateUser(mentionedJid, chatId, targetName);

            // Poblar el inventario del emisor para acceder al emoji del item
            await sender.populate('inventory.itemId');
            const populatedItem = sender.inventory.find(item => item.name.toLowerCase() === itemName);

            // Quitar item del inventario del emisor
            itemInInventory.quantity -= quantity;
            if (itemInInventory.quantity === 0) {
                sender.inventory = sender.inventory.filter(item => item.name.toLowerCase() !== itemName);
            }

            // Añadir item al inventario del receptor
            const targetItem = target.inventory.find(item => item.itemId.equals(itemInInventory.itemId));
            if (targetItem) {
                targetItem.quantity += quantity;
            } else {
                target.inventory.push({
                    itemId: itemInInventory.itemId,
                    name: itemInInventory.name,
                    quantity: quantity,
                });
            }

            await sender.save();
            await target.save();

            // --- Mensaje de Regalo Mejorado ---
            const senderName = sender.name.split(' ')[0];
            const targetNameForMsg = target.name.split(' ')[0];
            const giftedItemName = itemInInventory.name;
            const itemEmoji = populatedItem.itemId.emoji || '🎁';

            let giftMessage = '';
            const itemNameLower = giftedItemName.toLowerCase();

            // Usar un switch para manejar los mensajes personalizados
            switch (itemNameLower) {
                case 'ramo de rosas':
                    giftMessage = `🌹✨ ¡Hola @${target.jid.split('@')[0]}! ✨🌹\n\n💌 @${sender.jid.split('@')[0]} te ha regalado ${quantity > 1 ? `un hermoso ramo de ${quantity} rosas` : 'una hermosa rosa'} ${itemEmoji.repeat(quantity)}\n¡Qué detalle tan romántico! 🥰💖`;
                    break;
                case 'peluche rave-bebé':
                    giftMessage = `🧸 ¡Asu, qué ternura! 🧸\n\n¡Oe @${target.jid.split('@')[0]}! @${sender.jid.split('@')[0]} un *Peluche rave-bebé* para que te abrace. ¡Cuídalo bien!`;
                    break;
                case 'cerveza fría':
                    giftMessage = `🍻 ¡Salud, compadre! 🍻\n\n¡@${target.jid.split('@')[0]}! @${sender.jid.split('@')[0]} te invita ${quantity > 1 ? `unas chelas` : 'una chelita'} bien heladitas para la sed!`;
                    break;
                case 'carta de amor rave':
                    giftMessage = `💌 ¡Uyuyuy, qué romántico! 💌\n\n@${target.jid.split('@')[0]}, el gran @${sender.jid.split('@')[0]} te mandó una *Carta de amor rave*.`;
                    break;
                case 'pase vip far away peru':
                case 'pase vip ultra perú 2026':
                case 'ticket ga ultra perú 2026':
                case 'ticket david guetta lima':
                case 'entrada boris brejcha general':
                case 'entrada boris brejcha vip':
                case 'entrada boris brejcha palco':
                case 'ticket dldk perú 2025':
                    giftMessage = `🎟️ ¡Nos vamos de tono! 🎟️\n\n¡Habla, @${target.jid.split('@')[0]}! @${sender.jid.split('@')[0]} te acaba de regalar *${quantity} ${giftedItemName}*. ¡A bailar hasta que el cuerpo aguante!`;
                    break;
                case 'camisa con logo de ravehub':
                    giftMessage = `👕 ¡Qué elegancia! 👕\n\n@${target.jid.split('@')[0]}, mira la joyita que te regaló @${sender.jid.split('@')[0]}: una *Camisa con logo de RaveHub*.`;
                    break;
                case 'glitter mágico':
                    giftMessage = `✨ ¡A brillar más que sol de verano! ✨\n\n¡@${target.jid.split('@')[0]}! @${sender.jid.split('@')[0]} te mandó *Glitter mágico* para que ilumines la pista de baile. ¡Que nadie te opaque!`;
                    break;
                case 'perrito rave':
                    giftMessage = `🐶 ¡Wof, wof, mi causa! 🐶\n\n¡@${target.jid.split('@')[0]}! @${sender.jid.split('@')[0]} te adoptó un *Perrito rave*. ¡Tu nuevo compañero para todas las juergas!`;
                    break;
                default:
                    // Mensaje genérico mejorado para otros items
                    giftMessage = `🎉 ¡Regalo especial para @${target.jid.split('@')[0]}! 🎉\n\n💌 @${sender.jid.split('@')[0]} te ha regalado *${quantity} ${giftedItemName}* ${itemEmoji}.\n\n¡Que lo disfrutes! 😊`;
                    break;
            }

            await sock.sendMessage(chatId, {
                text: giftMessage,
                mentions: [senderJid, mentionedJid]
            });

        } catch (error) {
            console.error('Error en el comando give:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al intentar regalar el item.' });
        }
    }
};

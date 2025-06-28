const User = require('../../models/User');

module.exports = {
    name: 'give',
    description: 'Regala uno o más items de tu inventario a otro usuario.',
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
            let sender = await User.findOne({ jid: senderJid });
            if (!sender) {
                return sock.sendMessage(chatId, { text: 'No tienes una cuenta para poder regalar items.' });
            }

            const itemInInventory = sender.inventory.find(item => item.name.toLowerCase() === itemName);

            if (!itemInInventory || itemInInventory.quantity < quantity) {
                return sock.sendMessage(chatId, { text: `No tienes suficientes "${itemName}" en tu inventario. Tienes ${itemInInventory ? itemInInventory.quantity : 0}.` });
            }

            let target = await User.findOne({ jid: mentionedJid });
            if (!target) {
                target = new User({ jid: mentionedJid, name: message.message.extendedTextMessage?.contextInfo?.pushName || mentionedJid.split('@')[0] });
            }

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

            await sock.sendMessage(chatId, {
                text: `🎁 @${senderJid.split('@')[0]} le ha regalado *${quantity} ${itemInInventory.name}* a @${mentionedJid.split('@')[0]}.`,
                mentions: [senderJid, mentionedJid]
            });

        } catch (error) {
            console.error('Error en el comando give:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al intentar regalar el item.' });
        }
    }
};

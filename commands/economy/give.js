const User = require('../../models/User');

module.exports = {
    name: 'give',
    description: 'Regala un item de tu inventario a otro usuario.',
    category: 'economy',
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const itemName = args.filter(arg => !arg.startsWith('@')).join(' ').toLowerCase();

        if (!mentionedJid || !itemName) {
            return sock.sendMessage(chatId, { text: 'Formato incorrecto. Uso: .give @usuario <nombre del item>' });
        }

        if (senderJid === mentionedJid) {
            return sock.sendMessage(chatId, { text: 'No puedes regalarte items a ti mismo.' });
        }

        try {
            let sender = await User.findOne({ jid: senderJid });
            if (!sender) {
                return sock.sendMessage(chatId, { text: 'No tienes una cuenta para poder regalar items.' });
            }

            const itemInInventory = sender.inventory.find(item => item.name.toLowerCase() === itemName);

            if (!itemInInventory || itemInInventory.quantity <= 0) {
                return sock.sendMessage(chatId, { text: `No tienes "${itemName}" en tu inventario.` });
            }

            let target = await User.findOne({ jid: mentionedJid });
            if (!target) {
                target = new User({ jid: mentionedJid, name: mentionedJid.split('@')[0] });
            }

            // Quitar item del inventario del emisor
            itemInInventory.quantity -= 1;
            if (itemInInventory.quantity === 0) {
                sender.inventory = sender.inventory.filter(item => item.name.toLowerCase() !== itemName);
            }

            // Añadir item al inventario del receptor
            const targetItem = target.inventory.find(item => item.itemId.equals(itemInInventory.itemId));
            if (targetItem) {
                targetItem.quantity += 1;
            } else {
                target.inventory.push({
                    itemId: itemInInventory.itemId,
                    name: itemInInventory.name,
                    quantity: 1,
                });
            }

            await sender.save();
            await target.save();

            await sock.sendMessage(chatId, {
                text: `🎁 @${senderJid.split('@')[0]} le ha regalado *1 ${itemInInventory.name}* a @${mentionedJid.split('@')[0]}.`,
                mentions: [senderJid, mentionedJid]
            });

        } catch (error) {
            console.error('Error en el comando give:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al intentar regalar el item.' });
        }
    }
};

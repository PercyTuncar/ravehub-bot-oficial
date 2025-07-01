const { findOrCreateUser } = require('../../utils/userUtils');
const ShopItem = require('../../models/ShopItem'); // Importar el modelo de ShopItem

module.exports = {
    name: 'give',
    description: 'Regala un item.',
    aliases: ['dar'],
    usage: '.give @usuario <cantidad> <nombre del item>',
    category: 'economy',
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const groupId = message.key.remoteJid;

        const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        
        const quantityArg = args.find(arg => !isNaN(parseInt(arg)));
        const quantity = quantityArg ? parseInt(quantityArg) : 1;
        const itemName = args.filter(arg => arg !== quantityArg && !arg.startsWith('@')).join(' ').toLowerCase();

        if (!mentionedJid || !itemName) {
            return sock.sendMessage(groupId, { text: `Formato incorrecto. Uso: *.give @usuario <cantidad> <nombre del item>*` });
        }

        if (quantity <= 0 || !Number.isInteger(quantity)) {
            return sock.sendMessage(groupId, { text: 'La cantidad debe ser un número entero y positivo.' });
        }

        if (senderJid === mentionedJid) {
            return sock.sendMessage(groupId, { text: 'No puedes regalarte items a ti mismo.' });
        }

        try {
            const sender = await findOrCreateUser(senderJid, groupId);
            const target = await findOrCreateUser(mentionedJid, groupId);

            const itemInInventory = sender.inventory.find(item => item.name.toLowerCase() === itemName);

            if (!itemInInventory || itemInInventory.quantity < quantity) {
                return sock.sendMessage(groupId, { text: `No tienes suficientes "${itemName}" en tu inventario. Tienes ${itemInInventory ? itemInInventory.quantity : 0}.` });
            }

            // Obtener la información completa del item desde la base de datos para acceder a su categoría y emoji
            const shopItem = await ShopItem.findById(itemInInventory.itemId);
            if (!shopItem) {
                // Esto no debería pasar si el inventario está sincronizado, pero es una buena validación
                return sock.sendMessage(groupId, { text: 'No se pudo encontrar la información de este item. Contacta al administrador.' });
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

            // --- Mensaje de Regalo Mejorado por Categoría ---
            const giftedItemName = shopItem.name;
            const itemEmoji = shopItem.emoji || '🎁';
            const itemNameLower = giftedItemName.toLowerCase();

            let giftMessage = '';

            // Mensajes personalizados para cada item de la tienda
            switch (itemNameLower) {
                // --- Bienes Raíces ---
                case 'casa en san isidro':
                    giftMessage = `🎊 ¡Felicidades, @${target.jid.split('@')[0]}! 🎊\n\nEn un acto de generosidad sin precedentes, @${sender.jid.split('@')[0]} te ha transferido la propiedad de una *${giftedItemName}* ${itemEmoji}. ¡Ahora eres dueño(a) de una de las propiedades más exclusivas de Lima!`;
                    break;
                case 'casa en SJL':
                    giftMessage = `🏡 ¡A estrenar se ha dicho, @${target.jid.split('@')[0]}! 🏡\n\n¡Qué ofertón! @${sender.jid.split('@')[0]} te acaba de regalar una *${giftedItemName}*. ¡Ya tienes donde hacer la previa para los raves!`;
                    break;

                // --- Vehículos ---
                case 'auto tesla model 3':
                    giftMessage = `⚡ ¡Noticia de última hora! ⚡\n\nEl magnate @${sender.jid.split('@')[0]} le ha regalado a @${target.jid.split('@')[0]} un *${giftedItemName}* ${itemEmoji} 0km. ¡A recorrer la ciudad con estilo y conciencia ecológica!`;
                    break;
                case 'chevrolet (sapito)':
                    giftMessage = `🚗 ¡Pisa a fondo, @${target.jid.split('@')[0]}! 🚗\n\n¡@${sender.jid.split('@')[0]} te ha regalado un clásico *${giftedItemName}*! Pequeño pero cumplidor, ¡ideal para llegar a todos los points!`;
                    break;
                case 'mototaxi':
                    giftMessage = `🛺 ¡Full chamba, @${target.jid.split('@')[0]}! 🛺\n\n¡@${sender.jid.split('@')[0]} te regaló una *${giftedItemName}*! Ya tienes para trabajar o para llevar a toda la gente al tono. ¡Hay espacio!`;
                    break;

                // --- Tecnología ---
                case 'iphone 16 pro':
                case 'iphone 16 pro max':
                    giftMessage = `📱 ¡Estrenando celular de alta gama! 📱\n\n¡@${target.jid.split('@')[0]}! @${sender.jid.split('@')[0]} se lució y te regaló un *${giftedItemName}* ${itemEmoji}. ¡A tomar fotos épicas en el próximo rave!`;
                    break;

                // --- Regalos y Sorpresas ---
                case 'ramo de rosas':
                    giftMessage = `🌹✨ ¡Qué viva el amor, @${target.jid.split('@')[0]}! ✨🌹\n\nEl romántico @${sender.jid.split('@')[0]} te ha enviado *${quantity > 1 ? `un hermoso ramo de ${quantity} rosas` : 'una hermosa rosa'}* ${itemEmoji.repeat(quantity)}. ¡Detallazo!`;
                    break;
                case 'peluche rave-bebé':
                    giftMessage = `🧸 ¡Para que no duermas solo(a), @${target.jid.split('@')[0]}! 🧸\n\n@${sender.jid.split('@')[0]} te ha regalado un *${giftedItemName}* ${itemEmoji}. ¡Tu nuevo compañero de abrazos post-fiesta!`;
                    break;
                case 'cerveza fría':
                    giftMessage = `🍻 ¡Saludcita, @${target.jid.split('@')[0]}! 🍻\n\n¡Para la sed! @${sender.jid.split('@')[0]} te invita *${quantity > 1 ? `${quantity} cervezas frías` : 'una cervecita fría'}* ${itemEmoji}. ¡Que sigan los brindis!`;
                    break;
                case 'carta de amor rave':
                    giftMessage = `💌 ¡El amor está en el aire! 💌\n\n¡Atención @${target.jid.split('@')[0]}! Has recibido una *${giftedItemName}* ${itemEmoji} de parte de @${sender.jid.split('@')[0]}. ¿Será una declaración? ¡Qué nervios!`;
                    break;

                // --- Tickets de Eventos ---
                case 'pase vip far away peru':
                case 'pase vip ultra perú 2026':
                case 'ticket ga ultra perú 2026':
                case 'ticket david guetta lima':
                case 'entrada boris brejcha general':
                case 'entrada boris brejcha vip':
                case 'entrada boris brejcha palco':
                case 'ticket dldk perú 2025':
                    giftMessage = `🎟️ ¡Nos vamos de fiesta, @${target.jid.split('@')[0]}! 🎟️\n\n¡Agárrate! @${sender.jid.split('@')[0]} te acaba de conseguir *${quantity} ${giftedItemName}* ${itemEmoji}. ¡A preparar los mejores pasos de baile!`;
                    break;

                // --- Artículos de Festival ---
                case 'camisa con logo de ravehub':
                    giftMessage = `👕 ¡Con la oficial de RaveHub! 👕\n\n¡Elegancia pura, @${target.jid.split('@')[0]}! @${sender.jid.split('@')[0]} te regaló una *${giftedItemName}* ${itemEmoji}. ¡Ahora eres parte del equipo!`;
                    break;
                case 'glitter mágico':
                    giftMessage = `✨ ¡A brillar más que nunca, @${target.jid.split('@')[0]}! ✨\n\n¡@${sender.jid.split('@')[0]} te mandó *${giftedItemName}* ${itemEmoji} para que ilumines la noche! ¡Que nadie te opaque!`;
                    break;
                case 'perrito rave':
                    giftMessage = `🐶 ¡Un nuevo amigo fiel, @${target.jid.split('@')[0]}! 🐶\n\n¡@${sender.jid.split('@')[0]} te adoptó un *${giftedItemName}* ${itemEmoji}! Tu nuevo compañero para todas las juergas y bajones.`;
                    break;
                
                default:
                    // Mensaje genérico por si se añade un item y no se personaliza el mensaje
                    giftMessage = `🎉 ¡Regalo especial para @${target.jid.split('@')[0]}! 🎉\n\n💌 @${sender.jid.split('@')[0]} te ha regalado *${quantity} ${giftedItemName}* ${itemEmoji}.\n\n¡Que lo disfrutes! 😊`;
                    break;
            }

            await sock.sendMessage(groupId, {
                text: giftMessage,
                mentions: [senderJid, mentionedJid]
            });

        } catch (error) {
            console.error('Error en el comando give:', error);
            await sock.sendMessage(groupId, { text: 'Ocurrió un error al intentar regalar el item.' });
        }
    }
};

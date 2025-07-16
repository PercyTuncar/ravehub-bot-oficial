const User = require('../../models/User');
const ShopItem = require('../../models/ShopItem'); // Importar el modelo de la tienda
const { getSocket } = require('../../bot');
const { updateHealth } = require('../../utils/userUtils'); // Importar updateHealth

module.exports = {
    name: 'beber',
    aliases: ['tomar'],
    description: 'Bebe un item de tu inventario para saciar la sed y reducir el estrés.',
    category: 'rp',
    async execute(message, args) {
        const sock = getSocket();
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        if (args.length === 0) {
            return sock.sendMessage(chatId, { text: 'Debes especificar qué quieres beber. Ejemplo: `.beber cerveza`' });
        }
        
        try {
            const user = await findOrCreateUser(senderJid, chatId, pushName);

            // Buscar el item en el inventario
            const itemIndex = user.inventory.findIndex(item => item.name.toLowerCase() === itemName && item.quantity > 0);

            if (itemIndex === -1) {
                return sock.sendMessage(chatId, { text: `No tienes "${itemName}" en tu inventario para beber.` });
            }

            // --- Lógica de Bebidas Personalizadas ---
            const drinkActions = {
                'cerveza heladita': {
                    messages: [
                        `¡Salud! @${senderJid.split('@')[0]} se está refrescando con una cerveza heladita. 🍻`,
                        `¡Qué buena está! @${senderJid.split('@')[0]} disfruta de una cerveza heladita.`,
                        `Un momento de relax para @${senderJid.split('@')[0]} con una cerveza heladita.`,
                        `¡A tu salud, @${senderJid.split('@')[0]}! Disfruta esa cerveza heladita.`
                    ]
                },
                'pisco': {
                    messages: [
                        `¡Un brindis con peruanidad! @${senderJid.split('@')[0]} prepara y disfruta un Pisco Sour. 🍸`,
                        `¡Para el alma! @${senderJid.split('@')[0]} se sirve un Pisco Sour.`,
                        `Con la receta secreta, @${senderJid.split('@')[0]} se deleita con un Pisco Sour. 🍸`
                    ]
                }
                // Se pueden añadir más bebidas aquí
            };

            const action = drinkActions[itemName];

            if (!action) {
                return sock.sendMessage(chatId, { text: `No puedes beber "${itemName}".` });
            }

            // Si la bebida es válida, proceder a consumirla
            user.inventory[itemIndex].quantity -= 1;

            if (user.inventory[itemIndex].quantity === 0) {
                user.inventory.splice(itemIndex, 1);
            }

            await user.save();

            const randomMessage = action.messages[Math.floor(Math.random() * action.messages.length)];

            return sock.sendMessage(chatId, {
                text: randomMessage,
                mentions: [senderJid]
            });

        } catch (error) {
            console.error('Error en el comando beber:', error);
            return sock.sendMessage(chatId, { text: 'Ocurrió un error al intentar beber el item.' });
        }
    },
};

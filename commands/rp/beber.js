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
        
        const user = await User.findOne({ jid: senderJid, groupId: chatId });

        if (!user) {
            return sock.sendMessage(chatId, { text: 'No tienes un perfil. Usa `.iniciar` para crear uno.' });
        }
        if (user.status.isDead) {
            return sock.sendMessage(chatId, { text: 'Estás muerto 💀. No puedes beber.' });
        }

        const itemName = args.join(' ').toLowerCase();

        // 1. Buscar el item en la tienda por nombre o alias
        const shopItem = await ShopItem.findOne({
            $or: [
                { name: new RegExp(`^${itemName}$`, 'i') },
                { aliases: new RegExp(`^${itemName}$`, 'i') }
            ]
        });

        // 2. Validar si el item existe y es una bebida
        if (!shopItem || shopItem.type !== 'drink') {
            return sock.sendMessage(chatId, { 
                text: `El item "${itemName}" no es una bebida o no existe.`,
                mentions: [senderJid]
            });
        }

        // 3. Buscar el item en el inventario del usuario usando el ID
        const itemToDrink = user.inventory.find(item => item.itemId && item.itemId.equals(shopItem._id));

        if (!itemToDrink || itemToDrink.quantity <= 0) {
            return sock.sendMessage(chatId, { 
                text: `@${senderJid.split('@')[0]}, no tienes "${shopItem.name}" en tu inventario.`,
                mentions: [senderJid]
            });
        }

        // 4. Aplicar efectos desde la base de datos
        const initialStatus = { ...user.status };
        user.status.thirst = Math.min(100, user.status.thirst + (shopItem.effects.thirst || 0));
        user.status.stress = Math.max(0, user.status.stress + (shopItem.effects.stress || 0));
        user.status.hunger = Math.min(100, user.status.hunger + (shopItem.effects.hunger || 0)); // Por si la bebida también da algo de energía

        // 5. Actualizar inventario
        itemToDrink.quantity -= 1;
        if (itemToDrink.quantity <= 0) {
            user.inventory = user.inventory.filter(invItem => !invItem._id.equals(itemToDrink._id));
        }
        
        updateHealth(user); // Actualizar la salud del usuario
        user.lastInteraction = Date.now();
        await user.save();

        const messages = [
            `¡Salud! @${senderJid.split('@')[0]} se está refrescando con una cerveza heladita. 🍻`,
            `¡Qué buena está! @${senderJid.split('@')[0]} disfruta de una cerveza heladita.`,
            `Un momento de relax para @${senderJid.split('@')[0]} con una cerveza heladita.`,
            `¡A tu salud, @${senderJid.split('@')[0]}! Disfruta esa cerveza heladita.`
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];

        return sock.sendMessage(chatId, {
            text: randomMessage,
            mentions: [senderJid]
        });
    },
};

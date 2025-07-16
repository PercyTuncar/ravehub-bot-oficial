const User = require('../../models/User');
const ShopItem = require('../../models/ShopItem');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'relajarse',
    description: 'Reduce tu nivel de estrés, opcionalmente usando un item.',
    category: 'rp',
    async execute(message, args) {
        const sock = getSocket();
        const senderId = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        
        const user = await User.findOne({ jid: senderId, groupId: chatId }).populate('inventory.itemId');

        if (!user) {
            return sock.sendMessage(chatId, { text: 'No tienes un perfil. Usa `.iniciar` para crear uno.' });
        }
        if (user.status.isDead) {
            return sock.sendMessage(chatId, { text: 'Estás muerto 💀. No puedes relajarte.' });
        }

        // Definir los items que se pueden usar para relajarse
        const relaxingItemNames = ['cerveza heladita', 'pisco sour'];
        
        // Buscar si el usuario tiene alguno de los items relajantes en su inventario
        const itemToUse = user.inventory.find(item => 
            relaxingItemNames.includes(item.name.toLowerCase()) && item.quantity > 0
        );

        if (!itemToUse) {
            return sock.sendMessage(chatId, { text: 'Necesitas una bebida para poder relajarte. ¡Ve a la tienda y compra una "Cerveza Heladita" o un "Pisco Sour" usando `.comprar`!' });
        }

        // Reducción de estrés aleatoria entre 10 y 20
        const stressReduction = Math.floor(Math.random() * (20 - 10 + 1)) + 10;
        user.status.stress = Math.max(0, user.status.stress - stressReduction);
        
        // Si el estrés llega a 0, restaurar la salud al 100%
        if (user.status.stress === 0) {
            user.status.health = 100;
        }

        // Consumir el item
        itemToUse.quantity -= 1;

        // Si la cantidad del item llega a 0, se elimina del inventario
        if (itemToUse.quantity <= 0) {
            user.inventory = user.inventory.filter(invItem => invItem._id.toString() !== itemToUse._id.toString());
        }
        
        user.lastInteraction = Date.now();
        await user.save();

        await sock.sendMessage(chatId, { text: `¡Salud! 🍻 Has usado ${itemToUse.name} para relajarte. Tu estrés ha bajado en ${stressReduction} puntos y ahora es de ${user.status.stress}%.${user.status.health === 100 ? ' ¡Te sientes como nuevo y tu salud se ha restaurado por completo!' : ''}` });
    },
};

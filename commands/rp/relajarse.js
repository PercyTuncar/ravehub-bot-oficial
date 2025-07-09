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

        // Si el usuario especifica un item
        if (args.length > 0) {
            const itemName = args.join(' ').toLowerCase();
            const itemToUse = user.inventory.find(item => 
                item.name.toLowerCase() === itemName
            );

            if (!itemToUse || itemToUse.quantity <= 0) {
                return sock.sendMessage(chatId, { text: `No tienes "${itemName}".` });
            }

            // Se verifica si el item es relajante por sus efectos o por su nombre
            const isRelaxing = (itemToUse.itemId && itemToUse.itemId.effects && itemToUse.itemId.effects.stress < 0) || 
                               ['cerveza heladita', 'pisco sour'].includes(itemName);

            if (!isRelaxing) {
                return sock.sendMessage(chatId, { text: `"${itemToUse.name}" no tiene efectos relajantes.` });
            }

            // Reducción de estrés aleatoria entre 10 y 20
            const stressReduction = Math.floor(Math.random() * (20 - 10 + 1)) + 10;
            user.status.stress = Math.max(0, user.status.stress - stressReduction);
            
            // Si el estrés llega a 0, restaurar la salud al 100%
            if (user.status.stress === 0) {
                user.status.health = 100;
            }

            itemToUse.quantity -= 1;

            if (itemToUse.quantity <= 0) {
                user.inventory = user.inventory.filter(invItem => invItem._id.toString() !== itemToUse._id.toString());
            }
            
            await user.save();
            return sock.sendMessage(chatId, { text: `¡Salud! 🍻 Has usado ${itemToUse.name} para relajarte. Tu estrés ha bajado en ${stressReduction} puntos y ahora es de ${user.status.stress}%.${user.status.health === 100 ? ' ¡Te sientes como nuevo y tu salud se ha restaurado por completo!' : ''}` });
        }

        // Acción por defecto sin item
        const stressReduction = 20;
        user.status.stress = Math.max(0, user.status.stress - stressReduction);
        
        // Si el estrés llega a 0, restaurar la salud al 100%
        if (user.status.stress === 0) {
            user.status.health = 100;
        }

        user.lastInteraction = Date.now();
        await user.save();

        await sock.sendMessage(chatId, { text: `Te tomas un momento para respirar. Tu estrés ha bajado a ${user.status.stress}%.${user.status.health === 100 ? ' ¡Te sientes completamente renovado y tu salud está al máximo!' : ''} Para un mayor efecto, usa un item como cerveza o pisco: \`.relajarse [nombre del item]\`` });
    },
};

const User = require('../../models/User');
const { updateHealth } = require('../../utils/userUtils');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'beber',
    aliases: ['tomar'],
    description: 'Bebe un item de tu inventario para saciar la sed y reducir el estrés.',
    category: 'rp',
    async execute(message, args) {
        const sock = getSocket();
        const senderId = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        if (args.length === 0) {
            return sock.sendMessage(chatId, { text: 'Debes especificar qué quieres beber. Ejemplo: `.beber cerveza heladita`' });
        }
        
        const user = await User.findOne({ jid: senderId, groupId: chatId });

        if (!user) {
            return sock.sendMessage(chatId, { text: 'No tienes un perfil. Usa `.iniciar` para crear uno.' });
        }
        if (user.status.isDead) {
            return sock.sendMessage(chatId, { text: 'Estás muerto 💀. No puedes beber.' });
        }

        const itemName = args.join(' ').toLowerCase();
        const itemToDrink = user.inventory.find(item => item.name.toLowerCase() === itemName);

        if (!itemToDrink || itemToDrink.quantity <= 0) {
            return sock.sendMessage(chatId, { text: `No tienes "${itemName}" en tu inventario.` });
        }

        const isDrinkable = ['cerveza heladita', 'pisco sour'].includes(itemName);

        if (!isDrinkable) {
            return sock.sendMessage(chatId, { text: `"${itemToDrink.name}" no es algo que puedas beber para calmar la sed o el estrés.` });
        }

        const stressReduction = Math.floor(Math.random() * (20 - 10 + 1)) + 10;
        const thirstRestored = Math.floor(Math.random() * (30 - 15 + 1)) + 15;

        user.status.stress = Math.max(0, user.status.stress - stressReduction);
        user.status.thirst = Math.min(100, user.status.thirst + thirstRestored);

        itemToDrink.quantity -= 1;
        if (itemToDrink.quantity <= 0) {
            user.inventory = user.inventory.filter(invItem => invItem._id.toString() !== itemToDrink._id.toString());
        }

        updateHealth(user);
        user.lastInteraction = Date.now();
        
        await user.save();

        let messageText = `¡Salud! 🍻 Te tomaste una ${itemToDrink.name}.\n\n*Efectos:*\n> 😵 Estrés: \`-${stressReduction}%\` (Ahora: ${user.status.stress}%)\n> 💧 Sed: \`+${thirstRestored}%\` (Ahora: ${user.status.thirst}%)\n\nComo resultado, tu salud ahora es del *${user.status.health}%*.`;

        await sock.sendMessage(chatId, { text: messageText });
    },
};

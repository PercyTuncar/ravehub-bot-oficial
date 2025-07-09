const User = require('../../models/User');
const { getLevelName } = require('../../utils/levels');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'renacer',
    description: 'Revive a tu personaje después de la muerte.',
    category: 'rp',
    async execute(message, args) {
        const sock = getSocket();
        const senderId = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const user = await User.findOne({ jid: senderId, groupId: chatId });

        if (!user || !user.status.isDead) {
            return sock.sendMessage(chatId, { text: 'No estás muerto. ¡Sigue con tu vida!' });
        }

        const xpLoss = 550;
        const moneyLossPercentage = 0.40;
        const itemsToRemove = 5;

        const oldLevelName = getLevelName(user.level);
        user.xp = Math.max(0, user.xp - xpLoss);
        const newLevelName = getLevelName(user.level);

        const moneyLost = user.economy.wallet * moneyLossPercentage;
        user.economy.wallet -= moneyLost;

        let itemsLostMessage = 'No perdiste items.';
        if (user.inventory.length > 0) {
            const itemsToLoseCount = Math.min(user.inventory.length, itemsToRemove);
            const lostItems = [];
            for (let i = 0; i < itemsToLoseCount; i++) {
                const randomIndex = Math.floor(Math.random() * user.inventory.length);
                lostItems.push(user.inventory[randomIndex].name);
                user.inventory.splice(randomIndex, 1);
            }
            itemsLostMessage = `Perdiste ${itemsToLoseCount} items: ${lostItems.join(', ')}.`;
        }

        user.status.isDead = false;
        user.status.health = 100;
        user.status.hunger = 100;
        user.status.thirst = 100;
        user.status.stress = 0;
        user.lastInteraction = Date.now();

        await user.save();

        let rebirthMessage = `
*✨ HAS RENACIDO ✨*

Has vuelto del más allá, pero con un costo.
- XP perdido: ${xpLoss}
- Dinero perdido: s/ ${moneyLost.toLocaleString()}
- ${itemsLostMessage}
`;

        if (newLevelName !== oldLevelName) {
            rebirthMessage += `\n*¡Has bajado de nivel!* Ahora eres ${newLevelName}.`;
        }

        rebirthMessage += '\nTu perfil ha sido restaurado. ¡Bienvenido de nuevo!';
        
        await sock.sendMessage(chatId, { text: rebirthMessage });
        
        // Muestra el perfil actualizado
        const meCommand = require('../utility/me'); // Cargar directamente para evitar problemas de caché/referencia circular
        if (meCommand) {
            await meCommand.execute(message, args);
        }
    },
};

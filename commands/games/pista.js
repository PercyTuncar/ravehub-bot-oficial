const challengeHandler = require('../../handlers/challengeHandler');
const User = require('../../models/User');

module.exports = {
    name: 'pista',
    description: 'Compra una pista durante el Desafío de la Silueta.',
    async execute(message, args) {
        const chatId = message.from;
        const userId = message.author || message.from;

        const challenge = challengeHandler.getChallenge(chatId);
        if (!challenge) {
            return message.reply('No hay ningún desafío activo para comprar una pista.');
        }

        const user = await User.findOne({ id: userId });
        
        let clueCost = 0;
        if (challenge.cluesBought === 0) clueCost = challenge.clueCosts.hard;
        else if (challenge.cluesBought === 1) clueCost = challenge.clueCosts.medium;
        else if (challenge.cluesBought === 2) clueCost = challenge.clueCosts.easy;
        else return message.reply('¡Ya se han comprado todas las pistas!');

        if (!user || user.bank < clueCost) {
            return message.reply(`No tienes suficiente dinero en el banco para comprar la pista. Necesitas ${clueCost} monedas.`);
        }

        // Cobrar al usuario
        user.bank -= clueCost;
        await user.save();

        const result = challengeHandler.buyClue(chatId);

        if (result.error) {
            return message.reply(result.error);
        }

        const clueNumber = challenge.cluesBought;
        message.client.sendMessage(chatId, ` pistas comprada por @${userId.split('@')[0]}!\n\n*Pista ${clueNumber}:* ${result.clue}\n\n🏆 *Nuevo Premio:* ${result.newPrize} monedas.`);
    }
};

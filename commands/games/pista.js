const challengeHandler = require('../../handlers/challengeHandler');
const { findOrCreateUser } = require('../../utils/userUtils');
const { getCurrency } = require('../../utils/groupUtils');

module.exports = {
    name: 'pista',
    description: 'Compra una pista durante el Desafío de la Silueta.',
    aliases: ['clue', 'hint'],
    async execute(message, args, client) {
        const chatId = message.key.remoteJid;
        const userId = message.key.participant || message.key.remoteJid;

        const challenge = challengeHandler.getChallenge(chatId);
        if (!challenge) {
            return client.sendMessage(chatId, { text: 'No hay ningún desafío activo para comprar una pista.' });
        }

        const user = await findOrCreateUser(userId, chatId, message.pushName);
        const currency = await getCurrency(chatId);

        const cluesPurchasedByUserInChallenge = challenge.cluesBought.filter(c => c.userId === userId);
        const numberOfCluesBought = cluesPurchasedByUserInChallenge.length;

        let clueType, cost;
        if (numberOfCluesBought === 0) {
            clueType = 'hard';
            cost = challenge.clueCosts.hard;
        } else if (numberOfCluesBought === 1) {
            clueType = 'medium';
            cost = challenge.clueCosts.medium;
        } else if (numberOfCluesBought === 2) {
            clueType = 'easy';
            cost = challenge.clueCosts.easy;
        } else {
            return client.sendMessage(chatId, { text: '¡Ya has comprado todas las pistas disponibles para este desafío!' });
        }

        if (user.economy.wallet < cost) {
            return client.sendMessage(chatId, { text: `❌ @${userId.split('@')[0]}, no tienes suficiente dinero en tu cartera para comprar esta pista. Necesitas ${currency} ${cost}.` });
        }

        // Cobrar al usuario
        user.economy.wallet -= cost;
        await user.save();

        const result = challengeHandler.buyClue(userId, chatId);

        if (result.error) {
            return client.sendMessage(chatId, { text: result.error });
        }

        const senderName = message.pushName || userId.split('@')[0];
        await client.sendMessage(chatId, { 
            text: `✅ @${senderName} ha comprado una pista por ${currency} ${cost}.\n\n*Pista:* ${result.clue}\n\n*Tu nuevo saldo en cartera:* ${currency} ${user.economy.wallet.toLocaleString()}.`,
            mentions: [userId]
        });
    }
};

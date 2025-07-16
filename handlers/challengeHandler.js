const User = require('../models/User');
const activeChallenges = new Map();

function notify(client, chatId, message, options = {}) {
    // Baileys send message syntax is different
    if (options.media) {
        client.sendMessage(chatId, { image: { url: options.media }, caption: message });
    } else {
        client.sendMessage(chatId, { text: message });
    }
}

module.exports = {
    startSilhouetteChallenge(client, chatId, djData, currency, messageKey) {
        if (this.isChallengeActive(chatId)) return null;

        const challenge = {
            type: 'silueta',
            client,
            chatId,
            dj: djData,
            prize: 500, // Premio estándar para silueta
            currency: currency, // Guardar la divisa en el desafío
            messageKey: messageKey, // Guardar la clave del mensaje
            cluesBought: [], // Rastrear qué pistas ha comprado cada usuario
            incorrectGuesses: new Set(), // Rastrear intentos incorrectos por usuario
            clueCosts: { hard: 100, medium: 200, easy: 300 },
            timeout: setTimeout(async () => {
                const timeoutMessage = `⌛ ¡Tiempo agotado! Nadie adivinó. La respuesta era *${djData.name}*.`;
                notify(client, chatId, timeoutMessage);
                // Revelar la imagen normal al final
                if (djData.imageUrl) {
                    await client.sendMessage(chatId, { image: { url: djData.imageUrl }, caption: `Esta es la imagen de *${djData.name}*` });
                }
                this.endChallenge(chatId);
            }, 120000) // 2 minutos para adivinar
        };
        activeChallenges.set(chatId, challenge);
        return challenge;
    },

    isChallengeActive(chatId) {
        return activeChallenges.has(chatId);
    },

    getChallenge(chatId) {
        return activeChallenges.get(chatId);
    },

    async endChallenge(chatId) {
        const challenge = this.getChallenge(chatId);
        if (challenge) {
            clearTimeout(challenge.timeout);
            // Eliminar el mensaje de la silueta
            if (challenge.messageKey) {
                await challenge.client.sendMessage(chatId, { delete: challenge.messageKey });
            }
            activeChallenges.delete(chatId);
        }
    },

    async handleAnswer(message, client) {
        const chatId = message.key.remoteJid;
        const challenge = this.getChallenge(chatId);
        const userId = message.key.participant || message.key.remoteJid;

        if (!challenge || challenge.type !== 'silueta') return;

        // Evitar que un usuario responda varias veces incorrectamente
        if (challenge.incorrectGuesses.has(userId)) {
            return;
        }

        const userAnswer = message.body.trim().toLowerCase();
        const dj = challenge.dj;

        const isCorrect = userAnswer === dj.name.toLowerCase() ||
                          (dj.aliases && dj.aliases.some(alias => alias.toLowerCase() === userAnswer));

        if (isCorrect) {
            await User.findOneAndUpdate(
                { jid: userId, groupId: chatId },
                { $inc: { 'economy.wallet': challenge.prize } },
                { upsert: true, new: true }
            );

            const successMessage = `🎉 ¡Correcto, @${userId.split('@')[0]}! La respuesta era *${dj.name}*. Has ganado ${challenge.currency} ${challenge.prize} en tu billetera.`;
            notify(client, chatId, successMessage, { mentions: [userId] });

            // Revelar la imagen normal
            if (dj.imageUrl) {
                await client.sendMessage(chatId, { image: { url: dj.imageUrl }, caption: `¡Felicidades! Aquí está *${dj.name}* sin la silueta.` });
            }

            this.endChallenge(chatId);
        } else {
            // Penalización por respuesta incorrecta
            const penalty = 50;
            const user = await User.findOne({ jid: userId, groupId: chatId });
            
            if (user && user.economy.wallet >= penalty) {
                await User.updateOne({ _id: user._id }, { $inc: { 'economy.wallet': -penalty } });
                notify(client, chatId, `Respuesta incorrecta, @${userId.split('@')[0]}. Pierdes ${challenge.currency} ${penalty}.`, { mentions: [userId] });
            } else {
                notify(client, chatId, `Respuesta incorrecta, @${userId.split('@')[0]}. No tienes fondos para la penalización.`, { mentions: [userId] });
            }
            challenge.incorrectGuesses.add(userId);
        }
    },

    buyClue(userId, chatId) {
        const challenge = this.getChallenge(chatId);
        if (!challenge) return { error: 'No hay un desafío activo.' };

        const cluesPurchasedByUser = challenge.cluesBought.filter(c => c.userId === userId).length;

        let clueType, cost;
        if (cluesPurchasedByUser === 0) {
            clueType = 'hard';
            cost = challenge.clueCosts.hard;
        } else if (cluesPurchasedByUser === 1) {
            clueType = 'medium';
            cost = challenge.clueCosts.medium;
        } else if (cluesPurchasedByUser === 2) {
            clueType = 'easy';
            cost = challenge.clueCosts.easy;
        } else {
            return { error: 'Ya has comprado todas las pistas disponibles.' };
        }

        const clue = challenge.dj.clues[clueType];
        if (!clue) return { error: 'No hay una pista de este nivel para este DJ.' };

        // Marcar la pista como comprada
        challenge.cluesBought.push({ userId, clueType });
        // Reducir el premio
        challenge.prize -= cost;
        if (challenge.prize < 0) challenge.prize = 0;

        return { clue, cost, newPrize: challenge.prize };
    }
};

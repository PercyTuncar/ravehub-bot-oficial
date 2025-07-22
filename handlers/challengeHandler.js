const User = require('../models/User');
const activeChallenges = new Map();

function notify(client, chatId, message, options = {}) {
    if (options.media) {
        client.sendMessage(chatId, { image: { url: options.media }, caption: message });
    } else {
        client.sendMessage(chatId, { text: message, mentions: options.mentions || [] });
    }
}

module.exports = {
    startSilhouetteChallenge(client, chatId, djData, currency, betAmount) {
        if (this.isChallengeActive(chatId)) return null;

        const challenge = {
            type: 'silueta',
            client,
            chatId,
            dj: djData,
            betAmount: betAmount, // Apuesta inicial
            prize: betAmount * 3, // Premio potencial inicial (3x la apuesta)
            currency: currency,
            messageKey: null,
            attempts: new Map(), // Map para rastrear intentos por usuario: { userId: count }
            cluesBought: [], // Rastrear qué pistas ha comprado cada usuario
            clueCosts: { hard: 100, medium: 200, easy: 300 }, // Costos de las pistas
            timeout: setTimeout(async () => {
                const timeoutMessage = `⌛ ¡Tiempo agotado! Nadie adivinó. La respuesta era *${djData.name}*.`;
                notify(client, chatId, timeoutMessage);
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

        const userAnswer = message.body.trim().toLowerCase();
        const dj = challenge.dj;

        const isCorrect = userAnswer === dj.name.toLowerCase() ||
                          (dj.aliases && dj.aliases.some(alias => alias.toLowerCase() === userAnswer));

        // Obtener o inicializar el contador de intentos para este usuario
        let userAttempts = challenge.attempts.get(userId) || 0;

        if (isCorrect) {
            let prizeMultiplier;
            let prizeMessage;

            if (userAttempts === 0) {
                prizeMultiplier = 3;
                prizeMessage = `¡A la primera! Has ganado ${challenge.currency} ${challenge.betAmount * prizeMultiplier}.`;
            } else if (userAttempts === 1) {
                prizeMultiplier = 2;
                prizeMessage = `¡En el segundo intento! Has ganado ${challenge.currency} ${challenge.betAmount * prizeMultiplier}.`;
            } else if (userAttempts === 2) {
                prizeMultiplier = 1;
                prizeMessage = `¡En el tercer intento! Has ganado ${challenge.currency} ${challenge.betAmount * prizeMultiplier}.`;
            } else {
                // Esto no debería ocurrir si el juego termina después de 3 intentos
                prizeMultiplier = 0;
                prizeMessage = `Respuesta correcta, pero fuera de los intentos válidos. No hay premio.`;
            }

            const finalPrize = challenge.betAmount * prizeMultiplier;

            await User.findOneAndUpdate(
                { jid: userId, groupId: chatId },
                { $inc: { 'economy.wallet': finalPrize } },
                { upsert: true, new: true }
            );

            const successMessage = `🎉 ¡Correcto, @${userId.split('@')[0]}! La respuesta era *${dj.name}*. ${prizeMessage}`; 
            notify(client, chatId, successMessage, { mentions: [userId] });

            if (dj.imageUrl) {
                await client.sendMessage(chatId, { image: { url: dj.imageUrl }, caption: `¡Felicidades! Aquí está *${dj.name}* sin la silueta.` });
            }

            this.endChallenge(chatId);
        } else {
            userAttempts++;
            challenge.attempts.set(userId, userAttempts);

            if (userAttempts >= 3) {
                // El usuario ha agotado sus 3 intentos
                notify(client, chatId, `❌ @${userId.split('@')[0]}, has agotado tus 3 intentos. La respuesta correcta era *${dj.name}*. Has perdido tu apuesta de ${challenge.currency} ${challenge.betAmount}.`, { mentions: [userId] });
                if (dj.imageUrl) {
                    await client.sendMessage(chatId, { image: { url: dj.imageUrl }, caption: `Aquí está *${dj.name}* sin la silueta.` });
                }
                this.endChallenge(chatId);
            } else {
                // Informar al usuario cuántos intentos le quedan
                notify(client, chatId, `Respuesta incorrecta, @${userId.split('@')[0]}. Te quedan ${3 - userAttempts} intentos.`, { mentions: [userId] });
            }
        }
    },

    buyClue(userId, chatId) {
        const challenge = this.getChallenge(chatId);
        if (!challenge) return { error: 'No hay un desafío activo.' };

        // Filtrar pistas compradas por el usuario en el desafío actual
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
            return { error: 'Ya has comprado todas las pistas disponibles para este desafío.' };
        }

        const clue = challenge.dj.clues[clueType];
        if (!clue) return { error: `No hay una pista de tipo '${clueType}' para este DJ.` };

        // Marcar la pista como comprada para este usuario en este desafío
        challenge.cluesBought.push({ userId, clueType });
        // Reducir el premio potencial (no el premio final, que se calcula al acertar)
        // La reducción del premio por pista se manejará en la lógica de recompensa final si es necesario.
        // Por ahora, solo se descuenta el costo de la pista de la cartera del usuario.

        return { clue, cost, newPrize: challenge.prize }; // newPrize aquí es el premio potencial, no el final
    }
};

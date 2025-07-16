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
    startSilhouetteChallenge(client, chatId, djData, currency) {
        if (this.isChallengeActive(chatId)) return null;

        const challenge = {
            type: 'silueta',
            client,
            chatId,
            dj: djData,
            prize: 500, // Premio estándar para silueta
            currency: currency, // Guardar la divisa en el desafío
            timeout: setTimeout(async () => {
                const timeoutMessage = `⌛ ¡Tiempo agotado! Nadie adivinó. La respuesta era *${djData.name}*.`;
                notify(client, chatId, timeoutMessage);
                // Revelar la imagen normal al final
                if (djData.imageUrl) {
                    await client.sendMessage(chatId, { image: { url: djData.imageUrl }, caption: `Esta es la imagen de *${djData.name}*` });
                }
                this.endChallenge(chatId);
            }, 60000) // 1 minuto para adivinar
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

    endChallenge(chatId) {
        const challenge = this.getChallenge(chatId);
        if (challenge) {
            clearTimeout(challenge.timeout);
            activeChallenges.delete(chatId);
        }
    },

    async handleAnswer(message, client) {
        const chatId = message.key.remoteJid;
        const challenge = this.getChallenge(chatId);

        if (!challenge || challenge.type !== 'silueta') return;

        const userAnswer = message.body.trim().toLowerCase();
        const dj = challenge.dj;

        const isCorrect = userAnswer === dj.name.toLowerCase() ||
                          (dj.aliases && dj.aliases.some(alias => alias.toLowerCase() === userAnswer));

        if (isCorrect) {
            const winnerId = message.key.participant || message.key.remoteJid;
            
            // Incrementar la billetera del usuario usando el campo correcto 'jid'
            await User.findOneAndUpdate(
                { jid: winnerId, groupId: chatId }, // Usar jid y groupId para encontrar al usuario
                { $inc: { 'economy.wallet': challenge.prize } }, // Incrementar la billetera dentro de economy
                { upsert: true, new: true }
            );

            const successMessage = `🎉 ¡Correcto, @${winnerId.split('@')[0]}! La respuesta era *${dj.name}*. Has ganado ${challenge.currency} ${challenge.prize} en tu billetera.`;
            notify(client, chatId, successMessage, { mentions: [winnerId] });

            // Revelar la imagen normal
            if (dj.imageUrl) {
                client.sendMessage(chatId, { image: { url: dj.imageUrl }, caption: `¡Felicidades! Aquí está *${dj.name}* sin la silueta.` });
            }

            this.endChallenge(chatId);
        }
    }
};

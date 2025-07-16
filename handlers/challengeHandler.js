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
    startSilhouetteChallenge(client, chatId, djData) {
        if (this.isChallengeActive(chatId)) return null;

        const challenge = {
            type: 'silueta',
            client,
            chatId,
            dj: djData,
            prize: 500, // Premio estándar para silueta
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

    handleAnswer(message, client) {
        const chatId = message.key.remoteJid;
        const challenge = this.getChallenge(chatId);

        if (!challenge || challenge.type !== 'silueta') return;

        const userAnswer = message.body.trim().toLowerCase();
        const dj = challenge.dj;

        const isCorrect = userAnswer === dj.name.toLowerCase() ||
                          (dj.aliases && dj.aliases.some(alias => alias.toLowerCase() === userAnswer));

        if (isCorrect) {
            const winnerId = message.key.participant || message.key.remoteJid;
            // Lógica para dar el premio al ganador (necesitarás tu sistema de economía)
            // Por ejemplo: await economy.add(winnerId, challenge.prize);

            const successMessage = `🎉 ¡Correcto, @${winnerId.split('@')[0]}! La respuesta era *${dj.name}*. Has ganado ${challenge.prize} monedas.`;
            notify(client, chatId, successMessage, { mentions: [winnerId] });

            // Revelar la imagen normal
            if (dj.imageUrl) {
                client.sendMessage(chatId, { image: { url: dj.imageUrl }, caption: `¡Felicidades! Aquí está *${dj.name}* sin la silueta.` });
            }

            this.endChallenge(chatId);
        } else {
            // Opcional: penalizar o simplemente ignorar respuestas incorrectas
            // notify(client, chatId, 'Respuesta incorrecta. ¡Sigue intentando!');
        }
    }
};

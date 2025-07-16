const activeChallenges = new Map();

function notify(client, chatId, message, options = {}) {
    client.sendMessage(chatId, message, options);
}

module.exports = {
    startChallenge(client, chatId, djData) {
        if (this.getChallenge(chatId)) return null;

        const challenge = {
            client,
            chatId,
            dj: djData,
            prize: 2000,
            clueCosts: { hard: 300, medium: 500, easy: 700 },
            cluesBought: 0,
            incorrectGuesses: new Set(),
            timeout: setTimeout(() => {
                const timeoutMessage = `⌛ ¡Tiempo agotado! Nadie adivinó. La respuesta era *${djData.name}*.`;
                notify(client, chatId, timeoutMessage);
                // Reveal image on timeout
                const { MessageMedia } = require('whatsapp-web.js');
                MessageMedia.fromUrl(djData.revealedImageUrl, { unsafeMime: true }).then(media => {
                    notify(client, chatId, media);
                });
                this.endChallenge(chatId);
            }, 180000) // 3 minutos
        };
        activeChallenges.set(chatId, challenge);
        return challenge;
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

    buyClue(chatId) {
        const challenge = this.getChallenge(chatId);
        if (!challenge) return null;

        challenge.cluesBought++;
        let clue;
        let cost;

        if (challenge.cluesBought === 1) {
            clue = challenge.dj.clues.hard;
            cost = challenge.clueCosts.hard;
            challenge.prize -= cost;
        } else if (challenge.cluesBought === 2) {
            clue = challenge.dj.clues.medium;
            cost = challenge.clueCosts.medium;
            challenge.prize -= cost;
        } else if (challenge.cluesBought === 3) {
            clue = challenge.dj.clues.easy;
            cost = challenge.clueCosts.easy;
            challenge.prize -= cost;
        } else {
            return { error: 'No hay más pistas disponibles.' };
        }

        return { clue, cost, newPrize: challenge.prize };
    }
};

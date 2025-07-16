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
            timeout: setTimeout(async () => {
                const timeoutMessage = `⌛ ¡Tiempo agotado! Nadie adivinó. La respuesta era *${djData.name}*.`;
                notify(client, chatId, timeoutMessage);
                // Reveal image on timeout using Baileys syntax
                await client.sendMessage(chatId, { image: { url: djData.revealedImageUrl } });
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

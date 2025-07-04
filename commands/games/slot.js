const { findOrCreateUser } = require('../../utils/userUtils');
const { MIN_BET, MAX_BET, SYMBOLS } = require('../../games/slot/constants');
const slotGame = require('../../games/slot');
const { getCurrency } = require('../../utils/groupUtils');

const userCooldowns = new Map();

module.exports = {
    name: 'slot',
    aliases: ['tragamonedas'],
    category: 'game',
    description: 'Juega al tragamonedas',
    async execute(message, args, commands) {
        const sock = require('../../bot').getSocket();
        const jid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const user = await findOrCreateUser(jid, chatId);
        const currency = await getCurrency(chatId);

        if (args[0]?.toLowerCase() === 'info') {
            return slotGame.getInfo(sock, chatId);
        }

        // Cooldown check
        if (userCooldowns.has(jid)) {
            const lastTime = userCooldowns.get(jid);
            const now = Date.now();
            const diff = now - lastTime;
            if (diff < 40000) { // 40 seconds
                const timeLeft = Math.ceil((40000 - diff) / 1000);
                return sock.sendMessage(chatId, { text: `⏳ Espera ${timeLeft} segundos antes de volver a jugar.` });
            }
        }

        let betAmount = parseInt(args[0]);

        if (isNaN(betAmount)) {
            betAmount = MIN_BET;
        }

        if (betAmount < MIN_BET) {
            return sock.sendMessage(chatId, { text: `La apuesta mínima es ${currency} ${MIN_BET}.` });
        }

        if (betAmount > MAX_BET) {
            return sock.sendMessage(chatId, { text: `La apuesta máxima es ${currency} ${MAX_BET}.` });
        }

        if (user.economy.wallet < betAmount) {
            return sock.sendMessage(chatId, { text: `No tienes suficiente dinero para apostar ${currency} ${betAmount}.` });
        }

        // Deduct bet immediately
        user.economy.wallet -= betAmount;
        await user.save();

        // Set cooldown
        userCooldowns.set(jid, Date.now());

        try {
            await slotGame.play(sock, chatId, jid, user, betAmount);
        } catch (error) {
            console.error('Error en el juego de slot:', error);
            // Refund on error
            user.economy.wallet += betAmount;
            await user.save();
            sock.sendMessage(chatId, { text: 'Ocurrió un error inesperado al procesar el juego. Tu apuesta ha sido devuelta.' });
        }
    },
};

const { findOrCreateUser } = require('../../utils/userUtils');
const { MIN_BET, MAX_BET } = require('../../games/slot/constants');
const slotGame = require('../../games/slot');
const { getCurrency } = require('../../utils/groupUtils');

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

        // Cooldown check from database
        if (user.cooldowns.slot) {
            const now = Date.now();
            const diff = now - user.cooldowns.slot.getTime();
            if (diff < 10000) { // 10 seconds
                const timeLeft = Math.ceil((10000 - diff) / 1000);
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
            return sock.sendMessage(chatId, { 
                text: `💸 @${jid.split('@')[0]}, no tienes suficiente dinero para apostar ${currency} ${betAmount}.`,
                mentions: [jid]
            });
        }

        // Deduct bet and set cooldown atomically
        user.economy.wallet -= betAmount;
        user.cooldowns.slot = new Date();

        try {
            await user.save(); // Save changes before playing
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

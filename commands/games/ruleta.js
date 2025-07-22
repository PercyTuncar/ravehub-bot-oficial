const User = require('../../models/User');
const { getCurrency } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');

const ROULETTE_COOLDOWN = 15000; // 15 segundos

const numbers = {
    0: 'green',
    1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red',
    10: 'black', 11: 'black', 12: 'red', 13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
    19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black', 25: 'red', 26: 'black', 27: 'red',
    28: 'black', 29: 'black', 30: 'red', 31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};

module.exports = {
    name: 'ruleta',
    aliases: ['roulette'],
    category: 'games',
    description: 'Apuesta en la ruleta. Opciones: <rojo|negro|numero> <monto>',
    usage: '.ruleta <apuesta> <monto>',
    async execute(message, args) {
        const sock = getSocket();
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

        if (args.length < 2) {
            return sock.sendMessage(chatId, { text: `Uso: .ruleta <rojo|negro|numero> <monto>. Ejemplo: .ruleta rojo 100` });
        }

        const betType = args[0].toLowerCase();
        const betAmount = parseInt(args[1]);

        if (isNaN(betAmount) || betAmount <= 0) {
            return sock.sendMessage(chatId, { text: 'El monto de la apuesta debe ser un número positivo.' });
        }

        const user = await User.findOne({ jid: senderJid, groupId: chatId });

        if (!user) {
            return sock.sendMessage(chatId, { text: 'No estás registrado. Usa .iniciar para comenzar.' });
        }

        if (user.cooldowns.ruleta && (new Date() - user.cooldowns.ruleta) < ROULETTE_COOLDOWN) {
            const timeLeft = Math.ceil((ROULETTE_COOLDOWN - (new Date() - user.cooldowns.ruleta)) / 1000);
            return sock.sendMessage(chatId, { text: `⏳ Debes esperar ${timeLeft} segundos para volver a jugar a la ruleta.` });
        }

        if (user.economy.wallet < betAmount) {
            return sock.sendMessage(chatId, { text: `No tienes suficiente dinero en la cartera para apostar ${currency} ${betAmount}.` });
        }

        const winningNumber = Math.floor(Math.random() * 37);
        const winningColor = numbers[winningNumber];

        let win = false;
        let payout = 0;

        if (betType === 'rojo' || betType === 'negro') {
            if (betType === winningColor) {
                win = true;
                payout = betAmount * 2;
            }
        } else if (!isNaN(parseInt(betType)) && parseInt(betType) >= 0 && parseInt(betType) <= 36) {
            if (parseInt(betType) === winningNumber) {
                win = true;
                payout = betAmount * 35;
            }
        } else {
            return sock.sendMessage(chatId, { text: `Apuesta inválida. Debes apostar a 'rojo', 'negro' o un número entre 0 y 36.` });
        }

        let resultText = `La bola cayó en... *${winningNumber} ${winningColor.charAt(0).toUpperCase() + winningColor.slice(1)}*!\n\n`;
        let updateUser;

        if (win) {
            resultText += `¡Felicidades, @${senderJid.split('@')[0]}! Ganaste ${currency} ${payout.toLocaleString()}.`;
            updateUser = await User.findOneAndUpdate(
                { _id: user._id },
                { $inc: { 'economy.wallet': payout - betAmount }, $set: { 'cooldowns.ruleta': new Date() } },
                { new: true }
            );
        } else {
            resultText += `Mejor suerte la próxima, @${senderJid.split('@')[0]}. Perdiste ${currency} ${betAmount.toLocaleString()}.`;
            updateUser = await User.findOneAndUpdate(
                { _id: user._id },
                { $inc: { 'economy.wallet': -betAmount }, $set: { 'cooldowns.ruleta': new Date() } },
                { new: true }
            );
        }

        if (!updateUser) {
            return sock.sendMessage(chatId, { text: '❌ Ocurrió un error al actualizar tu saldo.' });
        }

        await sock.sendMessage(chatId, { text: resultText, mentions: [senderJid] });
    },
};
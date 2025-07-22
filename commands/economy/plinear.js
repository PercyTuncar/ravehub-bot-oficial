const { findOrCreateUser } = require('../../utils/userUtils');
const User = require('../../models/User');
const { getCurrency } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'plinear',
    description: 'Enviar 💵 usando Plin.',
    usage: '.plinear <monto> @usuario',
    category: 'economy',
    aliases: ['plin'],
    async execute(message, args, commands) {
        const sock = bot.getSocket();
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

        const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const amountStr = args.find(arg => !isNaN(parseInt(arg)));
        const amount = amountStr ? parseInt(amountStr) : 0;

        if (!mentionedJid || amount <= 0) {
            return sock.sendMessage(chatId, { text: 'Formato incorrecto. Uso: .pline @usuario <cantidad>' });
        }

        if (senderJid === mentionedJid) {
            return sock.sendMessage(chatId, { text: 'No te puedes plinear a ti mismo, ¡pasa la voz a un amigo!' });
        }

        try {
            const sender = await findOrCreateUser(senderJid, chatId, message.pushName);
            const target = await findOrCreateUser(mentionedJid, chatId);

            if (sender.economy.bank < amount) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero en tu banco para plinear esa cantidad. Saldo actual: ${currency} ${sender.economy.bank.toLocaleString()}` });
            }

            const ops = [
                { updateOne: { filter: { _id: sender._id, 'economy.bank': { $gte: amount } }, update: { $inc: { 'economy.bank': -amount } } } },
                { updateOne: { filter: { _id: target._id }, update: { $inc: { 'economy.bank': amount } } } }
            ];

            const result = await User.bulkWrite(ops);

            if (result.modifiedCount < 2) {
                return sock.sendMessage(chatId, { text: `No tienes fondos suficientes para plinear ${currency} ${amount.toLocaleString()}.` });
            }

            const finalMessage = `✅ Plin exitoso de *${currency} ${amount.toLocaleString()}* a @${target.jid.split('@')[0]}.`;
            await sock.sendMessage(chatId, { text: finalMessage, mentions: [senderJid, mentionedJid] });

        } catch (error) {
            console.error('Error en el plineo:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al realizar el plineo.' });
        }
    }
};
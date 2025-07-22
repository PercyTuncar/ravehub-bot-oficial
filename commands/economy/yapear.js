const { findOrCreateUser } = require('../../utils/userUtils');
const User = require('../../models/User');
const { getCurrency } = require('../../utils/groupUtils');

module.exports = {
    name: 'yapear',
    description: 'Enviar 💵 usando Yape.',
    aliases: ['yape'],
    usage: '.yapear <monto> @usuario',
    category: 'economy',
    async execute(message, args, client) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

        const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const amountStr = args.find(arg => !isNaN(parseInt(arg)));
        const amount = amountStr ? parseInt(amountStr) : 0;

        if (!mentionedJid || amount <= 0) {
            return client.sendMessage(chatId, { text: 'Formato incorrecto. Para yapear, usa: .yapear <monto> @usuario' });
        }

        if (senderJid === mentionedJid) {
            return client.sendMessage(chatId, { text: 'No te puedes yapear a ti mismo, ¡intenta con un amigo!' });
        }

        try {
            const sender = await findOrCreateUser(senderJid, chatId, message.pushName);
            const recipient = await findOrCreateUser(mentionedJid, chatId);

            if (sender.economy.bank < amount) {
                return client.sendMessage(chatId, { text: `🚫 No tienes suficiente dinero en tu banco para yapear.\n\nSaldo actual: *${currency} ${sender.economy.bank.toLocaleString()}*` });
            }

            const ops = [
                { updateOne: { filter: { _id: sender._id, 'economy.bank': { $gte: amount } }, update: { $inc: { 'economy.bank': -amount } } } },
                { updateOne: { filter: { _id: recipient._id }, update: { $inc: { 'economy.bank': amount } } } }
            ];

            const result = await User.bulkWrite(ops);

            if (result.modifiedCount < 2) {
                return client.sendMessage(chatId, { text: `No tienes fondos suficientes para yapear ${currency} ${amount.toLocaleString()}.` });
            }

            const finalMessage = `✅ Has yapeado *${currency} ${amount.toLocaleString()}* a @${recipient.jid.split('@')[0]}.`;
            await client.sendMessage(chatId, { text: finalMessage, mentions: [senderJid, recipient.jid] });

        } catch (error) {
            console.error('Error en el comando de yapeo:', error);
            await client.sendMessage(chatId, { text: 'Hubo un problema al procesar tu yapeo.' });
        }
    }
};
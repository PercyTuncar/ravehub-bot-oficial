const { findOrCreateUser } = require('../../utils/userUtils');
const { getCurrency } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');
const User = require('../../models/User');

module.exports = {
    name: 'transfer-bank',
    description: 'Transfiere 💵.',
    usage: '.transfer-bank <monto> @usuario',
    category: 'economy',
    aliases: ['tbank', 'transferbanco'],
    async execute(message, args) {
        const sock = getSocket();
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

        const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const amountStr = args.find(arg => !isNaN(parseInt(arg)));
        const amount = amountStr ? parseInt(amountStr) : 0;

        if (!mentionedJid || amount <= 0) {
            return sock.sendMessage(chatId, { text: 'Formato incorrecto. Uso: .transfer-bank @usuario <cantidad>' });
        }

        if (senderJid === mentionedJid) {
            return sock.sendMessage(chatId, { text: 'No puedes transferirte dinero a ti mismo.' });
        }

        try {
            const sender = await findOrCreateUser(senderJid, chatId, message.pushName);
            const target = await findOrCreateUser(mentionedJid, chatId);

            if (sender.economy.bank < amount) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero en tu banco. Saldo actual: ${currency}${sender.economy.bank.toLocaleString()}` });
            }

            const ops = [
                { updateOne: { filter: { _id: sender._id, 'economy.bank': { $gte: amount } }, update: { $inc: { 'economy.bank': -amount } } } },
                { updateOne: { filter: { _id: target._id }, update: { $inc: { 'economy.bank': amount } } } }
            ];

            const result = await User.bulkWrite(ops);

            if (result.modifiedCount < 2) {
                return sock.sendMessage(chatId, { text: `No tienes fondos suficientes para transferir ${currency} ${amount.toLocaleString()}.` });
            }

            const updatedSender = await User.findById(sender._id);
            await sock.sendMessage(chatId, {
                text: `✅ Transferencia bancaria exitosa de *${currency} ${amount.toLocaleString()}* a @${mentionedJid.split('@')[0]}.\n\n*Tu nuevo saldo en banco:* ${currency} ${updatedSender.economy.bank.toLocaleString()}`,
                mentions: [senderJid, mentionedJid]
            });

        } catch (error) {
            console.error('Error en la transferencia bancaria:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al realizar la transferencia bancaria.' });
        }
    }
};
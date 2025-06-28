const User = require('../../models/User');
const Economy = require('../../models/Economy');

module.exports = {
    name: 'transfer',
    description: 'Transfiere dinero a otro usuario.',
    category: 'economy',
    async execute(sock, message, args) {
        const senderId = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const senderName = message.pushName || 'Usuario Desconocido';

        const [mention, amountStr] = args;

        if (!mention || !mention.startsWith('@') || !amountStr || isNaN(parseInt(amountStr))) {
            return sock.sendMessage(chatId, { text: 'Formato incorrecto. Uso: .transfer @usuario <cantidad>' });
        }

        const amount = parseInt(amountStr);
        const targetId = `${mention.slice(1)}@s.whatsapp.net`;

        if (amount <= 0) {
            return sock.sendMessage(chatId, { text: 'La cantidad a transferir debe ser mayor que cero.' });
        }

        try {
            // Asegurar que el emisor (sender) exista en la DB
            let senderUser = await User.findOne({ userId: senderId });
            if (!senderUser) {
                senderUser = new User({ userId: senderId, name: senderName });
                await senderUser.save();
            }
            let senderEconomy = await Economy.findOne({ userId: senderId });
            if (!senderEconomy) {
                senderEconomy = new Economy({ userId: senderId });
                await senderEconomy.save();
            }

            if (senderEconomy.wallet < amount) {
                return sock.sendMessage(chatId, { text: 'No tienes suficiente dinero en tu cartera para realizar esta transferencia.' });
            }

            // Asegurar que el receptor (target) exista en la DB
            let targetUser = await User.findOne({ userId: targetId });
            if (!targetUser) {
                return sock.sendMessage(chatId, { text: `No se puede transferir a @${targetId.split('@')[0]}, no es un usuario registrado.`, mentions: [targetId] });
            }
            let targetEconomy = await Economy.findOne({ userId: targetId });
            if (!targetEconomy) {
                targetEconomy = new Economy({ userId: targetId });
                await targetEconomy.save();
            }

            senderEconomy.wallet -= amount;
            targetEconomy.wallet += amount;

            await senderEconomy.save();
            await targetEconomy.save();

            await sock.sendMessage(chatId, { 
                text: `Has transferido ${amount} a @${targetId.split('@')[0]}. Tu nuevo saldo es ${senderEconomy.wallet}.`,
                mentions: [senderId, targetId]
            });

        } catch (error) {
            console.error('Error en la transferencia:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al realizar la transferencia.' });
        }
    }
};

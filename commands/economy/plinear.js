const User = require('../../models/User');
const Economy = require('../../models/Economy');

module.exports = {
    name: 'plinear',
    description: 'Plinea dinero a otro usuario.',
    category: 'economy',
    async execute(sock, message, args) {
        const senderId = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const senderName = message.pushName || 'Usuario Desconocido';

        const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const amountStr = args.find(arg => !isNaN(parseInt(arg)));
        const amount = amountStr ? parseInt(amountStr) : 0;

        if (!mentionedJid || amount <= 0) {
            return sock.sendMessage(chatId, { text: 'Formato incorrecto. Para plinear, usa: .plinear @usuario <monto>' });
        }

        const targetId = mentionedJid;

        if (senderId === targetId) {
            return sock.sendMessage(chatId, { text: 'No te puedes plinear a ti mismo, ¡pasa la voz a un amigo!' });
        }

        try {
            // Asegurar que el emisor (sender) exista en la DB
            let senderEconomy = await Economy.findOne({ userId: senderId });
            if (!senderEconomy) {
                await new User({ userId: senderId, name: senderName }).save();
                senderEconomy = new Economy({ userId: senderId });
                await senderEconomy.save();
            }

            if (senderEconomy.wallet < amount) {
                return sock.sendMessage(chatId, { text: `¡Saldo insuficiente! No tienes suficiente para este Plin. Saldo actual: ${senderEconomy.wallet}` });
            }

            // Asegurar que el receptor (target) exista en la DB, si no, lo crea
            let targetEconomy = await Economy.findOne({ userId: targetId });
            if (!targetEconomy) {
                const targetName = targetId.split('@')[0];
                await new User({ userId: targetId, name: targetName }).save();
                targetEconomy = new Economy({ userId: targetId });
                await targetEconomy.save();
            }

            senderEconomy.wallet -= amount;
            targetEconomy.wallet += amount;

            await senderEconomy.save();
            await targetEconomy.save();

            await sock.sendMessage(chatId, { 
                text: `✅ ¡Plin exitoso! Le enviaste ${amount} a @${targetId.split('@')[0]}.\n\nTu nuevo saldo es: ${senderEconomy.wallet}`,
                mentions: [senderId, targetId]
            });

        } catch (error) {
            console.error('Error en el comando de plineo:', error);
            await sock.sendMessage(chatId, { text: 'Hubo un problema al procesar tu Plin.' });
        }
    }
};

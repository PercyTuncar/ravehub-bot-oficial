const User = require('../../models/User');
const Economy = require('../../models/Economy');

module.exports = {
    name: 'rob',
    description: 'Intenta robar a otro usuario.',
    category: 'economy',
    async execute(sock, message, args) {
        const senderId = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const senderName = message.pushName || 'Usuario Desconocido';

        const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        if (!mentionedJid) {
            return sock.sendMessage(chatId, { text: 'Debes mencionar a un usuario para robarle. Ejemplo: .rob @usuario' });
        }

        const targetId = mentionedJid;

        if (senderId === targetId) {
            return sock.sendMessage(chatId, { text: 'No puedes robarte a ti mismo.' });
        }

        try {
            // Asegurar que el ladrón (sender) exista en la DB
            let senderEconomy = await Economy.findOne({ userId: senderId });
            if (!senderEconomy) {
                await new User({ userId: senderId, name: senderName }).save();
                senderEconomy = new Economy({ userId: senderId });
                await senderEconomy.save();
            }

            // La víctima (target) debe existir en la DB para poder robarle
            const targetEconomy = await Economy.findOne({ userId: targetId });
            if (!targetEconomy) {
                return sock.sendMessage(chatId, { text: `No se puede robar a @${targetId.split('@')[0]}, no es un usuario registrado.`, mentions: [targetId] });
            }

            if (targetEconomy.wallet <= 0) {
                return sock.sendMessage(chatId, { text: `@${targetId.split('@')[0]} no tiene dinero en su cartera para robar.`, mentions: [targetId] });
            }

            const robChance = Math.random();
            if (robChance < 0.6) { // 60% de probabilidad de fallo
                const fine = Math.floor(senderEconomy.wallet * 0.1); // Multa del 10% de la cartera del ladrón
                senderEconomy.wallet -= fine;
                await senderEconomy.save();
                return sock.sendMessage(chatId, { text: `¡Fallaste! Te han multado con ${fine} por intentar robar a @${targetId.split('@')[0]}.`, mentions: [senderId, targetId] });
            }

            const amountToSteal = Math.floor(targetEconomy.wallet * (Math.random() * 0.25 + 0.05)); // Robar entre 5% y 30%
            senderEconomy.wallet += amountToSteal;
            targetEconomy.wallet -= amountToSteal;

            await senderEconomy.save();
            await targetEconomy.save();

            await sock.sendMessage(chatId, { text: `¡Has robado ${amountToSteal} a @${targetId.split('@')[0]}!`, mentions: [senderId, targetId] });

        } catch (error) {
            console.error('Error en el comando de robo:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error durante el robo.' });
        }
    }
};

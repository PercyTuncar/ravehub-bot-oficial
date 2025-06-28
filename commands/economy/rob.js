const User = require('../../models/User');

module.exports = {
    name: 'rob',
    description: 'Intenta robar a otro usuario.',
    category: 'economy',
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        if (!mentionedJid) {
            return sock.sendMessage(chatId, { text: 'Debes mencionar a un usuario para robarle. Ejemplo: .rob @usuario' });
        }

        if (senderJid === mentionedJid) {
            return sock.sendMessage(chatId, { text: 'No puedes robarte a ti mismo.' });
        }

        try {
            let sender = await User.findOne({ jid: senderJid });
            if (!sender) {
                sender = new User({ jid: senderJid, name: message.pushName || senderJid.split('@')[0] });
                await sender.save();
            }

            const target = await User.findOne({ jid: mentionedJid });
            if (!target) {
                return sock.sendMessage(chatId, { text: `No se puede robar a @${mentionedJid.split('@')[0]}, no tiene una cuenta.`, mentions: [mentionedJid] });
            }

            if (target.economy.wallet <= 0) {
                return sock.sendMessage(chatId, { text: `@${mentionedJid.split('@')[0]} no tiene dinero en su cartera para robar.`, mentions: [mentionedJid] });
            }

            const robChance = Math.random();
            if (robChance < 0.6) { // 60% de probabilidad de fallo
                const fine = Math.floor(sender.economy.wallet * 0.1); // Multa del 10% de la cartera del ladrón
                sender.economy.wallet -= fine;
                await sender.save();
                return sock.sendMessage(chatId, { text: `💀 ¡Fallaste! La policía te atrapó y te multó con ${fine} 🪙 por intentar robar a @${mentionedJid.split('@')[0]}.`, mentions: [senderJid, mentionedJid] });
            }

            const amountToSteal = Math.floor(target.economy.wallet * (Math.random() * 0.25 + 0.05)); // Robar entre 5% y 30%
            sender.economy.wallet += amountToSteal;
            target.economy.wallet -= amountToSteal;

            await sender.save();
            await target.save();

            await sock.sendMessage(chatId, { text: `💰 ¡Éxito! Has robado ${amountToSteal} 🪙 de la cartera de @${mentionedJid.split('@')[0]}!`, mentions: [senderJid, mentionedJid] });

        } catch (error) {
            console.error('Error en el comando de robo:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error durante el robo.' });
        }
    }
};

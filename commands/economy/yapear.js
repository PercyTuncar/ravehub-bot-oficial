const User = require('../../models/User');

module.exports = {
    name: 'yapear',
    description: 'Transfiere dinero a otro usuario usando Yape.',
    usage: '.yapear <monto> @usuario',
    category: 'economy',
    aliases: ['yape'],
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const amountStr = args.find(arg => !isNaN(parseInt(arg)));
        const amount = amountStr ? parseInt(amountStr) : 0;

        if (!mentionedJid || amount <= 0) {
            return sock.sendMessage(chatId, { text: 'Formato incorrecto. Para yapear, usa: .yapear @usuario <monto>' });
        }

        if (senderJid === mentionedJid) {
            return sock.sendMessage(chatId, { text: 'No te puedes yapear a ti mismo, ¡intenta con un amigo!' });
        }

        try {
            let sender = await User.findOne({ jid: senderJid });
            if (!sender) {
                sender = new User({ jid: senderJid, name: message.pushName || senderJid.split('@')[0] });
                await sender.save();
            }

            if (sender.economy.bank < amount) {
                return sock.sendMessage(chatId, { text: `¡Saldo insuficiente en tu banco! No tienes suficiente para este yapeo. Saldo en banco: ${sender.economy.bank} 💵` });
            }

            let target = await User.findOne({ jid: mentionedJid });
            if (!target) {
                const targetName = mentionedJid.split('@')[0];
                target = new User({ jid: mentionedJid, name: targetName });
                await target.save();
            }

            sender.economy.bank -= amount;
            target.economy.bank += amount;

            await sender.save();
            await target.save();

            await sock.sendMessage(chatId, { 
                text: `✅ ¡Yapeo exitoso! Le yapeaste $ ${amount} 💵 a @${mentionedJid.split('@')[0]} desde tu banco.\n\nTu nuevo saldo en el banco es: $ ${sender.economy.bank} 💵`,
                mentions: [senderJid, mentionedJid]
            });

        } catch (error) {
            console.error('Error en el comando de yapeo:', error);
            await sock.sendMessage(chatId, { text: 'Hubo un problema al procesar tu yapeo.' });
        }
    }
};

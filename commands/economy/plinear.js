const { findOrCreateUser } = require('../../utils/userUtils');

module.exports = {
    name: 'plinear',
    description: 'Transfiere 💵 usando Plin.',
    usage: '.plinear <monto> @usuario',
    category: 'economy',
    aliases: ['plin'],
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

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
            // Refactorización: Usar la función centralizada para obtener el emisor.
            const sender = await findOrCreateUser(senderJid, message.pushName);

            if (sender.economy.bank < amount) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero en tu banco. Saldo actual: ${sender.economy.bank} 💵` });
            }

            // Refactorización: Usar la función centralizada para obtener el receptor.
            const targetName = message.message.extendedTextMessage?.contextInfo?.pushName || mentionedJid.split('@')[0];
            const target = await findOrCreateUser(mentionedJid, targetName);

            sender.economy.bank -= amount;
            target.economy.bank += amount;

            await sender.save();
            await target.save();

            await sock.sendMessage(chatId, { 
                text: `✅ Plin exitoso de ${amount} 💵 a @${mentionedJid.split('@')[0]}.\n\nTu nuevo saldo en banco es: ${sender.economy.bank} 💵`,
                mentions: [senderJid, mentionedJid]
            });

        } catch (error) {
            console.error('Error en el plineo:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al realizar el plineo.' });
        }
    }
};

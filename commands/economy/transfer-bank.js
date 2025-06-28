const { findOrCreateUser } = require('../../utils/userUtils');

module.exports = {
    name: 'transfer-bank',
    description: 'Transfiere dinero de tu banco a la cuenta de banco de otro usuario.',
    usage: '.transfer-bank <monto> @usuario',
    category: 'economy',
    aliases: ['tbank'],
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

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
            const sender = await findOrCreateUser(senderJid, message.pushName);
            if (sender.economy.bank < amount) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero en tu banco. Saldo actual: ${sender.economy.bank} 🏦` });
            }

            const target = await findOrCreateUser(mentionedJid);

            sender.economy.bank -= amount;
            target.economy.bank += amount;

            await sender.save();
            await target.save();

            await sock.sendMessage(chatId, {
                text: `✅ Transferencia bancaria exitosa de ${amount} 🏦 a @${mentionedJid.split('@')[0]}.\n\nTu nuevo saldo en banco es: ${sender.economy.bank} 🏦`,
                mentions: [senderJid, mentionedJid]
            });

        } catch (error) {
            console.error('Error en la transferencia bancaria:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al realizar la transferencia bancaria.' });
        }
    }
};

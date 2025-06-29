const { findOrCreateUser } = require('../../utils/userUtils');

module.exports = {
    name: 'transfer',
    description: 'Transferir a usuario.',
    aliases: ['pay', 'pagar'],
    usage: '.transfer <monto> @usuario',
    category: 'economy',
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const amountStr = args.find(arg => !isNaN(parseInt(arg)));
        const amount = amountStr ? parseInt(amountStr) : 0;

        if (!mentionedJid || amount <= 0) {
            return sock.sendMessage(chatId, { text: 'Formato incorrecto. Uso: .transfer @usuario <cantidad>' });
        }

        if (senderJid === mentionedJid) {
            return sock.sendMessage(chatId, { text: 'No puedes transferirte dinero a ti mismo.' });
        }

        try {
            // Refactorización: Usar la función centralizada para obtener el emisor.
            const sender = await findOrCreateUser(senderJid, message.pushName);

            if (sender.economy.wallet < amount) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero en tu cartera. Saldo actual: ${sender.economy.wallet} 💵` });
            }

            // Refactorización: Usar la función centralizada para obtener el receptor.
            const targetName = message.message.extendedTextMessage?.contextInfo?.pushName || mentionedJid.split('@')[0];
            const target = await findOrCreateUser(mentionedJid, targetName);

            sender.economy.wallet -= amount;
            target.economy.wallet += amount;

            // --- Lógica de Deuda Judicial ---
            if (target.judicialDebt > 0) {
                const debtPaid = Math.min(amount, target.judicialDebt);
                target.judicialDebt -= debtPaid;
                await sock.sendMessage(chatId, {
                    text: `⚖️ Se ha descontado automáticamente *${debtPaid} 💵* de la transferencia recibida por @${mentionedJid.split('@')[0]} para pagar su deuda judicial.\n*Deuda restante:* ${target.judicialDebt} 💵`,
                    mentions: [mentionedJid]
                });
            }

            await sender.save();
            await target.save();

            await sock.sendMessage(chatId, { 
                text: `✅ Transferencia de cartera exitosa de ${amount} 💵 a @${mentionedJid.split('@')[0]}.\n\nTu nuevo saldo en cartera es: ${sender.economy.wallet} 💵`,
                mentions: [senderJid, mentionedJid]
            });

        } catch (error) {
            console.error('Error en la transferencia:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al realizar la transferencia.' });
        }
    }
};

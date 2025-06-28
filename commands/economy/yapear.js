const { findOrCreateUser } = require('../../utils/userUtils');

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
            const sender = await findOrCreateUser(senderJid, message.pushName);

            if (sender.economy.bank < amount) {
                return sock.sendMessage(chatId, { text: `¡Saldo insuficiente en tu banco! No tienes suficiente para este yapeo. Saldo en banco: ${sender.economy.bank} 💵` });
            }

            const target = await findOrCreateUser(mentionedJid);

            sender.economy.bank -= amount;
            target.economy.bank += amount;

            // --- Lógica de Deuda Judicial ---
            if (target.judicialDebt > 0) {
                const debtPaid = Math.min(amount, target.judicialDebt);
                target.judicialDebt -= debtPaid;
                await sock.sendMessage(chatId, {
                    text: `⚖️ Se ha descontado automáticamente *${debtPaid} 💵* del yapeo recibido por @${mentionedJid.split('@')[0]} para pagar su deuda judicial.\n*Deuda restante:* ${target.judicialDebt} 💵`,
                    mentions: [mentionedJid]
                });
            }

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

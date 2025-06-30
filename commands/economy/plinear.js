const { findOrCreateUser } = require('../../utils/userUtils');
const User = require('../../models/User');
const Debt = require('../../models/Debt');
const { getCurrency } = require('../../utils/groupUtils');

module.exports = {
    name: 'plinear',
    description: 'Enviar 💵 usando Plin.',
    usage: '.plinear <monto> @usuario',
    category: 'economy',
    aliases: ['plin'],
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

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
            const sender = await findOrCreateUser(senderJid, chatId, message.pushName);

            if (sender.economy.bank < amount) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero en tu banco. Saldo actual: ${currency}${sender.economy.bank}` });
            }

            // Refactorización: Usar la función centralizada para obtener el receptor.
            const targetName = message.message.extendedTextMessage?.contextInfo?.pushName || mentionedJid.split('@')[0];
            const target = await findOrCreateUser(mentionedJid, chatId, targetName);

            sender.economy.bank -= amount;
            target.economy.bank += amount;

            await sender.save();
            await target.save();

            // Nueva lógica: Manejo de deudas
            const debtToTarget = await Debt.findOne({ borrower: sender._id, lender: target._id });
            let debtMessage = '';

            if (debtToTarget) {
                const payment = Math.min(amount, debtToTarget.amount);
                debtToTarget.amount -= payment;
                sender.economy.bank -= payment;
                target.economy.bank += payment;
                amount -= payment;

                if (debtToTarget.amount <= 0) {
                    await Debt.findByIdAndDelete(debtToTarget._id);
                    sender.debts.pull(debtToTarget._id);
                    debtMessage = `\n\nHas saldado tu deuda de ${currency}${payment} con @${target.jid.split('@')[0]}. ¡Deuda pagada!`;
                } else {
                    await debtToTarget.save();
                    debtMessage = `\n\nHas pagado ${currency}${payment} de tu deuda a @${target.jid.split('@')[0]}. Deuda restante: ${currency}${debtToTarget.amount}.`;
                }
            }

            await sock.sendMessage(chatId, { 
                text: `✅ Plin exitoso de ${currency}${amount} a @${mentionedJid.split('@')[0]}.\n\nTu nuevo saldo en banco es: ${currency}${sender.economy.bank}${debtMessage}`,
                mentions: [senderJid, mentionedJid]
            });

        } catch (error) {
            console.error('Error en el plineo:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al realizar el plineo.' });
        }
    }
};

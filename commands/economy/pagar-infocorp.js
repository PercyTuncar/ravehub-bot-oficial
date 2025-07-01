const { findOrCreateUser } = require('../../utils/userUtils');
const { getCurrency } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'pagar-infocorp',
    description: 'Paga tu deuda Infocorp.',
    aliases: ['pagarinfocorp', 'pagar infocorp'],
    usage: '.pagar infocorp <monto|all|todo>',
    category: 'economy',
    async execute(message, args) {
        const sock = getSocket();
        const jid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);
        let user = await findOrCreateUser(jid, chatId, message.pushName);

        if (!user.judicialDebt || user.judicialDebt <= 0) {
            return sock.sendMessage(chatId, {
                text: `✅ @${jid.split('@')[0]}, no tienes deuda judicial pendiente en Infocorp.`,
                mentions: [jid]
            });
        }

        if (!args[0]) {
            return sock.sendMessage(chatId, {
                text: `Uso: .pagar infocorp <monto|all|todo>\nEjemplo: .pagar infocorp 100`,
                mentions: [jid]
            });
        }

        let monto = 0;
        if (['all', 'todo'].includes(args[0].toLowerCase())) {
            monto = Math.min(user.judicialDebt, user.economy.wallet);
        } else {
            monto = parseInt(args[0].replace(/[^0-9]/g, ''));
            if (isNaN(monto) || monto <= 0) {
                return sock.sendMessage(chatId, {
                    text: `❌ Monto inválido. Usa un número positivo, "all" o "todo".`,
                    mentions: [jid]
                });
            }
            if (monto > user.economy.wallet) {
                return sock.sendMessage(chatId, {
                    text: `❌ No tienes suficiente dinero en tu cartera para pagar *${currency}${monto}* (Saldo: ${currency}${user.economy.wallet}).`,
                    mentions: [jid]
                });
            }
            monto = Math.min(monto, user.judicialDebt);
        }

        if (monto <= 0) {
            return sock.sendMessage(chatId, {
                text: `❌ No puedes pagar 0 o menos.`,
                mentions: [jid]
            });
        }

        user.economy.wallet -= monto;
        user.judicialDebt -= monto;
        if (user.judicialDebt < 0) user.judicialDebt = 0;
        await user.save();

        let msg = `✅ @${jid.split('@')[0]}, pagaste *${currency}${monto}* de tu deuda judicial (Infocorp).\n`;
        if (user.judicialDebt > 0) {
            msg += `Deuda restante: *${currency}${user.judicialDebt}*.`;
        } else {
            msg += `¡Felicidades! Has saldado toda tu deuda judicial.`;
        }
        return sock.sendMessage(chatId, { text: msg, mentions: [jid] });
    }
};

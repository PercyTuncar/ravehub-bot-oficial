const User = require('../../models/User');

module.exports = {
    name: 'deposit',
    description: 'Deposita dinero de tu cartera a tu banco.',
    category: 'economy',
    aliases: ['depositar', 'bank'],
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            let user = await User.findOne({ jid: senderJid });
            if (!user) {
                user = new User({ jid: senderJid, name: message.pushName || senderJid.split('@')[0] });
                await user.save();
            }

            if (args.length === 0) {
                return sock.sendMessage(chatId, { text: `Uso del comando:\n.deposit <cantidad>\n.deposit all` });
            }

            const amountToDepositStr = args[0].toLowerCase();
            let amountToDeposit;

            if (amountToDepositStr === 'all') {
                amountToDeposit = user.economy.wallet;
            } else {
                amountToDeposit = parseInt(amountToDepositStr);
                if (isNaN(amountToDeposit) || amountToDeposit <= 0) {
                    return sock.sendMessage(chatId, { text: 'Por favor, introduce una cantidad válida para depositar.' });
                }
            }

            if (user.economy.wallet < amountToDeposit) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero en tu cartera. Saldo actual: ${user.economy.wallet} 💵` });
            }
            
            if (amountToDeposit === 0) {
                return sock.sendMessage(chatId, { text: 'No tienes dinero en tu cartera para depositar.' });
            }

            user.economy.wallet -= amountToDeposit;
            user.economy.bank += amountToDeposit;

            await user.save();

            const responseText = 
`✅ Depósito exitoso de ${amountToDeposit} 💵.\n\n*Nuevo Balance:*
*Cartera:* ${user.economy.wallet} 💵
*Banco:* ${user.economy.bank} 🏦`;

            await sock.sendMessage(chatId, { 
                text: responseText,
                mentions: [senderJid]
            });

        } catch (error) {
            console.error('Error en el comando de depósito:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al procesar tu depósito.' });
        }
    }
};

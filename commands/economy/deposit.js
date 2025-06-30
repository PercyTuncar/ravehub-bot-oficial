const { findOrCreateUser } = require('../../utils/userUtils');
const { getCurrency } = require('../../utils/groupUtils');

module.exports = {
    name: 'deposit',
    description: 'Depositar dinero.',
    usage: '.deposit <cantidad>',
    category: 'economy',
    aliases: ['dep'],
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

        try {
            // Refactorización: Usar la función centralizada para obtener el usuario.
            let user = await findOrCreateUser(senderJid, message.pushName);

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
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero en tu cartera. Saldo actual: ${currency}${user.economy.wallet}` });
            }
            
            if (amountToDeposit === 0) {
                return sock.sendMessage(chatId, { text: 'No tienes dinero en tu cartera para depositar.' });
            }

            user.economy.wallet -= amountToDeposit;
            user.economy.bank += amountToDeposit;

            await user.save();

            const responseText = 
`✅ Depósito exitoso de ${currency}${amountToDeposit}.\n\n*Nuevo Balance:*\n*Cartera:* ${currency}${user.economy.wallet}\n*Banco:* ${currency}${user.economy.bank} 🏦`;

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

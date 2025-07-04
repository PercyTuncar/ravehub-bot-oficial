const { findOrCreateUser } = require('../../utils/userUtils');
const { getCurrency } = require('../../utils/groupUtils');
const { handleDebtPayment } = require('../../utils/debtManager');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'deposit',
    description: 'Depositar dinero.',
    usage: '.deposit <cantidad>',
    category: 'economy',
    aliases: ['dep'],
    async execute(message, args) {
        const sock = getSocket();
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

        try {
            // Refactorización: Usar la función centralizada para obtener el usuario.
            let user = await findOrCreateUser(senderJid, chatId, message.pushName);

            if (args.length === 0) {
                return sock.sendMessage(chatId, { text: `Uso del comando:\n.deposit <cantidad>\n.deposit all`, mentions: [senderJid] });
            }

            const amountToDepositStr = args[0].toLowerCase();
            let amountToDeposit;

            if (amountToDepositStr === 'all') {
                amountToDeposit = user.economy.wallet;
            } else {
                amountToDeposit = parseInt(amountToDepositStr);
                if (isNaN(amountToDeposit) || amountToDeposit <= 0) {
                    return sock.sendMessage(chatId, { text: 'Por favor, introduce una cantidad válida para depositar.', mentions: [senderJid] });
                }
            }

            if (user.economy.wallet < amountToDeposit) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero en tu cartera. Saldo actual: ${currency} ${user.economy.wallet.toLocaleString()}`, mentions: [senderJid] });
            }
            
            if (amountToDeposit === 0) {
                return sock.sendMessage(chatId, { text: 'No tienes dinero en tu cartera para depositar.', mentions: [senderJid] });
            }

            // Realizar la transacción de depósito
            user.economy.wallet -= amountToDeposit;
            user.economy.bank += amountToDeposit;

            let debtMessage = '';
            let levelChangeMessage = '';

            // Lógica de cobro de deuda judicial sobre el saldo del banco
            if (user.judicialDebt > 0 && user.economy.bank > 0) {
                const result = handleDebtPayment(user, user.economy.bank, currency);
                
                // handleDebtPayment ya modifica la deuda y XP del usuario, 
                // ahora actualizamos el banco con el sobrante.
                user.economy.bank = result.remainingAmount;
                debtMessage = result.debtMessage;
                levelChangeMessage = result.levelChangeMessage;
            }

            await user.save();

            let responseText = 
`✅ @${senderJid.split('@')[0]}, depósito exitoso de *${currency} ${amountToDeposit.toLocaleString()}*.`;

            if (debtMessage) {
                responseText += `\n\n${debtMessage}`;
                if (levelChangeMessage) {
                    responseText += `\n${levelChangeMessage}`;
                }
            }

            responseText += `\n\n*Nuevo Balance:*\n> *Cartera:* ${currency} ${user.economy.wallet.toLocaleString()}\n> *Banco:* ${currency} ${user.economy.bank.toLocaleString()} 🏦`;

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

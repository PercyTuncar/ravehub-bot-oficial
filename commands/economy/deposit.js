const User = require('../../models/User');
const Economy = require('../../models/Economy');

module.exports = {
    name: 'deposit',
    description: 'Deposita dinero en tu banco para protegerlo de robos.',
    category: 'economy',
    async execute(sock, message, args) {
        const senderId = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const senderName = message.pushName || 'Usuario Desconocido';

        try {
            // Asegurar que el usuario y su cuenta de economía existan
            let economy = await Economy.findOne({ userId: senderId });
            if (!economy) {
                await new User({ userId: senderId, name: senderName }).save();
                economy = new Economy({ userId: senderId });
                await economy.save();
            }

            if (args.length === 0) {
                return sock.sendMessage(chatId, { text: `Uso del comando:\n.deposit <cantidad>\n.deposit all _es para depositar todo_` });
            }

            const amountToDepositStr = args[0].toLowerCase();
            let amountToDeposit;

            if (amountToDepositStr === 'all') {
                amountToDeposit = economy.wallet;
            } else {
                amountToDeposit = parseInt(amountToDepositStr);
                if (isNaN(amountToDeposit) || amountToDeposit <= 0) {
                    return sock.sendMessage(chatId, { text: 'Por favor, introduce una cantidad válida para depositar.' });
                }
            }

            if (economy.wallet < amountToDeposit) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente dinero en tu cartera. Saldo actual: ${economy.wallet}` });
            }
            
            if (economy.bank + amountToDeposit > economy.bankCapacity) {
                return sock.sendMessage(chatId, { text: `No tienes suficiente capacidad en tu banco. Capacidad restante: ${economy.bankCapacity - economy.bank}` });
            }

            economy.wallet -= amountToDeposit;
            economy.bank += amountToDeposit;

            await economy.save();

            const responseText = 
`✅ Depósito exitoso de ${amountToDeposit}.\n\n*Nuevo Balance:*
*Cartera:* ${economy.wallet}
*Banco:* ${economy.bank}/${economy.bankCapacity}`;

            await sock.sendMessage(chatId, { 
                text: responseText,
                mentions: [senderId]
            });

        } catch (error) {
            console.error('Error en el comando de depósito:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al procesar tu depósito.' });
        }
    }
};

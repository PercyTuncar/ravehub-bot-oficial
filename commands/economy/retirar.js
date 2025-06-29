const { findOrCreateUser } = require('../../utils/userUtils');

module.exports = {
    name: 'retirar',
    description: 'Retira 💵 del banco.',
    aliases: ['withdraw'],
    usage: '.retirar <cantidad|all>',
    category: 'economy',
    async execute(sock, message, args) {
        const jid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            const user = await findOrCreateUser(jid, message.pushName);

            if (args.length === 0) {
                return sock.sendMessage(chatId, { text: `❌ Debes especificar la cantidad a retirar. Uso: \`.retirar <cantidad|all>\`` });
            }

            const amountToWithdrawStr = args[0].toLowerCase();
            let amountToWithdraw;

            if (user.economy.bank <= 0) {
                return sock.sendMessage(chatId, { text: `🏦 No tienes dinero en tu banco para retirar.` });
            }

            if (amountToWithdrawStr === 'all') {
                amountToWithdraw = user.economy.bank;
            } else {
                amountToWithdraw = parseInt(amountToWithdrawStr, 10);
                if (isNaN(amountToWithdraw) || amountToWithdraw <= 0) {
                    return sock.sendMessage(chatId, { text: '❌ Por favor, introduce un número válido para retirar.' });
                }
                if (amountToWithdraw > user.economy.bank) {
                    return sock.sendMessage(chatId, { text: `🏦 No tienes suficiente dinero en el banco. Solo puedes retirar hasta ${user.economy.bank} 💵.` });
                }
            }

            user.economy.bank -= amountToWithdraw;
            user.economy.wallet += amountToWithdraw;

            await user.save();

            const successMessage = `✅ Has retirado *${amountToWithdraw} 💵* de tu banco.\n\n*Cartera:* ${user.economy.wallet} 💵\n*Banco:* ${user.economy.bank} 💵`;
            await sock.sendMessage(chatId, { text: successMessage });

        } catch (error) {
            console.error('Error en el comando retirar:', error);
            await sock.sendMessage(chatId, { text: '⚙️ Ocurrió un error al procesar tu retiro.' });
        }
    }
};


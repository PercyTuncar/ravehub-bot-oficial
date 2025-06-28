const Economy = require('../../models/Economy');
const mongoose = require('mongoose');

module.exports = {
    name: 'transfer',
    description: 'Transfiere dinero a otro usuario.',
    category: 'economy',
    async execute(message, args) {
        const userId = message.key.remoteJid;
        const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const amount = parseInt(args[1]);

        if (!mentionedJid || !amount || isNaN(amount) || amount <= 0) {
            return this.sock.sendMessage(userId, { text: 'Uso: .transfer @usuario <cantidad>' });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const sender = await Economy.findOne({ userId }).session(session);
            const receiver = await Economy.findOne({ userId: mentionedJid }).session(session);

            if (!sender || !receiver) {
                await session.abortTransaction();
                session.endSession();
                return this.sock.sendMessage(userId, { text: 'No se pudo encontrar a uno de los usuarios.' });
            }

            if (sender.wallet < amount) {
                await session.abortTransaction();
                session.endSession();
                return this.sock.sendMessage(userId, { text: 'No tienes suficiente dinero en tu cartera.' });
            }

            sender.wallet -= amount;
            receiver.wallet += amount;

            await sender.save({ session });
            await receiver.save({ session });

            await session.commitTransaction();
            session.endSession();

            this.sock.sendMessage(userId, { text: `Transferiste ${amount} a ${receiver.name}!` });

        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error('Error al transferir:', error);
            this.sock.sendMessage(userId, { text: 'Ocurrió un error al realizar la transferencia.' });
        }
    }
};

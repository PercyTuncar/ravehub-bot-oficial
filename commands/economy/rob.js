
const Economy = require('../../models/Economy');
const mongoose = require('mongoose');

module.exports = {
    name: 'rob',
    description: 'Roba dinero a otro usuario.',
    category: 'economy',
    async execute(message, args) {
        const userId = message.key.remoteJid;
        const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        if (!mentionedJid) {
            return sock.sendMessage(userId, { text: 'Debes mencionar a un usuario para robarle.' });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const robber = await Economy.findOne({ userId }).session(session);
            const victim = await Economy.findOne({ userId: mentionedJid }).session(session);

            if (!robber || !victim) {
                await session.abortTransaction();
                session.endSession();
                return sock.sendMessage(userId, { text: 'No se pudo encontrar a uno de los usuarios.' });
            }

            const now = new Date();
            const cooldown = 30 * 60 * 1000; // 30 minutos
            if (robber.lastRob && now - robber.lastRob < cooldown) {
                await session.abortTransaction();
                session.endSession();
                const timeLeft = Math.ceil((cooldown - (now - robber.lastRob)) / 60000);
                return sock.sendMessage(userId, { text: `Debes esperar ${timeLeft} minutos para volver a robar.` });
            }

            if (victim.wallet <= 0) {
                await session.abortTransaction();
                session.endSession();
                return sock.sendMessage(userId, { text: 'El usuario no tiene dinero en su cartera.' });
            }

            const amount = Math.floor(Math.random() * victim.wallet);
            robber.wallet += amount;
            victim.wallet -= amount;
            robber.lastRob = now;

            await robber.save({ session });
            await victim.save({ session });

            await session.commitTransaction();
            session.endSession();

            sock.sendMessage(userId, { text: `Robaste ${amount} a ${victim.name}!` });

        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error('Error al robar:', error);
            sock.sendMessage(userId, { text: 'Ocurrió un error al intentar robar.' });
        }
    }
};

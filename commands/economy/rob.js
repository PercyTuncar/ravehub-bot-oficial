const { findOrCreateUser } = require('../../utils/userUtils');
const User = require('../../models/User');
const { getCurrency } = require('../../utils/groupUtils');
const { getSocket } = require('../../bot');

const COOLDOWN_MINUTES = 5;

module.exports = {
    name: 'rob',
    description: 'Robar a un usuario.',
    aliases: ['robar'],
    usage: '.rob @usuario',
    category: 'economy',
    async execute(message, args, commands) {
        const sock = bot.getSocket();
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

        const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        if (!mentionedJid) {
            return sock.sendMessage(chatId, { text: '❌ Debes mencionar a un usuario para robarle. Ejemplo: `.rob @usuario`' });
        }

        if (senderJid === mentionedJid) {
            return sock.sendMessage(chatId, { text: '🤦‍♂️ No puedes robarte a ti mismo.' });
        }

        try {
            const sender = await findOrCreateUser(senderJid, chatId, message.pushName);
            const target = await findOrCreateUser(mentionedJid, chatId);

            if (sender.judicialDebt > 0) {
                return sock.sendMessage(chatId, { text: `⚖️ Tienes una deuda judicial pendiente de *${currency} ${sender.judicialDebt.toLocaleString()}*. No puedes robar hasta que la saldes.`, mentions: [senderJid] });
            }

            if (sender.cooldowns.rob && sender.cooldowns.rob > new Date()) {
                const timeLeft = (sender.cooldowns.rob.getTime() - new Date().getTime());
                const minutes = Math.floor(timeLeft / 60000);
                const seconds = Math.floor((timeLeft % 60000) / 1000);
                return sock.sendMessage(chatId, { text: `⏳ @${senderJid.split('@')[0]}, debes esperar *${minutes}m y ${seconds}s* para volver a intentar un robo.`, mentions: [senderJid] });
            }

            if (target.economy.wallet <= 0) {
                return sock.sendMessage(chatId, { text: `💸 @${target.name} no tiene dinero en su cartera. ¡No hay nada que robar!`, mentions: [mentionedJid] });
            }

            const successChance = Math.random();
            const newCooldown = new Date(new Date().getTime() + COOLDOWN_MINUTES * 60 * 1000);

            if (successChance > 0.35) { // 65% de Éxito
                const amountToSteal = Math.floor(target.economy.wallet * (Math.random() * 0.70 + 0.25));
                
                const ops = [
                    { updateOne: { filter: { _id: sender._id }, update: { $inc: { 'economy.wallet': amountToSteal }, $set: { 'cooldowns.rob': newCooldown } } } },
                    { updateOne: { filter: { _id: target._id, 'economy.wallet': { $gte: amountToSteal } }, update: { $inc: { 'economy.wallet': -amountToSteal } } } }
                ];

                const result = await User.bulkWrite(ops);

                if (result.modifiedCount < 2) {
                    await User.findByIdAndUpdate(sender._id, { $set: { 'cooldowns.rob': newCooldown } });
                    return sock.sendMessage(chatId, { text: `💨 @${target.name} fue más rápido y protegió su dinero. ¡No pudiste robar nada!`, mentions: [senderJid, mentionedJid] });
                }

                const updatedSender = await User.findById(sender._id);
                const successMessage = `*💰 ¡GOLPE MAESTRO! 💰*\n\nCon sigilo y audacia, has vaciado los bolsillos de @${target.name}, llevándote *${currency}${amountToSteal.toLocaleString()}*.\n\n*Tu cartera ahora tiene:* ${currency}${updatedSender.economy.wallet.toLocaleString()}`;
                await sock.sendMessage(chatId, { text: successMessage, mentions: [senderJid, mentionedJid] });

            } else { // 35% de Fracaso
                const maxFine = sender.level * 1000;
                const minFine = 300;
                const failureFine = Math.floor(Math.random() * (maxFine - minFine + 1)) + minFine;

                const updatedSender = await User.findOneAndUpdate(
                    { _id: sender._id },
                    { $inc: { 'economy.wallet': -failureFine }, $set: { 'cooldowns.rob': newCooldown } },
                    { new: true }
                );

                const fineMsg = `🚨 ¡Fuiste atrapado intentando robar! Se aplicó una multa de *${currency} ${failureFine.toLocaleString()}*.\n*Tu cartera ahora tiene:* ${currency}${updatedSender.economy.wallet.toLocaleString()}`;
                await sock.sendMessage(chatId, { text: fineMsg, mentions: [senderJid] });
            }

        } catch (error) {
            console.error('Error en el comando de robo:', error);
            await sock.sendMessage(chatId, { text: '⚙️ Ocurrió un error inesperado durante el robo.' });
        }
    }
};
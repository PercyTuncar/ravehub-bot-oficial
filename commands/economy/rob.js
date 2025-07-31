const { findOrCreateUser } = require('../../utils/userUtils');
const User = require('../../models/User');
const { getCurrency } = require('../../utils/groupUtils');

const COOLDOWN_MINUTES = 5;

module.exports = {
    name: 'rob',
    description: 'Intenta robar a otro usuario.',
    aliases: ['robar'],
    usage: '.rob @usuario',
    category: 'economy',
    async execute(message, args, client) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        
        const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        if (!mentionedJid) {
            return client.sendMessage(chatId, { text: '❌ Debes mencionar a un usuario para robarle. Ejemplo: `.rob @usuario`' });
        }

        if (senderJid === mentionedJid) {
            return client.sendMessage(chatId, { text: '🤦‍♂️ No puedes robarte a ti mismo.' });
        }

        try {
            const currency = await getCurrency(chatId);
            const robber = await findOrCreateUser(senderJid, chatId, message.pushName);
            const victim = await findOrCreateUser(mentionedJid, chatId);

            // 1. Validaciones Previas
            if (robber.cooldowns.rob && robber.cooldowns.rob > new Date()) {
                const timeLeft = (robber.cooldowns.rob.getTime() - new Date().getTime());
                const minutes = Math.floor(timeLeft / 60000);
                const seconds = Math.floor((timeLeft % 60000) / 1000);
                return client.sendMessage(chatId, { text: `⏳ @${senderJid.split('@')[0]}, debes esperar *${minutes}m y ${seconds}s* para volver a robar.`, mentions: [senderJid] });
            }

            if (victim.economy.wallet < 100) {
                return client.sendMessage(chatId, { text: `💸 @${victim.name.split(' ')[0]} tiene muy poco dinero en su cartera. No vale la pena el riesgo.`, mentions: [senderJid, mentionedJid] });
            }
            
            if (robber.economy.wallet < 100) {
                return client.sendMessage(chatId, { text: `🤔 @${senderJid.split('@')[0]}, necesitas al menos *${currency} 100* en tu cartera para intentar un robo.`, mentions: [senderJid] });
            }

            // 2. Lógica del Robo
            const newCooldown = new Date(new Date().getTime() + COOLDOWN_MINUTES * 60 * 1000);
            const successChance = 0.5 + (robber.level - victim.level) * 0.05; // 50% base + 5% por cada nivel de diferencia
            const clampedSuccessChance = Math.max(0.1, Math.min(successChance, 0.9)); // Limitar entre 10% y 90%

            if (Math.random() < clampedSuccessChance) {
                // ÉXITO
                const amountStolen = Math.floor(victim.economy.wallet * (Math.random() * 0.4 + 0.1)); // Robar entre 10% y 50%

                await User.bulkWrite([
                    {
                        updateOne: {
                            filter: { _id: robber._id },
                            update: { 
                                $inc: { 'economy.wallet': amountStolen },
                                $set: { 'cooldowns.rob': newCooldown }
                            }
                        }
                    },
                    {
                        updateOne: {
                            filter: { _id: victim._id },
                            update: { $inc: { 'economy.wallet': -amountStolen } }
                        }
                    }
                ]);

                const successMessage = `*💰 ¡GOLPE MAESTRO! 💰*\n\nCon sigilo y audacia, @${senderJid.split('@')[0]} ha vaciado los bolsillos de @${victim.name.split(' ')[0]}, llevándose *${currency}${amountStolen.toLocaleString()}*.`;
                await client.sendMessage(chatId, { text: successMessage, mentions: [senderJid, mentionedJid] });

            } else {
                // FRACASO
                const fine = Math.floor(robber.economy.wallet * (Math.random() * 0.2 + 0.05)); // Multa del 5% al 25% de la cartera del ladrón

                await User.findByIdAndUpdate(robber._id, {
                    $inc: { 'economy.wallet': -fine },
                    $set: { 'cooldowns.rob': newCooldown }
                });

                const fineMsg = `*🚨 ¡MANOS ARRIBA! 🚨*\n\n@${senderJid.split('@')[0]} fue atrapado intentando robar a @${victim.name.split(' ')[0]}. Como castigo, se le aplicó una multa de *${currency}${fine.toLocaleString()}*.`;
                await client.sendMessage(chatId, { text: fineMsg, mentions: [senderJid, mentionedJid] });
            }

        } catch (error) {
            console.error('Error en el comando de robo:', error);
            await client.sendMessage(chatId, { text: '⚙️ Ocurrió un error inesperado durante el robo.' });
        }
    }
};
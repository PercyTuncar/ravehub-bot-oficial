const { findOrCreateUser } = require('../../utils/userUtils');
const { handleDebtPayment } = require('../../utils/debtManager');
const User = require('../../models/User');
const { getCurrency } = require('../../utils/groupUtils');

const COOLDOWN_MINUTES = 15; // Cooldown aumentado

module.exports = {
    name: 'rob',
    description: 'Robar a un usuario.',
    aliases: ['robar'],
    usage: '.rob @usuario',
    category: 'economy',
    async execute(sock, message, args) {
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
            // Usar findOrCreateUser para ambos usuarios
            const sender = await findOrCreateUser(senderJid, chatId, message.pushName);
            let target = await findOrCreateUser(mentionedJid, chatId); // Usamos let para poder reasignar

            // Forzar la recarga de los datos del objetivo desde la base de datos para asegurar consistencia
            target = await User.findOne({ jid: mentionedJid, groupId: chatId });

            if (!target) { // Aunque findOrCreateUser debería crearlo, es una doble verificación.
                 return sock.sendMessage(chatId, { text: '❌ No se pudo encontrar o crear al usuario objetivo.' });
            }

            if (sender.judicialDebt > 0) {
                return sock.sendMessage(chatId, { text: `⚖️ Tienes una deuda judicial pendiente de *${currency} ${sender.judicialDebt.toLocaleString()}*. No puedes robar hasta que la saldes.`, mentions: [senderJid] });
            }

            // --- Verificación de Cooldown ---
            if (sender.cooldowns.rob && sender.cooldowns.rob > new Date()) {
                const now = new Date();
                const timeLeft = sender.cooldowns.rob.getTime() - now.getTime();
                const minutes = Math.floor(timeLeft / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                return sock.sendMessage(chatId, { text: `⏳ Debes esperar *${minutes}m y ${seconds}s* para volver a intentar un robo.`, mentions: [senderJid] });
            }

            // --- Verificación de Deuda Límite ---
            const totalWealth = sender.economy.wallet + sender.economy.bank;
            if (totalWealth <= -200) {
                return sock.sendMessage(chatId, { text: `🚨 *¡ALERTA DE DELITO GRAVE!* 🚨\n\n@${senderJid.split('@')[0]}, has alcanzado una deuda crítica de *${currency} ${totalWealth.toLocaleString()}*.\n\nCualquier intento adicional de actividad ilícita podría resultar en tu **expulsión inmediata** del grupo. Te recomendamos saldar tus deudas.`,
                    mentions: [senderJid]
                });
            }

            if (target.economy.wallet <= 0) {
                return sock.sendMessage(chatId, { text: `💸 @${target.name} no tiene dinero en su cartera. ¡No hay nada que robar!`, mentions: [mentionedJid] });
            }

            // Establecer cooldown inmediatamente
            sender.cooldowns.rob = new Date(new Date().getTime() + COOLDOWN_MINUTES * 60 * 1000);

            // Nueva lógica de robo: 65% de éxito, más arriesgado y con mayor recompensa/castigo.
            const successChance = Math.random();

            // --- Multa dinámica por nivel ---
            const maxLevel = 10;
            const senderLevel = Math.max(1, Math.min(sender.level, maxLevel));
            const maxFine = senderLevel * 1000; // Nivel 1: 1000, Nivel 2: 2000, ..., Nivel 10: 10000
            const minFine = 300;
            const FAILURE_FINE = Math.floor(Math.random() * (maxFine - minFine + 1)) + minFine;

            if (successChance > 0.35) { // 65% de Éxito
                // Robar entre 25% y 95% de la cartera de la víctima
                const amountToSteal = Math.floor(target.economy.wallet * (Math.random() * 0.70 + 0.25));
                target.economy.wallet -= amountToSteal;

                let finalDebtMessage = '';
                let finalLevelChangeMessage = '';
                let netGain = amountToSteal;

                // --- LÓGICA DE DEUDA JUDICIAL PARA EL LADRÓN ---
                if (sender.judicialDebt > 0) {
                    const { remainingAmount, debtMessage, levelChangeMessage } = handleDebtPayment(sender, amountToSteal);
                    netGain = remainingAmount;
                    finalDebtMessage = debtMessage.replace('¡Deuda Cobrada!', '¡Botín Embargado!').replace('Se interceptaron', 'Se usaron');
                    finalLevelChangeMessage = levelChangeMessage;
                }

                sender.economy.wallet += netGain;

                await sender.save();
                await target.save();

                if (finalDebtMessage) {
                    await sock.sendMessage(chatId, { text: finalDebtMessage, mentions: [senderJid] });
                    if (finalLevelChangeMessage) {
                        await sock.sendMessage(chatId, { text: finalLevelChangeMessage, mentions: [senderJid] });
                    }
                }

                const successMessage = `*💰 ¡GOLPE MAESTRO! 💰*\n\nCon sigilo y audacia, has vaciado los bolsillos de @${target.name}, llevándote *${currency}${amountToSteal}*.` +
                    `\n\n*Ganancia neta (después de deudas):* +${currency}${netGain}\n*Tu cartera ahora tiene:* ${currency}${sender.economy.wallet}`;
                await sock.sendMessage(chatId, { text: successMessage, mentions: [senderJid, mentionedJid] });

            } else { // 35% de Fracaso
                // Multa por fallar el robo
                let fine = FAILURE_FINE;
                let fineMsg = '';
                if (sender.economy.bank >= fine) {
                    sender.economy.bank -= fine;
                    console.log(`[JUDICIAL] Multa cobrada automáticamente de banco a ${sender.jid} (${sender.name}) en grupo ${chatId}: ${fine}`);
                    fineMsg = `🚨 ¡Fuiste atrapado intentando robar! Se aplicó una multa de *${currency} ${fine.toLocaleString()}* y se descontó de tu banco.`;
                } else {
                    // No tiene fondos suficientes en el banco: registrar deuda judicial pendiente
                    const deudaPendiente = fine - sender.economy.bank;
                    if(sender.economy.bank > 0) {
                        console.log(`[JUDICIAL] Multa parcial cobrada de banco a ${sender.jid} (${sender.name}) en grupo ${chatId}: ${sender.economy.bank}`);
                    }
                    sender.economy.bank = 0;
                    sender.judicialDebt = (sender.judicialDebt || 0) + deudaPendiente;
                    console.log(`[JUDICIAL] Nueva deuda judicial registrada para ${sender.jid} (${sender.name}) en grupo ${chatId}: ${deudaPendiente}`);
                    fineMsg = `🚨 ¡Fuiste atrapado intentando robar! Se aplicó una multa de *${currency} ${fine.toLocaleString()}*.
⚖️ No tenías fondos suficientes en el banco para pagar la multa. Se ha registrado una deuda judicial pendiente de *${currency} ${deudaPendiente.toLocaleString()}* que será cobrada automáticamente cuando deposites en el banco.\n\nSaldo de banco: 0. Deuda judicial pendiente: *${currency} ${sender.judicialDebt.toLocaleString()}*.`;
                }
                await sender.save();
                await sock.sendMessage(chatId, { text: fineMsg, mentions: [senderJid] });
                await target.save();
                return;
            }

        } catch (error) {
            console.error('Error en el comando de robo:', error);
            await sock.sendMessage(chatId, { text: '⚙️ Ocurrió un error inesperado durante el robo.' });
        }
    }
};

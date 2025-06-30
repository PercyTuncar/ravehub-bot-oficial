const { findOrCreateUser } = require('../../utils/userUtils');
const { handleDebtPayment } = require('../../utils/debtManager');
const User = require('../../models/User');
const { getCurrency } = require('../../utils/groupUtils');

const COOLDOWN_MINUTES = 15; // Cooldown aumentado
const FAILURE_FINE = 500; // Multa drásticamente aumentada por fallar el robo

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
            const sender = await findOrCreateUser(senderJid, message.pushName);
            let target = await findOrCreateUser(mentionedJid); // Usamos let para poder reasignar

            // Forzar la recarga de los datos del objetivo desde la base de datos para asegurar consistencia
            target = await User.findOne({ jid: mentionedJid });

            if (!target) { // Aunque findOrCreateUser debería crearlo, es una doble verificación.
                 return sock.sendMessage(chatId, { text: '❌ No se pudo encontrar o crear al usuario objetivo.' });
            }

            if (sender.judicialDebt > 0) {
                return sock.sendMessage(chatId, { text: `⚖️ Tienes una deuda judicial pendiente de *${currency} ${sender.judicialDebt.toLocaleString()}*. No puedes robar hasta que la saldes.` });
            }

            // --- Verificación de Cooldown ---
            if (sender.cooldowns.rob && sender.cooldowns.rob > new Date()) {
                const now = new Date();
                const timeLeft = sender.cooldowns.rob.getTime() - now.getTime();
                const minutes = Math.floor(timeLeft / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                return sock.sendMessage(chatId, { text: `⏳ Debes esperar *${minutes}m y ${seconds}s* para volver a intentar un robo.` });
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

                const successMessage = `*💰 ¡GOLPE MAESTRO! 💰*\n\nCon sigilo y audacia, has vaciado los bolsillos de @${target.name}, llevándote *${currency}${amountToSteal}*.\n\n*Ganancia neta (después de deudas):* +${currency}${netGain}\n*Tu cartera ahora tiene:* ${currency}${sender.economy.wallet}`;
                await sock.sendMessage(chatId, { text: successMessage, mentions: [senderJid, mentionedJid] });

            } else { // 35% de Fracaso
                // Multa por fallar el robo
                let fine = FAILURE_FINE;
                let fineMsg = '';
                if (sender.economy.bank >= fine) {
                    sender.economy.bank -= fine;
                    fineMsg = `🚨 ¡Has sido multado por fallar el robo! Se descontaron *${currency} ${FAILURE_FINE.toLocaleString()}* de tu banco.`;
                } else {
                    // No tiene fondos suficientes en el banco: registrar deuda judicial pendiente
                    const deudaPendiente = fine - sender.economy.bank;
                    sender.economy.bank = 0;
                    sender.judicialDebt = (sender.judicialDebt || 0) + deudaPendiente;
                    fineMsg = `⚖️ No tenías fondos suficientes en el banco para pagar la multa. Se ha registrado una deuda judicial pendiente de *${currency} ${deudaPendiente.toLocaleString()}* que será cobrada automáticamente cuando deposites en el banco.`;
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

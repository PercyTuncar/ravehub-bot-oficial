const { findOrCreateUser } = require('../../utils/userUtils');
const { handleDebtPayment } = require('../../utils/debtManager');

const COOLDOWN_MINUTES = 10;
const FAILURE_FINE = 150; // Multa fija por fallar el robo

module.exports = {
    name: 'rob',
    description: 'Intenta robar dinero de la cartera de otro usuario. ¡Alto riesgo, alta recompensa!',
    usage: '.rob @usuario',
    category: 'economy',
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

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
            const target = await findOrCreateUser(mentionedJid);

            if (!target) { // Aunque findOrCreateUser debería crearlo, es una doble verificación.
                 return sock.sendMessage(chatId, { text: '❌ No se pudo encontrar o crear al usuario objetivo.' });
            }

            if (sender.judicialDebt > 0) {
                return sock.sendMessage(chatId, { text: `⚖️ Tienes una deuda judicial pendiente de *${sender.judicialDebt} 💵*. No puedes robar hasta que la saldes.` });
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
                return sock.sendMessage(chatId, { text: `🚨 *¡ALERTA DE DELITO GRAVE!* 🚨

@${senderJid.split('@')[0]}, has alcanzado una deuda crítica de *${totalWealth} 💵*.

Cualquier intento adicional de actividad ilícita podría resultar en tu **expulsión inmediata** del grupo. Te recomendamos saldar tus deudas.`,
                    mentions: [senderJid]
                });
            }

            if (target.economy.wallet <= 0) {
                return sock.sendMessage(chatId, { text: `💸 @${target.name} no tiene dinero en su cartera. ¡No hay nada que robar!`, mentions: [mentionedJid] });
            }

            // Establecer cooldown inmediatamente
            sender.cooldowns.rob = new Date(new Date().getTime() + COOLDOWN_MINUTES * 60 * 1000);

            // Nueva lógica de robo: 90% de éxito si la víctima tiene dinero, 10% de fallo.
            const successChance = Math.random();

            if (successChance > 0.10) { // 90% de Éxito
                const amountToSteal = Math.floor(target.economy.wallet * (Math.random() * 0.35 + 0.10)); // Robar entre 10% y 45%
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

                const successMessage = `*💰 ¡ROBO EXITOSO! 💰*

Le has robado *${amountToSteal} 💵* a @${target.name}.

*Ganancia neta (después de deudas):* +${netGain} 💵
*Tu cartera ahora tiene:* ${sender.economy.wallet} 💵`;
                await sock.sendMessage(chatId, { text: successMessage, mentions: [senderJid, mentionedJid] });

            } else { // 10% de Fallo
                sender.judicialDebt += FAILURE_FINE;
                await sender.save();

                const failureMessage = `*👮‍♂️ ¡QUÉ TORPE! 👮‍♂️*

Fallaste el robo y fuiste atrapado. Ahora tienes una nueva deuda con la justicia.

*Multa añadida a tu deuda:* +${FAILURE_FINE} 💵
*Deuda judicial total:* ${sender.judicialDebt} 💵`;
                return sock.sendMessage(chatId, { text: failureMessage, mentions: [senderJid, mentionedJid] });
            }

        } catch (error) {
            console.error('Error en el comando de robo:', error);
            await sock.sendMessage(chatId, { text: '⚙️ Ocurrió un error inesperado durante el robo.' });
        }
    }
};

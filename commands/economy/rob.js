const User = require('../../models/User');
const { handleDebtPayment } = require('../../utils/debtManager');

const COOLDOWN_MINUTES = 10;

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
            let sender = await User.findOne({ jid: senderJid });
            if (!sender) {
                sender = new User({ jid: senderJid, name: message.pushName || senderJid.split('@')[0] });
                await sender.save();
            }

            // --- Verificación de Cooldown ---
            if (sender.robCooldownEnds && sender.robCooldownEnds > new Date()) {
                const now = new Date();
                const timeLeft = sender.robCooldownEnds.getTime() - now.getTime();
                const minutes = Math.floor(timeLeft / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                return sock.sendMessage(chatId, { text: `⏳ Debes esperar *${minutes}m y ${seconds}s* para volver a intentar un robo.` });
            }

            // --- Verificación de Deuda Límite ---
            const totalWealth = sender.economy.wallet + sender.economy.bank;
            if (totalWealth <= -200) {
                return sock.sendMessage(chatId, { text: `🚨 *¡ALERTA DE DELITO GRAVE!* 🚨\n\n@${senderJid.split('@')[0]}, has alcanzado una deuda crítica de *${totalWealth} 💵*.\n\nCualquier intento adicional de actividad ilícita podría resultar en tu **expulsión inmediata** del grupo. Te recomendamos saldar tus deudas.`,
                    mentions: [senderJid]
                });
            }

            let target = await User.findOne({ jid: mentionedJid });
            if (!target) {
                // Si el objetivo no existe, se crea uno nuevo con un nombre por defecto.
                const targetName = mentionedJid.split('@')[0];
                target = new User({ jid: mentionedJid, name: targetName });
                await target.save();
            }

            if (target.economy.wallet <= 0) {
                return sock.sendMessage(chatId, { text: `💸 @${mentionedJid.split('@')[0]} no tiene dinero en su cartera. ¡No hay nada que robar!`, mentions: [mentionedJid] });
            }

            sender.robCooldownEnds = new Date(new Date().getTime() + COOLDOWN_MINUTES * 60 * 1000);
            const robChance = Math.random();

            if (robChance < 0.6) { // Fallo
                const failureType = Math.random();
                let fine;
                let failureMessage;

                if (failureType < 0.1) { // 10% de Bancarrota Total
                    failureMessage = `*☠️ ¡BANCARROTA TOTAL! ☠️*\n\nTu intento de robo fue tan desastroso que alertó a las autoridades fiscales. Te han embargado **TODO**.\n\n*Resultado:*\n- Cartera: 0 💵\n- Banco: 0 💵`;
                    sender.economy.wallet = 0;
                    sender.economy.bank = 0;
                    sender.judicialDebt = 0; // Limpiar deudas previas en bancarrota
                } else if (failureType < 0.4) { // 30% de Multa Grave
                    fine = Math.max(75, Math.floor(totalWealth * 0.35));
                    sender.judicialDebt += fine;
                    failureMessage = `*👮‍♂️ ¡ATRAPADO CON LAS MANOS EN LA MASA! 👮‍♂️*\n\nLa policía te capturó. Has acumulado una deuda judicial por tu crimen.\n\n*Multa añadida a tu deuda:* +${fine} 💵\n*Deuda judicial total:* ${sender.judicialDebt} 💵`;
                } else { // 60% de Multa Leve
                    fine = 55;
                    sender.judicialDebt += fine;
                    failureMessage = `*🤡 ¡QUÉ TORPE! 🤡*\n\nFallaste el robo y ahora tienes una deuda con la justicia.\n\n*Multa añadida a tu deuda:* +${fine} 💵\n*Deuda judicial total:* ${sender.judicialDebt} 💵`;
                }

                await sender.save();
                return sock.sendMessage(chatId, { text: failureMessage, mentions: [senderJid, mentionedJid] });

            } else { // Éxito
                const amountToSteal = Math.floor(target.economy.wallet * (Math.random() * 0.25 + 0.05)); // Robar entre 5% y 30%
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

                const successMessage = `*💰 ¡ROBO EXITOSO! 💰*\n\nHas robado *${amountToSteal} 💵* a @${mentionedJid.split('@')[0]}.\n\n*Ganancia neta (después de deudas):* +${netGain} 💵\n*Tu cartera ahora tiene:* ${sender.economy.wallet} 💵`;
                await sock.sendMessage(chatId, { text: successMessage, mentions: [senderJid, mentionedJid] });
            }

        } catch (error) {
            console.error('Error en el comando de robo:', error);
            await sock.sendMessage(chatId, { text: '⚙️ Ocurrió un error inesperado durante el robo.' });
        }
    }
};

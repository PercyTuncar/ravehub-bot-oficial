const User = require('../../models/User');
const { findOrCreateUser } = require('../../utils/userUtils');
const { MIN_BET, MAX_BET, SLOT_IMAGE_URL } = require('../../games/slot/constants');
const { playSlot, getInfoText } = require('../../games/slot/index');
const { getCurrency } = require('../../utils/groupUtils');

const COOLDOWN_SECONDS = 10;

module.exports = {
    name: 'slot',
    aliases: ['tragamonedas'],
    category: 'games',
    description: 'Juega al tragamonedas con una apuesta.',
    async execute(message, args, client) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const currency = await getCurrency(chatId);

        if (args[0]?.toLowerCase() === 'info') {
            const infoText = getInfoText(currency);
            return client.sendMessage(chatId, { text: infoText });
        }

        try {
            const user = await findOrCreateUser(senderJid, chatId, message.pushName);

            // 1. Validar Cooldown
            if (user.cooldowns.slot) {
                const diff = (Date.now() - user.cooldowns.slot.getTime()) / 1000;
                if (diff < COOLDOWN_SECONDS) {
                    const timeLeft = Math.ceil(COOLDOWN_SECONDS - diff);
                    return client.sendMessage(chatId, { text: `⏳ Espera ${timeLeft} segundos para volver a jugar.` });
                }
            }

            // 2. Validar Apuesta
            let betAmount = parseInt(args[0]);
            if (isNaN(betAmount)) betAmount = MIN_BET;
            if (betAmount < MIN_BET) return client.sendMessage(chatId, { text: `La apuesta mínima es ${currency} ${MIN_BET}.` });
            if (betAmount > MAX_BET) return client.sendMessage(chatId, { text: `La apuesta máxima es ${currency} ${MAX_BET}.` });
            if (user.economy.wallet < betAmount) {
                return client.sendMessage(chatId, { text: `💸 No tienes suficiente dinero. Tu saldo es ${currency} ${user.economy.wallet.toLocaleString()}.` });
            }

            // 3. Iniciar el juego y enviar mensaje de "Girando"
            await client.sendMessage(chatId, {
                video: { url: SLOT_IMAGE_URL },
                gifPlayback: true,
                caption: `🎰 *¡Tragamonedas activada para @${senderJid.split('@')[0]}!*\n*Apuesta:* ${currency} ${betAmount.toLocaleString()}\n\n*🔄 Girando...*`,
                mentions: [senderJid]
            });

            // 4. Ejecutar la lógica del juego
            const result = playSlot(betAmount);
            const { isWin, winnings, reels, winSymbol, winCount } = result;
            
            // 5. Calcular el cambio neto y actualizar la base de datos atómicamente
            const netChange = isWin ? winnings - betAmount : -betAmount;
            const newCooldown = new Date();

            const updatedUser = await User.findByIdAndUpdate(user._id, {
                $inc: { 'economy.wallet': netChange },
                $set: { 'cooldowns.slot': newCooldown }
            }, { new: true });

            // 6. Construir y enviar el mensaje de resultado
            const reelsText = `| ${reels[0].emoji} | ${reels[1].emoji} | ${reels[2].emoji} |`;
            let resultText = '';

            if (isWin) {
                if (winSymbol.emoji === '🎰' && winCount === 3) {
                    resultText = `🚨 *¡¡¡JACKPOT!!!* 🚨\n\n*Resultado:* ¡TRIPLE ${winSymbol.emoji}!\n*Ganaste:* ${currency} ${winnings.toLocaleString()}`;
                } else {
                    resultText = `🎉 *¡GANASTE!* 🎉\n\n*Resultado:* ${winCount === 3 ? 'TRIPLE' : 'DOBLE'} ${winSymbol.name.toUpperCase()}!\n*Ganaste:* ${currency} ${winnings.toLocaleString()}`;
                }
            } else {
                resultText = `😔 *¡No hubo suerte!* 😔\n\n*Perdiste:* ${currency} ${betAmount.toLocaleString()}`;
            }

            const finalMessage = `${reelsText}\n\n${resultText}\n\n*Tu nuevo saldo es:* ${currency} ${updatedUser.economy.wallet.toLocaleString()}`;
            
            // Pequeña pausa para dar emoción
            setTimeout(() => {
                client.sendMessage(chatId, { text: finalMessage, mentions: [senderJid] });
            }, 1500);

        } catch (error) {
            console.error("Error en el comando slot:", error);
            client.sendMessage(chatId, { text: '🤖 Ocurrió un error inesperado. Por favor, inténtalo de nuevo.' });
        }
    }
};
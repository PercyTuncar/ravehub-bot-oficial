const challengeHandler = require('../../handlers/challengeHandler');
const siluetas = require('../../games/silueta/siluetas.json');
const { getGroupSettings } = require('../../utils/groupUtils');
const { findOrCreateUser } = require('../../utils/userUtils');

const BET_AMOUNT = 1000;

module.exports = {
    name: 'silueta',
    description: 'Adivina el DJ a partir de su silueta.',
    aliases: ['silhouette', 'djguess'],
    category: 'games',
    cooldown: 10, // Reducir el cooldown para más dinamismo
    async execute(message, args, client) {
        const chatId = message.key.remoteJid;
        const senderJid = message.key.participant || message.key.remoteJid;

        if (challengeHandler.isChallengeActive(chatId)) {
            return client.sendMessage(chatId, { text: 'Ya hay un desafío de silueta en curso en este chat. ¡Intenta adivinar!' });
        }

        const groupSettings = await getGroupSettings(chatId);
        const currency = groupSettings?.currency || '🪙';

        const user = await findOrCreateUser(senderJid, chatId, message.pushName);

        if (user.economy.wallet < BET_AMOUNT) {
            return client.sendMessage(chatId, { 
                text: `❌ @${senderJid.split('@')[0]}, necesitas al menos ${currency} ${BET_AMOUNT} en tu cartera para jugar a la silueta.`,
                mentions: [senderJid]
            });
        }

        // Retener la apuesta inicial
        user.economy.wallet -= BET_AMOUNT;
        await user.save();

        if (!siluetas || siluetas.length === 0) {
            return client.sendMessage(chatId, { text: 'No hay DJs cargados para el juego de la silueta. El administrador debe configurar el archivo `siluetas.json`.' });
        }
        
        const rand = Math.floor(Math.random() * siluetas.length);
        const dj = siluetas[rand];

        if (!dj || !dj.name || !dj.silhouetteUrl || !dj.imageUrl) {
             return client.sendMessage(chatId, { text: 'El DJ seleccionado no tiene toda la información necesaria. Por favor, avisa a un administrador.' });
        }

        // Iniciar el desafío a través del handler, pasando la divisa y el monto de la apuesta
        const challenge = challengeHandler.startSilhouetteChallenge(client, chatId, dj, currency, BET_AMOUNT);
        
        try {
            const caption = `🔥 *¡Nuevo Desafío de la Silueta!* 🔥\n\n¿Quién es este DJ? Adivina y gana el premio. ¡Cualquier mensaje que no sea un comando contará como tu respuesta!\n\n💰 *Apuesta inicial:* ${currency} ${BET_AMOUNT}\n🏆 *Premio potencial:* ${currency} ${challenge.prize}\n\nEscribe el nombre del DJ para adivinar.`
            const sentMessage = await client.sendMessage(chatId, { 
                image: { url: dj.silhouetteUrl },
                caption: caption 
            });
            // Asociar la clave del mensaje con el desafío
            challenge.messageKey = sentMessage.key;

        } catch (error) {
            console.error("Error al enviar la imagen de la silueta:", error);
            await client.sendMessage(chatId, { text: "Hubo un problema al cargar la imagen del desafío. Por favor, intenta iniciar uno nuevo." });
            challengeHandler.endChallenge(chatId); // Finalizar el desafío si falla el envío
        }
    }
};

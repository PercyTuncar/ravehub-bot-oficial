const DjChallenge = require('../../models/DjChallenge');
const challengeHandler = require('../../handlers/challengeHandler');

module.exports = {
    name: 'silueta',
    description: 'Adivina el DJ a partir de su silueta.',
    category: 'games',
    cooldown: 60,
    async execute(message, args, client) { // Pasamos el cliente de baileys
        const chatId = message.key.remoteJid;

        if (challengeHandler.getChallenge(chatId)) {
            return client.sendMessage(chatId, { text: 'Ya hay un desafío en curso en este chat. ¡Intenta adivinar!' });
        }

        const djCount = await DjChallenge.countDocuments();
        if (djCount === 0) {
            return client.sendMessage(chatId, { text: 'No hay DJs en la base de datos. ¡Un admin necesita añadir algunos con `.add-dj`!' });
        }
        
        const rand = Math.floor(Math.random() * djCount);
        const dj = await DjChallenge.findOne().skip(rand);

        if (!dj) {
             return client.sendMessage(chatId, { text: 'No se pudo seleccionar un DJ al azar. Inténtalo de nuevo.' });
        }

        const challenge = challengeHandler.startChallenge(client, chatId, dj);
        if (!challenge) return;
        
        try {
            const caption = `🔥 *¡Nuevo Desafío de la Silueta!* 🔥\n\nAdivina el DJ y gana el gran premio. ¡Cualquier mensaje que no sea un comando contará como tu respuesta!\n\n🏆 *Premio Actual:* ${challenge.prize} monedas\n❌ *Penalización por Error:* 50 monedas\n\n¿Necesitas ayuda? Compra una pista con \`.pista\`.`;
            await client.sendMessage(chatId, { 
                image: { url: challenge.dj.silhouetteImageUrl },
                caption: caption 
            });
        } catch (error) {
            console.error("Error al obtener la imagen de la silueta:", error);
            await client.sendMessage(chatId, { text: "Hubo un problema al cargar la imagen del desafío. Por favor, intenta iniciar uno nuevo." });
            challengeHandler.endChallenge(chatId);
        }
    }
};

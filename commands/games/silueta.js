const DjChallenge = require('../../models/DjChallenge');
const challengeHandler = require('../../handlers/challengeHandler');
const { MessageMedia } = require('whatsapp-web.js');

module.exports = {
    name: 'silueta',
    description: 'Inicia un nuevo Desafío de la Silueta.',
    async execute(message, args) {
        const chatId = message.from;

        if (challengeHandler.getChallenge(chatId)) {
            return message.reply('Ya hay un desafío en curso en este chat. ¡Intenta adivinar!');
        }

        const djCount = await DjChallenge.countDocuments();
        if (djCount === 0) {
            return message.reply('No hay DJs en la base de datos. ¡Un admin necesita añadir algunos con `!add-dj`!');
        }
        
        const rand = Math.floor(Math.random() * djCount);
        const dj = await DjChallenge.findOne().skip(rand);

        if (!dj) {
             return message.reply('No se pudo seleccionar un DJ al azar. Inténtalo de nuevo.');
        }

        const challenge = challengeHandler.startChallenge(message.client, chatId, dj);
        if (!challenge) return;
        
        try {
            const media = await MessageMedia.fromUrl(challenge.dj.silhouetteImageUrl, { unsafeMime: true, referrer: 'https://www.google.com/' });
            const caption = `🔥 *¡Nuevo Desafío de la Silueta!* 🔥\n\nAdivina el DJ y gana el gran premio. ¡Cualquier mensaje que no sea un comando contará como tu respuesta!\n\n🏆 *Premio Actual:* ${challenge.prize} monedas\n❌ *Penalización por Error:* 50 monedas\n\n¿Necesitas ayuda? Compra una pista con \`!pista\`.`;
            message.client.sendMessage(chatId, media, { caption });
        } catch (error) {
            console.error("Error al obtener la imagen de la silueta:", error);
            message.reply("Hubo un problema al cargar la imagen del desafío. Por favor, intenta iniciar uno nuevo.");
            challengeHandler.endChallenge(chatId);
        }
    }
};

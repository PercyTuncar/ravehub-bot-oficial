const { MessageMedia } = require('whatsapp-web.js');
const { startGame, playDirectGame } = require('../../games/cartaMayor');
const { MIN_BET, MAX_BET } = require('../../games/cartaMayor/constants');
const User = require('../../models/User');

module.exports = {
    name: 'apostar',
    description: 'Apuesta en el juego de la carta mayor.',
    aliases: ['bet'],
    async execute(client, message, args) {
        const betAmount = parseInt(args[0], 10);
        const choice = args.length > 1 ? args[1].toLowerCase() : null;
        const senderId = message.author;

        if (isNaN(betAmount) || betAmount <= 0) {
            return client.sendMessage(message.from, 'Monto de apuesta inválido.');
        }

        if (betAmount < MIN_BET || betAmount > MAX_BET) {
            return client.sendMessage(message.from, `El monto de la apuesta debe estar entre ${MIN_BET} y ${MAX_BET} coins.`);
        }

        const user = await User.findById(senderId);
        if (!user || user.balance < betAmount) {
            return client.sendMessage(message.from, 'No tienes suficientes coins para esa apuesta.');
        }

        let gameResult;
        if (choice && (choice === 'yo' || choice === 'bot')) {
            gameResult = await playDirectGame(message, args);
        } else {
            gameResult = await startGame(client, message, args);
        }

        if (gameResult && gameResult.caption) {
            const image = await MessageMedia.fromUrl(gameResult.imageUrl);
            await client.sendMessage(message.from, image, { caption: gameResult.caption, mentions: gameResult.mentions });
        }
    },
};

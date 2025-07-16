const fs = require('fs');
const path = require('path');
const challengeHandler = require('./challengeHandler');
const User = require('../models/User');
const { MessageMedia } = require('whatsapp-web.js');

module.exports = (client, message) => {
    const chatId = message.from;
    const userId = message.author || message.from;
    const body = message.body;
    const prefix = '!'; // Asegúrate que este sea tu prefijo

    // --- LÓGICA DEL DESAFÍO DE LA SILUETA ---
    const activeChallenge = challengeHandler.getChallenge(chatId);

    if (activeChallenge && !body.startsWith(prefix)) {
        if (activeChallenge.incorrectGuesses.has(userId)) {
            return; 
        }

        const userAnswer = body.trim().toLowerCase();
        const correctAnswers = [activeChallenge.dj.name.toLowerCase(), ...activeChallenge.dj.aliases];

        if (correctAnswers.includes(userAnswer)) {
            User.findOneAndUpdate({ id: userId }, { $inc: { bank: activeChallenge.prize } }, { new: true, upsert: true })
                .then(async winner => {
                    const winnerName = message._data.notifyName || userId.split('@')[0];

                    message.reply(`🎉 ¡Correcto, @${winnerName}! La respuesta era *${activeChallenge.dj.name}*.\n\nHas ganado *${activeChallenge.prize} monedas* en tu banco.`);
                    
                    try {
                        const media = await MessageMedia.fromUrl(activeChallenge.dj.revealedImageUrl, { unsafeMime: true, referrer: 'https://www.google.com/' });
                        await client.sendMessage(chatId, media);
                    } catch (error) {
                        console.error("Error al enviar la imagen revelada:", error);
                    }

                    challengeHandler.endChallenge(chatId);

                }).catch(err => console.error(err));

        } else {
            User.findOneAndUpdate({ id: userId }, { $inc: { bank: -50 } }, { new: true, upsert: true })
                .then(user => {
                    if (user) {
                         message.reply(`Respuesta incorrecta. Pierdes 50 monedas de tu banco.`);
                    }
                    activeChallenge.incorrectGuesses.add(userId);
                }).catch(err => console.error(err));
        }
        return;
    }
    // --- FIN LÓGICA DESAFÍO ---


    const commands = new Map();
    const commandPath = path.join(__dirname, '..', 'commands');
    const commandFolders = fs.readdirSync(commandPath).filter(folder => 
        fs.statSync(path.join(commandPath, folder)).isDirectory()
    );

    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(path.join(__dirname, '..', 'commands', folder)).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(`../commands/${folder}/${file}`);
            if (command.name) {
                commands.set(command.name, command);
            }
            if (command.aliases && Array.isArray(command.aliases)) {
                command.aliases.forEach(alias => {
                    commands.set(alias, command);
                });
            }
        }
    }

    return commands;
};

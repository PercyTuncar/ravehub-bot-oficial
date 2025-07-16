const fs = require('fs');
const path = require('path');
const challengeHandler = require('./challengeHandler');
const User = require('../models/User');

module.exports = async (client, message) => {
    // Lógica para obtener el cuerpo del mensaje y el ID del chat desde la estructura de Baileys
    const body = message.body;
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    const prefix = '!';

    // --- LÓGICA DEL DESAFÍO DE LA SILUETA ---
    const activeChallenge = challengeHandler.getChallenge(chatId);

    if (activeChallenge && body && !body.startsWith(prefix)) {
        if (activeChallenge.incorrectGuesses.has(userId)) {
            return; 
        }

        const userAnswer = body.trim().toLowerCase();
        const correctAnswers = [activeChallenge.dj.name.toLowerCase(), ...activeChallenge.dj.aliases];

        if (correctAnswers.includes(userAnswer)) {
            const winner = await User.findOneAndUpdate({ id: userId }, { $inc: { bank: activeChallenge.prize } }, { new: true, upsert: true });
            const winnerName = message.pushName || userId.split('@')[0];

            await client.sendMessage(chatId, { text: `🎉 ¡Correcto, @${winnerName}! La respuesta era *${activeChallenge.dj.name}*.\n\nHas ganado *${activeChallenge.prize} monedas* en tu banco.` });
            
            try {
                await client.sendMessage(chatId, { image: { url: activeChallenge.dj.revealedImageUrl } });
            } catch (error) {
                console.error("Error al enviar la imagen revelada:", error);
            }

            challengeHandler.endChallenge(chatId);

        } else {
            const user = await User.findOneAndUpdate({ id: userId }, { $inc: { bank: -50 } }, { new: true, upsert: true });
            if (user) {
                 await client.sendMessage(chatId, { text: `Respuesta incorrecta. Pierdes 50 monedas de tu banco.` });
            }
            activeChallenge.incorrectGuesses.add(userId);
        }
        return;
    }
    // --- FIN LÓGICA DESAFÍO ---

    if (!body || !body.startsWith(prefix)) return;

    const args = body.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);

    if (command) {
        try {
            // Pasamos el cliente de baileys a la ejecución del comando
            await command.execute(message, args, client);
        } catch (error) {
            console.error(error);
            await client.sendMessage(chatId, { text: 'Hubo un error al ejecutar ese comando.' });
        }
    }
};

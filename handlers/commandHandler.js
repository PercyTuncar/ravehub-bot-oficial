const fs = require('fs');
const path = require('path');
const challengeHandler = require('./challengeHandler');
const User = require('../models/User');
const { getPrefix } = require('../utils/groupUtils');

const commandMap = new Map();
const commandCooldowns = new Map();

function loadCommands(dir) {
    const commandFiles = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of commandFiles) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            loadCommands(fullPath);
        } else if (file.name.endsWith('.js')) {
            try {
                const command = require(fullPath);
                if (command.name && command.execute) {
                    commandMap.set(command.name, command);
                } 
            } catch (error) {
                console.error(`Error al cargar el comando ${fullPath}:`, error);
            }
        }
    }
}

loadCommands(path.join(__dirname, '../commands'));

const commandHandler = async (client, message) => {
    // Lógica para obtener el cuerpo del mensaje y el ID del chat desde la estructura de Baileys
    const body = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    const prefix = '.';

    // --- LÓGICA DEL DESAFÍO DE LA SILUETA ---
    // Si hay un desafío activo y el mensaje no es un comando, lo procesamos como una respuesta
    if (challengeHandler.isChallengeActive(chatId) && body && !body.startsWith(prefix)) {
        challengeHandler.handleAnswer({ body, key: message.key }, client);
        return; // Detenemos la ejecución para no procesarlo como un comando normal
    }
    // --- FIN LÓGICA DESAFÍO ---

    if (!body || !body.startsWith(prefix)) return;

    const args = body.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = commandMap.get(commandName);

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

module.exports = commandHandler;
module.exports.commandMap = commandMap;

const fs = require('fs');
const path = require('path');
const challengeHandler = require('./challengeHandler');
const User = require('../models/User');
// Corregir la importación de getGroupSettings
const { getGroupSettings } = require('../utils/groupUtils');

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
    const body = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    // Asegurarse de que el mensaje y el remitente existan
    if (!body || !userId) {
        return;
    }

    // Obtener el prefijo usando getGroupSettings
    const groupSettings = await getGroupSettings(chatId);
    const prefix = groupSettings ? groupSettings.prefix : '.'; // Usar '.' como prefijo por defecto

    // --- LÓGICA DEL DESAFÍO ---
    if (challengeHandler.isChallengeActive(chatId) && !body.startsWith(prefix)) {
        // Pasamos el objeto de mensaje completo para tener más contexto si es necesario
        challengeHandler.handleAnswer({
            body: body,
            key: message.key,
            // Añadimos más detalles del mensaje por si se necesitan en el futuro
            participant: userId, 
            pushName: message.pushName || ''
        }, client);
        return; // Detener la ejecución para no procesar como un comando
    }
    // --- FIN LÓGICA DESAFÍO ---

    if (!body.startsWith(prefix)) return;

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

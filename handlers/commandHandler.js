const fs = require('fs');
const path = require('path');
const challengeHandler = require('./challengeHandler');
const User = require('../models/User');

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
                // Forzar la re-lectura del archivo eliminando la caché de require
                delete require.cache[require.resolve(fullPath)];
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
    
    // Volver a un prefijo fijo y constante
    const prefix = '.'; 

    console.log(`[DEBUG] Mensaje recibido en: ${chatId} | De: ${userId} | Contenido: "${body}" | Prefijo: "${prefix}"`);

    // Asegurarse de que el mensaje y el remitente existan
    if (!body || !userId) {
        console.log('[DEBUG] Mensaje ignorado: sin cuerpo o sin ID de usuario.');
        return;
    }

    // --- LÓGICA DEL DESAFÍO ---
    if (challengeHandler.isChallengeActive(chatId)) {
        console.log(`[DEBUG] Hay un desafío activo en ${chatId}.`);
        if (!body.startsWith(prefix)) {
            console.log('[DEBUG] El mensaje no es un comando, procesando como respuesta al desafío.');
            challengeHandler.handleAnswer({
                body: body,
                key: message.key,
                participant: userId, 
                pushName: message.pushName || ''
            }, client);
            return;
        } else {
            console.log('[DEBUG] El mensaje es un comando, se procesará normalmente.');
        }
    }
    // --- FIN LÓGICA DESAFÍO ---

    if (!body.startsWith(prefix)) {
        console.log(`[DEBUG] Mensaje ignorado: no comienza con el prefijo "${prefix}".`);
        return;
    }

    const args = body.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = commandMap.get(commandName);
    console.log(`[DEBUG] Comando intentado: "${commandName}" | Argumentos: ${args}`);

    if (command) {
        try {
            console.log(`[DEBUG] Ejecutando comando: "${commandName}"`);
            // Pasamos el cliente de baileys a la ejecución del comando
            await command.execute(message, args, client);
        } catch (error) {
            console.error(error);
            await client.sendMessage(chatId, { text: 'Hubo un error al ejecutar ese comando.' });
        }
    } else {
        console.log(`[DEBUG] Comando no encontrado: "${commandName}"`);
    }
};

module.exports = commandHandler;
module.exports.commandMap = commandMap;

const fs = require('fs').promises;
const path = require('path');
const challengeHandler = require('./challengeHandler');
const User = require('../models/User');

const commandMap = new Map();
const commandCooldowns = new Map();

async function loadCommands(dir) {
    const commandFiles = await fs.readdir(dir);
    for (const file of commandFiles) {
        const fullPath = path.join(dir, file);
        const stat = await fs.lstat(fullPath);
        if (stat.isDirectory()) {
            await loadCommands(fullPath);
        } else if (file.endsWith('.js')) {
            try {
                delete require.cache[require.resolve(fullPath)];
                const command = require(fullPath);
                if (command.name && command.execute) {
                    commandMap.set(command.name, command);
                    if (command.aliases && Array.isArray(command.aliases)) {
                        command.aliases.forEach(alias => {
                            commandMap.set(alias, command);
                        });
                    }
                }
            } catch (error) {
                console.error(`Error al cargar el comando ${fullPath}:`, error);
            }
        }
    }
}

// Ya no se cargan los comandos automáticamente al importar el módulo.
// const commandsLoaded = loadCommands(path.join(__dirname, '../commands'));

const initialize = async () => {
    await loadCommands(path.join(__dirname, '../commands'));
    console.log('[INFO] Todos los comandos han sido cargados exitosamente.');
};

const commandHandler = async (client, message) => {
    // La llamada a 'await commandsLoaded' ya no es necesaria aquí.

    const body = message.conversation || message.message?.conversation || message.message?.extendedTextMessage?.text || '';
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

    if (!command) {
        console.log(`[DEBUG] Comando no encontrado: "${commandName}"`);
        return; // Salir si el comando no existe
    }

    try {
        console.log(`[DEBUG] Ejecutando comando: "${command.name}" para el usuario ${userId}`);
        await command.execute(message, args, client);
        console.log(`[DEBUG] Comando "${command.name}" ejecutado exitosamente.`);
    } catch (error) {
        console.error(`[ERROR] Ocurrió un error al ejecutar el comando "${command.name}":`, error);
        try {
            await client.sendMessage(chatId, { text: '🤖 ¡Ups! Hubo un error al intentar ejecutar ese comando. Por favor, intenta de nuevo.' });
        } catch (sendError) {
            console.error(`[ERROR] No se pudo enviar el mensaje de error al chat ${chatId}:`, sendError);
        }
    } finally {
        console.log(`[DEBUG] Finalizó el procesamiento del comando "${commandName}" para el usuario ${userId}.`);
    }
};

module.exports = {
    commandHandler,
    initialize,
    commandMap
};

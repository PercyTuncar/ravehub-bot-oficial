const { default: makeWASocket, DisconnectReason, Browsers, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const logger = require('./config/logger'); // Usar el logger centralizado
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/database');
const { handleMessage, handleWelcomeMessage } = require('./handlers/eventHandler');
const loadCommands = require('./handlers/commandHandler');
const { setSocket } = require('./bot');
const { startChecking } = require('./handlers/statusHandler');
const { addMessageToQueue } = require('./utils/messageQueue');
require('dotenv').config();

let sock;
let firstConnection = true;

// Cargar todos los comandos y sus alias 
const commands = loadCommands();

async function connectToWhatsApp() {
    // Usar el gestor de autenticación oficial de Baileys
    const { state, saveCreds } = await useMultiFileAuthState('sessions');

    sock = makeWASocket({
        auth: state,
        logger: logger.child({ level: 'warn' }), // Nivel 'warn' para Baileys para reducir el ruido
        browser: Browsers.macOS('Desktop'),
        printQRInTerminal: false, // El QR se maneja manualmente.
    });

    setSocket(sock);

    // Guardar credenciales cuando se actualicen.
    sock.ev.on('creds.update', saveCreds);

    // Desacoplar el procesamiento de mensajes para no bloquear el event loop
    sock.ev.on('messages.upsert', (msg) => {
        if (msg.messages && msg.messages.length > 0) {
            const message = msg.messages[0];
            // Asegurarse de que el mensaje tiene contenido antes de procesarlo
            if (message.message) {
                setImmediate(() => {
                    handleMessage(message, commands).catch(err => logger.error(err, 'Error al manejar el mensaje'));
                });
            }
        }
    });

    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        if (action === 'add') {
            try {
                const groupMetadata = await sock.groupMetadata(id);
                const newParticipantId = participants[0];
                await handleWelcomeMessage(sock, groupMetadata, newParticipantId);
            } catch (error) {
                logger.error(error, 'Error en el evento group-participants.update');
            }
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            logger.info('Nuevo QR Code generado. Por favor, escanéelo.');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const reason = (lastDisconnect.error instanceof Boom)?.output?.statusCode;
            const shouldReconnect = reason !== DisconnectReason.loggedOut && reason !== DisconnectReason.connectionReplaced;

            logger.info(`Conexión cerrada. Razón: ${reason}, reconectando: ${shouldReconnect}`);

            if (reason === DisconnectReason.badSession || reason === DisconnectReason.loggedOut) {
                const message = reason === DisconnectReason.badSession 
                    ? 'Sesión corrupta. Limpiando y reconectando...' 
                    : 'Dispositivo desvinculado. Limpiando y reiniciando.';
                logger.warn(message);
                
                const sessionsDir = path.join(__dirname, 'sessions');
                if (fs.existsSync(sessionsDir)) {
                    fs.rmSync(sessionsDir, { recursive: true, force: true });
                }
                // Retrasar antes de reiniciar para evitar bucles rápidos
                setTimeout(connectToWhatsApp, 5000);
            } else if (shouldReconnect) {
                // Añadir un retardo antes de intentar reconectar
                setTimeout(connectToWhatsApp, 5000); // Espera 5 segundos
            } else {
                logger.info('No se requiere reconexión automática.');
            }
        } else if (connection === 'open') {
            logger.info('Conexión abierta y establecida.');
            startChecking(sock); // Iniciar el chequeo de estado del jugador
            if (firstConnection) {
                let menu = `╭───≽ *BOT CONECTADO* ≼───╮
│
`;
                const categories = {};

                commands.forEach(command => {
                    if (!categories[command.category]) {
                        categories[command.category] = [];
                    }
                    categories[command.category].push(command.name);
                });

                for (const category in categories) {
                    menu += `│ ╟──≽ *${category.toUpperCase()}* ≼───╮\n`;
                    categories[category].forEach(commandName => {
                        menu += `│ ╰» .${commandName}\n`;
                    });
                }
                menu += `│
╰──────────≽`;

                try {
                    if (process.env.OWNER_NUMBER) {
                        addMessageToQueue(sock, `${process.env.OWNER_NUMBER}@s.whatsapp.net`, { text: menu });
                    } else {
                        logger.warn('OWNER_NUMBER no está definido en el archivo .env, no se enviará el mensaje de inicio.');
                    }
                } catch (error) {
                    logger.error(error, 'Error al enviar el mensaje de inicio');
                }
                
                firstConnection = false;
            }
        }
    });

    // La siguiente línea ya no es necesaria porque el evento 'messages.upsert' se maneja arriba.
    // eventHandler(); 
}

connectDB();
connectToWhatsApp();

process.on('uncaughtException', (err) => {
    logger.fatal(err, 'Uncaught Exception');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.fatal({ promise, reason }, 'Unhandled Rejection');
    process.exit(1);
});


// Haré una prueba de github para asegurarme que todo funciona correctamente
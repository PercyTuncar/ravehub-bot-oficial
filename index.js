const { default: makeWASocket, DisconnectReason, Browsers, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const logger = require('./config/logger'); // Usar el logger centralizado
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/database');
const { commandHandler, initialize: initializeCommands, commandMap } = require('./handlers/commandHandler'); // Importar el command handler
const { handleWelcomeMessage } = require('./handlers/eventHandler');
const bot = require('./bot');
const { startChecking } = require('./handlers/statusHandler');
const { addMessageToQueue } = require('./utils/messageQueue');
require('dotenv').config();

// Limpiar la sesión si se pasa el argumento --clear-session
if (process.argv.includes('--clear-session')) {
    const sessionsDir = path.join(__dirname, 'sessions');
    if (fs.existsSync(sessionsDir)) {
        logger.info('Limpiando la sesión por argumento --clear-session.');
        fs.rmSync(sessionsDir, { recursive: true, force: true });
    }
}

let sock;
let firstConnection = true;
let reconnectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 5000; // 5 segundos

async function connectToWhatsApp() {
    // Usar el gestor de autenticación oficial de Baileys
    const { state, saveCreds } = await useMultiFileAuthState('sessions');

    sock = makeWASocket({
        auth: state,
        logger: logger.child({ level: 'silent' }),
        browser: Browsers.windows('Desktop'),
        printQRInTerminal: false,

        // --- OPTIMIZACIONES CRÍTICAS PARA IGNORAR MENSAJES ANTIGUOS ---
        // 1. No sincronizar el historial completo. Reduce drásticamente la carga inicial.
        syncFullHistory: false,

        // 2. Ignorar mensajes antiguos. Si el bot estuvo offline, no intentará procesar lo que perdió.
        //    Esto es ESENCIAL para evitar que el bot procese comandos o eventos pasados.
        getMessage: async (key) => undefined,
    });

    bot.setSocket(sock);

    // Guardar credenciales cuando se actualicen.
    sock.ev.on('creds.update', saveCreds);

    // Manejar los mensajes de forma asíncrona y secuencial para evitar bloqueos.
    sock.ev.on('messages.upsert', (m) => {
        const message = m.messages[0];

        // Loggear el objeto completo del mensaje para depuración
        logger.info({ message: JSON.parse(JSON.stringify(message)) }, 'Mensaje recibido');
        
        // Ignorar mensajes sin contenido o de uno mismo.
        if (message && message.message && !message.key.fromMe) {
            (async () => {
                try {
                    await commandHandler(sock, message);
                } catch (err) {
                    logger.error(err, 'Error crítico no capturado al manejar el mensaje en index.js');
                }
            })();
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

            logger.info(`Conexión cerrada. Razón: ${reason || 'Desconocida'}, reconectando: ${shouldReconnect}`);

            if (reason === DisconnectReason.loggedOut) {
                logger.error('Dispositivo desvinculado. No se puede reconectar. Limpiando sesión y terminando.');
                const sessionsDir = path.join(__dirname, 'sessions');
                if (fs.existsSync(sessionsDir)) {
                    fs.rmSync(sessionsDir, { recursive: true, force: true });
                }
                process.exit(1); // Salir del proceso
            }

            if (shouldReconnect) {
                reconnectionAttempts++;
                if (reconnectionAttempts > MAX_RECONNECT_ATTEMPTS) {
                    logger.fatal(`Se superó el número máximo de reintentos (${MAX_RECONNECT_ATTEMPTS}). El bot se detendrá.`);
                    process.exit(1);
                }

                const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectionAttempts - 1);
                logger.info(`Intento de reconexión ${reconnectionAttempts}/${MAX_RECONNECT_ATTEMPTS}. Esperando ${delay / 1000} segundos...`);
                
                setTimeout(connectToWhatsApp, delay);
            } else {
                logger.info('No se requiere reconexión automática.');
            }
        } else if (connection === 'open') {
            logger.info('Conexión abierta y establecida.');
            reconnectionAttempts = 0; // Reiniciar el contador de reintentos al conectar exitosamente
          //  startChecking(sock); // Iniciar el chequeo de estado del jugador
            if (firstConnection) {
                let menu = `╭───≽ *BOT CONECTADO* ≼───╮
│
`;
                const categories = {};

                commandMap.forEach(command => {
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

async function startBot() {
    await connectDB();
    await initializeCommands();
    connectToWhatsApp();
}

startBot();

process.on('uncaughtException', (err) => {
    logger.fatal(err, 'Uncaught Exception');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.fatal({ promise, reason }, 'Unhandled Rejection');
    process.exit(1);
});

// Graceful Shutdown
const cleanup = async () => {
    logger.info('Iniciando cierre seguro del bot...');
    await bot.disconnect();
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
// Haré una prueba de github para asegurarme que todo funciona correctamente
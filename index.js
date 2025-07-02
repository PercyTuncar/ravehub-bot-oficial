const { default: makeWASocket, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const makeFileAuthStore = require('./utils/bufferedAuthStore'); // Renombrado para claridad
const connectDB = require('./config/database');
const eventHandler = require('./handlers/eventHandler');
const loadCommands = require('./handlers/commandHandler');
const { setSocket } = require('./bot');
require('dotenv').config();

let sock;
let firstConnection = true;

// Cargar todos los comandos y sus alias 
const commands = loadCommands();

// La ruta al directorio de sesiones, resuelta de forma absoluta.
const sessionsDir = path.join(__dirname, 'sessions');
const credsFile = path.join(sessionsDir, 'creds.json');

// Asegurarse de que el directorio de sesiones exista síncronamente al inicio.
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}

async function connectToWhatsApp() {
    // El store ahora se inicializa con la ruta completa al archivo y debe ser esperado.
    const authStore = await makeFileAuthStore(credsFile).init();

    sock = makeWASocket({
        auth: authStore.state,
        logger: pino({ level: 'warn' }),
        browser: Browsers.macOS('Desktop'),
        printQRInTerminal: false, // El QR se maneja manualmente.
    });

    setSocket(sock);

    // Guardar credenciales cuando se actualicen.
    sock.ev.on('creds.update', authStore.saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('Nuevo QR Code generado. Por favor, escanéelo.');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const reason = (lastDisconnect.error instanceof Boom)?.output?.statusCode;
            let shouldReconnect = reason !== DisconnectReason.loggedOut && reason !== DisconnectReason.connectionReplaced;

            if (reason === DisconnectReason.badSession || reason === DisconnectReason.timedOut || reason === DisconnectReason.restartRequired) {
                console.error(`Sesión inválida o error crítico (${DisconnectReason[reason]}). Limpiando credenciales y reconectando...`);
                await authStore.clearCreds();
                shouldReconnect = true;
            } else if (reason === DisconnectReason.loggedOut) {
                console.log('Dispositivo desvinculado. Limpiando credenciales. Escanee el nuevo QR para continuar.');
                await authStore.clearCreds();
                shouldReconnect = false; // No reconectar, esperar a que se escanee el QR.
            }

            if (shouldReconnect) {
                console.log(`Conexión perdida. Razón: ${DisconnectReason[reason] || reason}. Reconectando...`);
                connectToWhatsApp();
            } else {
                console.log(`Conexión cerrada. Razón: ${DisconnectReason[reason] || reason}. No se reconectará automáticamente.`);
                // El proceso podría terminar aquí o esperar a que el usuario reinicie manualmente.
            }
        } else if (connection === 'open') {
            console.log('Conexión abierta y establecida.');
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
                        await sock.sendMessage(`${process.env.OWNER_NUMBER}@s.whatsapp.net`, { text: menu });
                    } else {
                        console.warn('OWNER_NUMBER no está definido en el archivo .env, no se enviará el mensaje de inicio.');
                    }
                } catch (error) {
                    console.error('Error al enviar el mensaje de inicio:', error);
                }
                
                firstConnection = false;
            }
        }
    });

    eventHandler();
}

connectDB();
connectToWhatsApp();

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});


// Haré una prueba de github para asegurarme que todo funciona correctamente
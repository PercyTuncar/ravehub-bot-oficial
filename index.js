const { default: makeWASocket, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const makeBufferedAuthStore = require('./utils/bufferedAuthStore');
const connectDB = require('./config/database');
const eventHandler = require('./handlers/eventHandler');
const loadCommands = require('./handlers/commandHandler');
const { setSocket } = require('./bot');
require('dotenv').config();

let sock;
let firstConnection = true;

// Cargar todos los comandos y sus alias 
const commands = loadCommands();

// Asegurarse de que el directorio de sesiones exista antes de cualquier otra cosa.
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}

async function connectToWhatsApp() {
    // El store ahora solo necesita el nombre de la carpeta.
    const { state, saveCreds } = await makeBufferedAuthStore('sessions');

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'warn' }),
        // Emular un navegador para mejorar la estabilidad de la conexión.
        browser: Browsers.macOS('Desktop'),
        // No imprimir el QR en la terminal, se manejará en el evento 'connection.update'
        printQRInTerminal: false,
    });

    setSocket(sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const reason = (lastDisconnect.error instanceof Boom)?.output?.statusCode;

            // Lógica de reconexión mejorada
            let shouldReconnect = reason !== DisconnectReason.loggedOut && reason !== DisconnectReason.connectionReplaced;

            if (reason === DisconnectReason.badSession) {
                console.error('Sesión corrupta. Eliminando archivo de sesión y reconectando...');
                const credsFile = path.join(__dirname, 'sessions', 'creds.json');
                if (fs.existsSync(credsFile)) {
                    fs.unlinkSync(credsFile);
                }
                // Forzar la reconexión para generar una nueva sesión.
                shouldReconnect = true;
            } else if (reason === DisconnectReason.loggedOut) {
                console.log('Dispositivo desvinculado. No se reconectará automáticamente. Por favor, escanee el nuevo QR.');
                // Eliminar la sesión para forzar un nuevo QR en el próximo inicio.
                const credsFile = path.join(__dirname, 'sessions', 'creds.json');
                if (fs.existsSync(credsFile)) {
                    fs.unlinkSync(credsFile);
                }
            }

            if (shouldReconnect) {
                console.log('Conexión perdida. Razón:', DisconnectReason[reason] || reason, '. Intentando reconectar...');
                connectToWhatsApp();
            } else {
                console.log('Conexión cerrada. Razón:', DisconnectReason[reason] || reason, '. No se reconectará.');
            }

        } else if (connection === 'open') {
            console.log('Conexión abierta');
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
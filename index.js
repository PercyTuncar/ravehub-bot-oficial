const { default: makeWASocket, DisconnectReason, Browsers, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/database');
const eventHandler = require('./handlers/eventHandler');
const loadCommands = require('./handlers/commandHandler');
const { setSocket } = require('./bot');
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
        logger: pino({ level: 'error' }), // Cambiado a 'error' para reducir logs
        browser: Browsers.macOS('Desktop'),
        printQRInTerminal: false, // El QR se maneja manualmente.
    });

    setSocket(sock);

    // Guardar credenciales cuando se actualicen.
    sock.ev.on('creds.update', saveCreds);

    // Desacoplar el procesamiento de mensajes para no bloquear el event loop
    sock.ev.on('messages.upsert', (msg) => {
        setImmediate(() => {
            eventHandler(msg).catch(console.error);
        });
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('Nuevo QR Code generado. Por favor, escanéelo.');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const reason = (lastDisconnect.error instanceof Boom)?.output?.statusCode;
            
            // La lógica de reconexión ahora es más simple, ya que el store oficial es más robusto.
            if (reason === DisconnectReason.loggedOut) {
                console.log('Dispositivo desvinculado. Limpiando la carpeta de sesión y reiniciando.');
                // Eliminar la carpeta de sesión para forzar un inicio limpio
                const sessionsDir = path.join(__dirname, 'sessions');
                if (fs.existsSync(sessionsDir)) {
                    fs.rmSync(sessionsDir, { recursive: true, force: true });
                }
                connectToWhatsApp();
            } else if (reason !== DisconnectReason.connectionReplaced) {
                console.log(`Conexión perdida. Razón: ${DisconnectReason[reason] || reason}. Reconectando...`);
                connectToWhatsApp();
            } else {
                 console.log(`Conexión reemplazada. No se reconectará.`);
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

    // La siguiente línea ya no es necesaria porque el evento 'messages.upsert' se maneja arriba.
    // eventHandler(); 
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
const { default: makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const fs = require('fs');
const bufferedAuthStore = require('./utils/bufferedAuthStore');
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
    const { state, saveCreds } = await bufferedAuthStore('sessions');

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'warn' })
    });

    setSocket(sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect.error instanceof Boom)?.output?.statusCode;

            if (statusCode === DisconnectReason.loggedOut) {
                console.log('Credenciales inválidas. Eliminando sesión anterior y reiniciando...');
                if (fs.existsSync('./sessions')) {
                    fs.rmSync('./sessions', { recursive: true, force: true });
                }
                // Llama a la función principal para reiniciar el proceso de conexión desde cero
                connectToWhatsApp();
            } else {
                console.log('Conexión perdida. Intentando reconectar...');
                connectToWhatsApp();
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
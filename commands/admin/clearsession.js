const sock = require('../../bot').getSocket();
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'clearsession',
    description: 'Limpia la sesión del bot eliminando la carpeta de sesión.',
    aliases: ['nuevasesion', 'cleansession'],
    async execute(message, args, commands) {
        const sessionDir = path.join(__dirname, '..', '..', 'sessions');
        
        try {
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                await sock.sendMessage(message.key.remoteJid, { text: 'La carpeta de sesión ha sido eliminada. Por favor, reinicia el bot.' });
                console.log('La carpeta de sesión ha sido eliminada. Reinicia el bot para generar una nueva sesión.');
            } else {
                await sock.sendMessage(message.key.remoteJid, { text: 'La carpeta de sesión no existe.' });
            }
        } catch (error) {
            console.error('Error al limpiar la sesión:', error);
            await sock.sendMessage(message.key.remoteJid, { text: 'Ocurrió un error al limpiar la sesión.' });
        }
    },
};

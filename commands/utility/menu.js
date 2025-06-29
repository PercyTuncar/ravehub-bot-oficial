const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'menu',
    description: 'Muestra los comandos disponibles según tus permisos.',
    category: 'utility',
    aliases: ['help', 'commands'],
    usage: '.menu',
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        let isSenderAdmin = false;

        // 1. Verificar si el usuario es admin (solo si está en un grupo)
        if (chatId.endsWith('@g.us')) {
            try {
                const groupMetadata = await sock.groupMetadata(chatId);
                const sender = groupMetadata.participants.find(p => p.id === senderJid);
                if (sender && (sender.admin === 'admin' || sender.admin === 'superadmin')) {
                    isSenderAdmin = true;
                }
            } catch (error) {
                console.error('Error al obtener metadatos del grupo:', error);
                return sock.sendMessage(chatId, { text: '❌ No pude verificar tus permisos en este grupo.' });
            }
        }

        const commandPath = path.join(__dirname, '..');
        const commandFolders = fs.readdirSync(commandPath).filter(folder =>
            fs.statSync(path.join(commandPath, folder)).isDirectory()
        );

        // 2. Construir el menú dinámicamente
        let menuText = '🤖 *MENÚ DE RAVEHUB BOT* 🤖\n\n';
        menuText += 'Estos son los comandos que puedes usar:\n';

        const categoryEmojis = {
            admin: '👑',
            economy: '💰',
            utility: '🛠️',
            game: '🎮' // Añadido por si hay una categoría de juegos
        };

        for (const folder of commandFolders) {
            // Omitir la carpeta de admin si el usuario no es admin
            if (folder.toLowerCase() === 'admin' && !isSenderAdmin) {
                continue;
            }

            const commandFiles = fs.readdirSync(path.join(commandPath, folder)).filter(file => file.endsWith('.js'));
            if (commandFiles.length === 0) continue;

            const emoji = categoryEmojis[folder.toLowerCase()] || '🔹';
            menuText += `\n*${emoji} ${folder.charAt(0).toUpperCase() + folder.slice(1)}*\n`;

            for (const file of commandFiles) {
                try {
                    const command = require(`../${folder}/${file}`);
                    if (command.name && command.description) {
                        // Formato compacto: .comando: descripción
                        menuText += `  • \`.${command.name}\`: _${command.description}_\n`;
                    }
                } catch (e) {
                    console.error(`Error al cargar el comando ${file}:`, e);
                }
            }
        }

        menuText += `\n_Para más detalles sobre un comando específico, usa .help <comando>_`;

        await sock.sendMessage(chatId, { text: menuText.trim() });
    },
};

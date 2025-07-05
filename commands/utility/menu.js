const fs = require('fs');
const path = require('path');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'menu',
    description: 'Ver menú de comandos.',
    category: 'utility',
    aliases: ['help', 'commands'],
    usage: '.menu',
    async execute(message, args) {
        const sock = getSocket();
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
        } else {
            // Si es un chat privado, se considera admin para ver todos los comandos (excepto los de grupo)
            isSenderAdmin = true;
        }

        // 2. Cargar todos los comandos y agruparlos por categoría
        const commandsByCategory = {};
        const commandPath = path.join(__dirname, '..');
        const commandFolders = fs.readdirSync(commandPath).filter(folder =>
            fs.statSync(path.join(commandPath, folder)).isDirectory()
        );

        for (const folder of commandFolders) {
            const commandFiles = fs.readdirSync(path.join(commandPath, folder)).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                try {
                    const command = require(`../${folder}/${file}`);
                    if (command.name && command.description && command.category) {
                        const category = command.category.toLowerCase();
                        if (!commandsByCategory[category]) {
                            commandsByCategory[category] = [];
                        }
                        commandsByCategory[category].push(command);
                    }
                } catch (e) {
                    console.error(`Error al cargar el comando ${file}:`, e);
                }
            }
        }

        // 3. Construir el menú con el nuevo diseño
        const botName = "RaveHub";
        let menuText = `╭─── ⋅ ⋅ ── ── ⋅ ⋅ ───╮\n`;
        menuText += `│            *${botName}*           │\n`;
        menuText += `╰─── ⋅ ⋅ ── ── ⋅ ⋅ ───╯\n\n`;
        menuText += `¡Hola! 👋 Aquí tienes mis comandos:\n`;

        const categoryEmojis = {
            admin: '👑',
            economy: '💰',
            utility: '🛠️',
            game: '🎮',
            love: '💞'
        };

        const categoryOrder = ['game', 'economy', 'love', 'utility', 'admin'];

        for (const category of categoryOrder) {
            if (!commandsByCategory[category]) continue;

            // Omitir la categoría de admin si el usuario no es admin
            if (category === 'admin' && !isSenderAdmin) {
                continue;
            }

            const emoji = categoryEmojis[category] || '🔹';
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            menuText += `\n╭─「 *${emoji} ${categoryName}* 」\n`;

            const commandList = commandsByCategory[category];
            commandList.forEach(command => {
                // Añadimos la descripción del comando para más claridad
                menuText += `│ • \`.${command.name}\`: _${command.description}_\n`;
            });
            menuText += `╰───────────\n`;
        }

        menuText += `\n_Para ver cómo se usa un comando, escribe .help <comando>_`;

        await sock.sendMessage(chatId, { text: menuText.trim() });
    },
};

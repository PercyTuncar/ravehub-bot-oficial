const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'menu',
    description: 'Ver menú de comandos.',
    category: 'utility',
    aliases: ['help', 'commands'],
    usage: '.menu',
    async execute(message, args, client) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        let isSenderAdmin = false;

        // 1. Verificar si el usuario es admin (solo si está en un grupo)
        if (chatId.endsWith('@g.us')) {
            try {
                const groupMetadata = await client.groupMetadata(chatId);
                const sender = groupMetadata.participants.find(p => p.id === senderJid);
                if (sender && (sender.admin === 'admin' || sender.admin === 'superadmin')) {
                    isSenderAdmin = true;
                }
            } catch (error) {
                console.error('Error al obtener metadatos del grupo:', error);
                return client.sendMessage(chatId, { text: '❌ No pude verificar tus permisos en este grupo.' });
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
            if (category === 'game') {
                const gameCommands = [
                    { name: 'ruleta', description: 'Apuesta a un color y gana.' },
                    { name: 'slot', description: 'Juega a la máquina tragamonedas.' },
                    { name: 'pista', description: 'Adivina el DJ por una pista.' },
                    { name: 'silueta', description: 'Adivina el DJ por su silueta.' },
                    { name: 'cartamayor', description: 'Juega a la carta más alta.' }
                ];
                gameCommands.forEach(command => {
                    menuText += `│ • \`.${command.name}\`: _${command.description}_\n`;
                });

            } else {
                commandList.forEach(command => {
                    // Añadimos la descripción del comando para más claridad
                    menuText += `│ • \`.${command.name}\`: _${command.description}_\n`;
                });
            }
            menuText += `╰───────────\n`;
        }

        menuText += `\n_Para ver cómo se usa un comando, escribe .help <comando>_`;

        const menu = `
*Menú de Comandos de RaveHub*

*Admin*
- !kick <@usuario>
- !antilink <on/off>
- !welcome <on/off>
- !inactivos <días>
- !resetwarns <@usuario>
- !setcurrency <símbolo>

*Economía*
- !balance / !b
- !shop
- !buy <item>
- !deposit <cantidad> / !dep
- !retirar <cantidad>
- !ricos
- !give <@usuario> <cantidad>
- !transfer <@usuario> <cantidad>
- !transfer-bank <@usuario> <cantidad>
- !work
- !rob <@usuario>
- !prestamo
- !pagar
- !deuda
- !sbs
- !plinear
- !yapear <@usuario> <cantidad>

*Juegos*
- !slot
- !ruleta <color> <cantidad>
- !carta-mayor <cantidad>
- !silueta
- !pista

*Love*
- !propose <@usuario>
- !divorce
- !parejas
- !estado
- !compatibilidad <@usuario1> <@usuario2>
- !historial

*Roleplay*
- !iniciar
- !renacer
- !me
- !comer
- !beber
- !relajarse

*Utilidad*
- !estadisticas
- !trabajos
- !menu
`;

        await client.sendMessage(chatId, { text: menuText.trim() });
    },
};

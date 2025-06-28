module.exports = {
    name: 'menu',
    description: 'Muestra el menú de comandos o la información de un comando específico.',
    category: 'utility',
    aliases: ['help', 'commands'],
    execute(sock, message, args, commands) {
        const chatId = message.key.remoteJid;

        // Si se pide ayuda para un comando específico (.help comando)
        if (args.length > 0) {
            const commandName = args[0].toLowerCase();
            const command = commands.get(commandName) || commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            if (!command) {
                return sock.sendMessage(chatId, { text: `🤔 Uhm... no encontré el comando \\\`*.${commandName}*\\\`. ¿Seguro que lo escribiste bien?` });
            }

            let helpMessage = `*╭───≽ ℹ️ AYUDA: .${command.name.toUpperCase()} ≼───*\\n*│*\\n`;
            helpMessage += `*│* 📝 *Descripción:* ${command.description}\\n`;
            if (command.aliases && command.aliases.length > 0) {
                helpMessage += `*│* 🔄 *Alias:* ${command.aliases.map(a => `*.${a}*`).join(', ')}\n`;
            }
            if (command.usage) {
                helpMessage += `*│* 💡 *Ejemplo de uso:*\n`;
                helpMessage += `*│*   _${command.usage}_\n`;
            } else {
                helpMessage += `*│* 💡 *Ejemplo de uso:* .${command.name}\n`;
            }
            helpMessage += `*│*\n*╰─────────────────≽*`;

            return sock.sendMessage(chatId, { text: helpMessage });
        }

        // Si no se especifica comando, mostrar el menú completo
        const uniqueCommands = new Map();
        commands.forEach(command => {
            if (!uniqueCommands.has(command.name)) {
                uniqueCommands.set(command.name, command);
            }
        });

        const categories = {};
        uniqueCommands.forEach(command => {
            if (!categories[command.category]) {
                categories[command.category] = [];
            }
            categories[command.category].push(command);
        });

        let menu = `*╭───≽ 🤖 MENÚ DE COMANDOS ≼───*\n*│*\n`;

        for (const category in categories) {
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            let categoryIcon = "📁";
            if (category === "economy") categoryIcon = "💰";
            if (category === "admin") categoryIcon = "🛠️";
            if (category === "utility") categoryIcon = "⚙️";

            menu += `*│* ╭─≽ *${categoryIcon} ${categoryName}*\n`;
            categories[category].forEach((command) => {
                menu += `*│* │ • *.${command.name}*\n`;
            });
            menu += `*│* ╰─────────────────≽\n*│*\n`;
        }
        menu += `*╰─ Usa .help <comando> para más info ─*`;

        sock.sendMessage(message.key.remoteJid, { text: menu });
    },
};

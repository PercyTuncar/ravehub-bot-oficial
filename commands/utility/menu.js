module.exports = {
    name: 'menu',
    description: 'Muestra el menú de comandos disponibles.',
    category: 'utility',
    aliases: ['help', 'commands'],
    execute(sock, message, args, commands) {
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

        let menu = `*🤖 MENÚ DE COMANDOS DE RAVEHUB BOT 🤖*\n\n`;

        for (const category in categories) {
            menu += `*${category.toUpperCase()}*\n`;
            categories[category].forEach(command => {
                menu += `  • *.${command.name}*: ${command.description}\n`;
            });
            menu += `\n`;
        }
        menu += `_Para más información sobre un comando, usa .help <comando>_`;

        sock.sendMessage(message.key.remoteJid, { text: menu });
    }
};

module.exports = {
    name: 'menu',
    description: 'Muestra el menú de comandos.',
    category: 'utility',
    execute(sock, message, args, commands) {
        let menu = `╭───≽ *MENÚ DE COMANDOS* ≼───╮\n│\n`;
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
        menu += `│\n╰──────────≽`;

        sock.sendMessage(message.key.remoteJid, { text: menu });
    }
};
